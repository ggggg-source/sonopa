import { bumpRequest } from "@/lib/api-stats";
import { cacheGet, cacheSet } from "@/lib/api-cache";

// Публичные Invidious/Piped-инстансы — YouTube API без ключа и без квоты.
// Invidious часто закрыт антиботом, поэтому Piped идёт вторым слоем.
// YouTube Data API — только fallback, если упали ВСЕ фронтенды.
export const INVIDIOUS_INSTANCES = [
  "https://yewtu.be",
  "https://invidious.protokolla.fi",
  "https://invidious.nerdvpn.de",
  "https://invidious.f5.si",
  "https://iv.melmac.space",
  "https://invidious.jing.rocks",
];

const PIPED_INSTANCES = [
  "https://api.piped.private.coffee",
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.reallyaweso.me",
  "https://pipedapi.drgns.space",
];

const REQ_TIMEOUT = 12000;
const CACHE_TTL = 60 * 60 * 1000; // 1 час на списки

export type InvidiousVideo = {
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  viewCount: number;
  lengthSeconds: number;
  published?: number;
};

type RawItem = {
  type?: string;
  videoId?: string;
  title?: string;
  author?: string;
  authorId?: string;
  videoThumbnails?: Array<{ url?: string }>;
  viewCount?: number | string;
  lengthSeconds?: number | string;
  published?: number;
};

function normalize(item: RawItem): InvidiousVideo | null {
  if (!item.videoId || !item.title) return null;
  const thumbs = item.videoThumbnails ?? [];
  const best = thumbs[thumbs.length - 1]?.url ?? thumbs[0]?.url ?? `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`;
  return {
    videoId: item.videoId,
    title: item.title,
    author: item.author ?? item.authorId ?? "",
    thumbnail: best,
    viewCount: Number(item.viewCount ?? 0),
    lengthSeconds: Number(item.lengthSeconds ?? 0),
    published: item.published,
  };
}

// Гонка по всем инстансам: побеждает первый ответивший.
// Проигравшие запросы явно абортиМ — иначе их сокеты копятся
// и пул соединений undici исчерпывается (fetch failed на старых процессах).
async function raceInstances<T>(instances: string[], path: string, search: string): Promise<T> {
  const controllers = instances.map(() => new AbortController());
  const timer = setTimeout(() => controllers.forEach((c) => c.abort()), REQ_TIMEOUT);
  const attempts = instances.map(async (instance, i) => {
    const target = new URL(path + search, instance);
    const response = await fetch(target, { cache: "no-store", signal: controllers[i].signal });
    if (!response.ok) throw new Error(`${instance} → ${response.status}`);
    return (await response.json()) as T;
  });
  try {
    return await Promise.any(attempts);
  } finally {
    clearTimeout(timer);
    controllers.forEach((c) => c.abort());
  }
}

async function invFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(path, INVIDIOUS_INSTANCES[0]);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    return await raceInstances<T>(INVIDIOUS_INSTANCES, url.pathname, url.search);
  } catch {
    // быстрый повтор с бо́льшим таймаутом не нужен — просто пробросим ошибку
    throw new Error("all invidious instances failed");
  }
}

// ===== Piped API — второй слой безлимитных фронтендов =====

type PipedItem = {
  url?: string;
  title?: string;
  uploaderName?: string;
  thumbnail?: string;
  duration?: number;
  views?: number;
  uploadedDate?: string;
};

function pipedVideoId(item: PipedItem): string | null {
  const match = item.url?.match(/[?&]v=([\w-]{11})/) ?? item.url?.match(/\/watch\/([\w-]{11})/);
  return match?.[1] ?? null;
}

function normalizePiped(item: PipedItem): InvidiousVideo | null {
  const videoId = pipedVideoId(item);
  if (!videoId || !item.title) return null;
  return {
    videoId,
    title: item.title,
    author: item.uploaderName ?? "",
    thumbnail: item.thumbnail ?? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    viewCount: Number(item.views ?? 0),
    lengthSeconds: Number(item.duration ?? 0),
    published: item.uploadedDate ? Date.parse(item.uploadedDate) / 1000 : undefined,
  };
}

async function pipedFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(path, PIPED_INSTANCES[0]);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    return await raceInstances<T>(PIPED_INSTANCES, url.pathname, url.search);
  } catch (error) {
    const reasons = error instanceof AggregateError ? error.errors.map((e) => (e instanceof Error ? e.message : String(e))) : [String(error)];
    console.log("[invidious] piped all failed:", reasons.join(" | "));
    throw new Error("all piped instances failed");
  }
}

async function searchPiped(query: string, limit: number): Promise<InvidiousVideo[]> {
  const data = await pipedFetch<{ items?: PipedItem[] }>("/search", { q: query, filter: "videos" });
  return (data.items ?? [])
    .map(normalizePiped)
    .filter((item): item is InvidiousVideo => item !== null)
    .slice(0, limit);
}

