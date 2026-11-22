import { getVideoDetailsInvidious, searchInvidious, type InvidiousVideo } from "@/lib/invidious";
import { cached } from "@/lib/api-cache";

export type RecItem = {
  youtubeId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  viewCount: number;
  publishedAt: string;
  duration: number;
};

const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 часов

export function recommendationsConfigured() {
  return true; // Invidious не требует ключа
}

function fromInvidious(item: InvidiousVideo): RecItem {
  return {
    youtubeId: item.videoId,
    title: item.title,
    channelTitle: item.author,
    thumbnail: item.thumbnail,
    viewCount: item.viewCount,
    publishedAt: item.published ? new Date(item.published * 1000).toISOString() : "",
    duration: item.lengthSeconds,
  };
}

async function searchCached(query: string, limit: number, extra = ""): Promise<RecItem[]> {
  return cached(`rec:search:${query}:${limit}:${extra}`, CACHE_TTL, "invidious", async () => {
    const items = await searchInvidious(query, limit);
    return items.map(fromInvidious);
  });
}

// Персональные рекомендации: по seed-видео берём канал и ищем его другие треки.
export async function getRecommendations(seedYoutubeIds: string[], limit = 20): Promise<RecItem[]> {
  const seeds = seedYoutubeIds.filter(Boolean).slice(0, 5);
  if (!seeds.length) return [];
  const seedSet = new Set(seeds);

  const infos = await Promise.all(
    seeds.map((seed) =>
      cached<{ item: InvidiousVideo | null }>(`rec:video:${seed}`, CACHE_TTL, "invidious", async () => ({
        item: await getVideoDetailsInvidious(seed).catch(() => null),
      })).then((r) => r.item)
    )
  );

  const lists = await Promise.all(
    infos.map((info, i) => {
      if (!info) return Promise.resolve([] as RecItem[]);
      const query = info.author || info.title;
      if (!query) return Promise.resolve([] as RecItem[]);
      return searchCached(query, 10, seeds[i]).catch(() => [] as RecItem[]);
    })
  );

  const seen = new Set<string>();
  const result: RecItem[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (seedSet.has(item.youtubeId) || seen.has(item.youtubeId)) continue;
      seen.add(item.youtubeId);
      result.push(item);
      if (result.length >= limit) return result;
    }
  }
  return result;
}

export async function getPopularByGenre(genre: string, limit = 20): Promise<RecItem[]> {
  return searchCached(`${genre} хиты 2026`, limit, "genre");
}

export async function getNewReleases(limit = 20): Promise<RecItem[]> {
  return searchCached("новинки музыки 2026", limit, "new");
}
