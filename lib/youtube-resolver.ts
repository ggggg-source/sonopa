import { searchInvidious } from "@/lib/invidious";
import { isQuotaError, markQuotaBlocked, quotaBlocked } from "@/lib/ytQuota";
import { bumpRequest } from "@/lib/api-stats";
import { cacheGet, cacheSet } from "@/lib/api-cache";

const KEY = process.env.YOUTUBE_API_KEY;
const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

// Кэш "{artist} - {title}" -> youtubeId | null на 48 часов.
const TTL = 48 * 60 * 60 * 1000;

export function youtubeConfigured() {
  return Boolean(KEY);
}

// Основной путь — Invidious (без лимитов). YouTube Data API — fallback,
// только если ВСЕ инстансы Invidious недоступны и квота не исчерпана.
async function resolveViaApi(title: string, artist: string): Promise<string | null> {
  if (!KEY || quotaBlocked()) return null;
  const query = `"${artist}" "${title}" official`;
  const url = new URL(SEARCH_URL);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("videoCategoryId", "10");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("q", query);
  url.searchParams.set("key", KEY);

  try {
    bumpRequest("youtube");
    const response = await fetch(url, { cache: "no-store" });
    if (isQuotaError(response.status)) {
      markQuotaBlocked();
      return null;
    }
    if (!response.ok) return null;
    const data = (await response.json()) as { items?: Array<{ id?: { videoId?: string } }> };
    return data.items?.[0]?.id?.videoId ?? null;
  } catch {
    return null;
  }
}

// Нормализация для сравнения названий
function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zа-яё0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const BAD_PATTERNS = /\b(loop|1\s*hour|full\s*album|album\s*complet|mix\b|megamix|playlist|1\s*hour\s*tiktok|sped\s*up|nightcore|8d\s*audio|bass\s*boosted|slowed|reverb)\b/i;
const COVER_PATTERNS = /\b(cover|acoustic|remix|live|concert|piano\s*version|instrumental)\b/i;
const GOOD_PATTERNS = /\b(official|vevo|topic|audio|lyrics?|visualizer|mv|music\s*video)\b/i;

// Выбирает лучший вариант из поисковой выдачи:
// штрафуем лупы/миксы/полные альбомы, бонус — official/topic и совпадение
// названия с артистом, длительность 2–7 минут.
function pickBestMatch(
  items: Array<{ videoId: string; title: string; author: string; lengthSeconds: number }>,
  title: string,
  artist: string
) {
  const wantTitle = norm(title);
  const wantArtist = norm(artist);
  const titleWords = wantTitle.split(" ").filter((w) => w.length > 2);

  let best: { item: (typeof items)[number]; score: number } | null = null;
  for (const item of items) {
    const t = norm(item.title);
    const a = norm(item.author);
    const dur = item.lengthSeconds;
    let score = 0;

    // длительность: песня обычно 2–7 минут
    if (dur >= 90 && dur <= 420) score += 4;
    else if (dur > 420 && dur <= 900) score += 1;
    else if (dur > 900 || (dur > 0 && dur < 60)) score -= 6;

    // совпадение названия и исполнителя
    if (wantTitle && t.includes(wantTitle)) score += 5;
    else score += titleWords.filter((w) => t.includes(w)).length;
    if (wantArtist && (t.includes(wantArtist) || a.includes(wantArtist))) score += 3;

    if (GOOD_PATTERNS.test(item.title)) score += 1;
    if (COVER_PATTERNS.test(item.title)) score -= 2;
    if (BAD_PATTERNS.test(item.title)) score -= 8;

    // YouTube Music "Artist - Topic" — автогенерация, почти всегда оригинал
    if (/ - topic$/i.test(item.author) || /vevo$/i.test(item.author)) score += 3;

    if (!best || score > best.score) best = { item, score };
  }
  return best?.item ?? null;
}

export async function resolveYoutubeMeta(title: string, artist: string): Promise<{ id: string | null; duration: number }> {
  const cacheKey = `resolve2:${artist} - ${title}`.toLowerCase();
  const hit = cacheGet<{ id: string | null; duration?: number }>(cacheKey);
  if (hit) return { id: hit.id, duration: hit.duration ?? 0 };

  // 1) Invidious/Innertube/Piped — безлимитно
  let id: string | null = null;
  let duration = 0;
  try {
    const items = await searchInvidious(`"${artist}" "${title}" official`, 8);
    const best = pickBestMatch(items, title, artist);
    id = best?.videoId ?? null;
    duration = best?.lengthSeconds ?? 0;
  } catch {
    id = null; // все фронтенды упали → пробуем Data API
  }

  // 2) YouTube Data API — только если фронтенды не дали результата и доступен
  if (!id) id = await resolveViaApi(title, artist);

  cacheSet(cacheKey, { id, duration }, TTL);
  return { id, duration };
}

export async function resolveYoutubeId(title: string, artist: string): Promise<string | null> {
  return (await resolveYoutubeMeta(title, artist)).id;
}

// Пакетное получение длительностей для youtubeId.
// Invidious video details отдаёт lengthSeconds — безлимитно.
// YouTube videos.list — только если Invidious недоступен и квота есть.
export async function fetchDurations(ids: string[]): Promise<Map<string, number>> {
  const durations = new Map<string, number>();
  const unique = [...new Set(ids)].slice(0, 50);
  if (!unique.length) return durations;

  // Сначала локальный кэш длительностей (24ч), без него — сеть
  const needFetch: string[] = [];
  for (const id of unique) {
    const cachedDur = cacheGet<number>(`dur:${id}`);
    if (cachedDur !== null && cachedDur !== undefined) durations.set(id, cachedDur);
    else needFetch.push(id);
  }
  if (!needFetch.length) return durations;

  const { getVideoDetailsInvidious } = await import("@/lib/invidious");
  // Параллельно батчами по 5 — player-endpoint YouTube не любит burst
  for (let i = 0; i < needFetch.length; i += 5) {
    const batch = needFetch.slice(i, i + 5);
    const results = await Promise.all(batch.map((id) => getVideoDetailsInvidious(id).catch(() => null)));
    results.forEach((item, index) => {
      const seconds = item?.lengthSeconds ?? 0;
      durations.set(batch[index], seconds);
      // 0 тоже кэшируем на час — не дёргаем мёртвые инстансы повторно
      cacheSet(`dur:${batch[index]}`, seconds, seconds ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000);
    });
  }

  const missing = unique.filter((id) => !durations.get(id));
  if (missing.length && KEY && !quotaBlocked()) {
    try {
      bumpRequest("youtube");
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "contentDetails");
      url.searchParams.set("id", missing.join(","));
      url.searchParams.set("key", KEY);
      const response = await fetch(url, { cache: "no-store" });
      if (isQuotaError(response.status)) markQuotaBlocked();
      if (response.ok) {
        const data = (await response.json()) as { items?: Array<{ id: string; contentDetails?: { duration?: string } }> };
        const { parseIsoDuration } = await import("@/lib/format");
        for (const item of data.items ?? []) durations.set(item.id, parseIsoDuration(item.contentDetails?.duration ?? ""));
      }
    } catch {
      // ignore
    }
  }
  return durations;
}