async function trendingPiped(regionCode: string, limit: number): Promise<InvidiousVideo[]> {
  // Piped /trending возвращает либо массив, либо { items: [...] }
  const data = await pipedFetch<PipedItem[] | { items?: PipedItem[] }>("/trending", { region: regionCode });
  const list = Array.isArray(data) ? data : (data.items ?? []);
  return list
    .map(normalizePiped)
    .filter((item): item is InvidiousVideo => item !== null)
    .slice(0, limit);
}

async function videoDetailsPiped(videoId: string): Promise<InvidiousVideo | null> {
  const data = await pipedFetch<PipedItem & { videoId?: string }>(`/streams/${videoId}`);
  return normalizePiped({ ...data, url: `/watch?v=${videoId}` });
}

// ===== YouTube Innertube API — собственный API YouTube без ключа =====
// ANDROID-клиент не требует api_key и не расходует квоту Data API v3.
// Это самый надёжный источник: эндпоинты youtube.com сами по себе.

const INNERTUBE_BASE = "https://www.youtube.com/youtubei/v1";

function innertubeClient(gl = "US") {
  return { clientName: "ANDROID", clientVersion: "20.10.38", androidSdkVersion: 30, hl: "ru", gl };
}

async function innertube<T>(endpoint: string, body: Record<string, unknown>, gl = "US"): Promise<T> {
  bumpRequest("youtubei");
  const response = await fetch(`${INNERTUBE_BASE}/${endpoint}?prettyPrint=false`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context: { client: innertubeClient(gl) }, ...body }),
    cache: "no-store",
    signal: AbortSignal.timeout(REQ_TIMEOUT),
  });
  if (!response.ok) throw new Error(`innertube ${endpoint} → ${response.status}`);
  return (await response.json()) as T;
}

type YtRenderer = Record<string, unknown>;

// Рекурсивно собирает все videoRenderer'ы из ответа Innertube
// (структура deeply nested и различается между search/browse/player).
function collectVideoRenderers(node: unknown, out: YtRenderer[] = [], depth = 0): YtRenderer[] {
  if (depth > 40 || node === null || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const item of node) collectVideoRenderers(item, out, depth + 1);
    return out;
  }
  const obj = node as YtRenderer;
  // ANDROID-клиент отдаёт compactVideoRenderer, WEB — videoRenderer
  const renderer = (obj.videoRenderer ?? obj.compactVideoRenderer) as YtRenderer | undefined;
  if (renderer && typeof renderer === "object") out.push(renderer);
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") collectVideoRenderers(value, out, depth + 1);
  }
  return out;
}

function runsText(node: unknown): string {
  const runs = (node as { runs?: Array<{ text?: string }> } | undefined)?.runs;
  if (runs?.length) return runs.map((r) => r.text ?? "").join("");
  return (node as { simpleText?: string } | undefined)?.simpleText ?? "";
}

function parseYtLength(node: unknown): number {
  const text = runsText(node) || String((node as { accessibility?: { accessibilityData?: { label?: string } } })?.accessibility?.accessibilityData?.label ?? "");
  // форматы: "3:45", "1:02:03", или accessibility "3 minutes, 45 seconds"
  const hms = text.match(/(\d+):(\d{1,2})(?::(\d{1,2}))?/);
  if (hms) {
    const parts = hms[0].split(":").map(Number);
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }
  const mins = text.match(/(\d+)\s*min/i);
  const secs = text.match(/(\d+)\s*sec/i);
  return (mins ? Number(mins[1]) * 60 : 0) + (secs ? Number(secs[1]) : 0);
}

function normalizeYtRenderer(r: YtRenderer): InvidiousVideo | null {
  const videoId = typeof r.videoId === "string" ? r.videoId : null;
  const title = runsText(r.title).trim();
  if (!videoId || !title) return null;
  const thumbs = ((r.thumbnail as { thumbnails?: Array<{ url?: string }> })?.thumbnails ?? [])
    .map((t) => t.url)
    .filter((u): u is string => Boolean(u));
  const author = runsText(r.ownerText) || runsText(r.longBylineText) || runsText(r.shortBylineText);
  const publishedText = runsText(r.publishedTimeText);
  return {
    videoId,
    title,
    author,
    thumbnail: thumbs[thumbs.length - 1] ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    viewCount: 0,
    lengthSeconds: parseYtLength(r.lengthText),
    published: undefined,
  };
}

async function searchYoutubei(query: string, limit: number, gl = "US"): Promise<InvidiousVideo[]> {
  const data = await innertube<YtRenderer>("search", { query }, gl);
  return collectVideoRenderers(data)
    .map(normalizeYtRenderer)
    .filter((item): item is InvidiousVideo => item !== null)
    .slice(0, limit);
}

async function trendingYoutubei(regionCode: string, limit: number): Promise<InvidiousVideo[]> {
  const data = await innertube<YtRenderer>("browse", { browseId: "FEtrending" }, regionCode);
  return collectVideoRenderers(data)
    .map(normalizeYtRenderer)
    .filter((item): item is InvidiousVideo => item !== null)
    .slice(0, limit);
}

async function videoDetailsYoutubei(videoId: string): Promise<InvidiousVideo | null> {
  const data = await innertube<{ videoDetails?: { videoId?: string; title?: string; author?: string; lengthSeconds?: string; thumbnail?: { thumbnails?: Array<{ url?: string }> } } }>(
    "player",
    { videoId, contentCheckOk: true, racyCheckOk: true }
  );
  const d = data.videoDetails;
  if (!d?.videoId) return null;
  const thumbs = (d.thumbnail?.thumbnails ?? []).map((t) => t.url).filter((u): u is string => Boolean(u));
  return {
    videoId: d.videoId,
    title: d.title ?? "",
    author: d.author ?? "",
    thumbnail: thumbs[thumbs.length - 1] ?? `https://i.ytimg.com/vi/${d.videoId}/hqdefault.jpg`,
    viewCount: 0,
    lengthSeconds: Number(d.lengthSeconds ?? 0),
  };
}

export async function searchInvidious(query: string, limit = 20): Promise<InvidiousVideo[]> {
  const cacheKey = `inv:search:${query}:${limit}`;
  const hit = cacheGet<InvidiousVideo[]>(cacheKey);
  if (hit) return hit;

  bumpRequest("invidious");
  let items: InvidiousVideo[] = [];
  // 1) YouTube Innertube — собственный API YouTube, без ключа и квоты
  try {
    items = await searchYoutubei(query, limit);
  } catch (error) {
    console.log("[invidious] youtubei search failed:", error instanceof Error ? error.message : error);
    items = [];
  }
  // 2) Invidious-инстансы
  if (!items.length) {
    try {
      const data = await invFetch<RawItem[]>("/api/v1/search", { q: query, type: "video" });
      items = (Array.isArray(data) ? data : [])
        .filter((item) => item.type === "video" || item.videoId)
        .map(normalize)
        .filter((item): item is InvidiousVideo => item !== null)
        .slice(0, limit);
    } catch {
      // все Invidious-инстансы упали → пробуем Piped
      items = await searchPiped(query, limit);
    }
  }
  cacheSet(cacheKey, items, items.length ? CACHE_TTL : 5 * 60 * 1000);
  return items;
}

export async function getTrendingInvidious(regionCode = "US", limit = 20): Promise<InvidiousVideo[]> {
  const cacheKey = `inv:trending:${regionCode}:${limit}`;
  const hit = cacheGet<InvidiousVideo[]>(cacheKey);
  if (hit) return hit;

  bumpRequest("invidious");
  let items: InvidiousVideo[] = [];
  try {
    items = await trendingYoutubei(regionCode, limit);
  } catch {
    items = [];
  }
  if (!items.length) {
    try {
      const data = await invFetch<RawItem[]>("/api/v1/trending", { region: regionCode });
      items = (Array.isArray(data) ? data : [])
        .map(normalize)
        .filter((item): item is InvidiousVideo => item !== null)
        .slice(0, limit);
    } catch {
      items = await trendingPiped(regionCode, limit);
    }
  }
  cacheSet(cacheKey, items, items.length ? CACHE_TTL : 5 * 60 * 1000);
  return items;
}

export async function getVideoDetailsInvidious(videoId: string): Promise<InvidiousVideo | null> {
  const cacheKey = `inv:video:${videoId}`;
  const hit = cacheGet<InvidiousVideo | null>(cacheKey);
  if (hit !== undefined && hit !== null) return hit;

  bumpRequest("invidious");
  // 1) YouTube Innertube player — без ключа
  try {
    const item = await videoDetailsYoutubei(videoId);
    if (item) {
      cacheSet(cacheKey, item, CACHE_TTL);
      return item;
    }
  } catch {
    // fallthrough
  }
  // 2) Piped details — быстрый
  try {
    const item = await videoDetailsPiped(videoId);
    if (item) {
      cacheSet(cacheKey, item, CACHE_TTL);
      return item;
    }
  } catch {
    // fallthrough → Invidious
  }
  try {
    const data = await invFetch<RawItem>(`/api/v1/videos/${videoId}`);
    const item = normalize({ ...data, videoId: data.videoId ?? videoId });
    cacheSet(cacheKey, item, CACHE_TTL);
    return item;
  } catch {
    return null;
  }
}
