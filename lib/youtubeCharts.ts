import { getTrendingInvidious, searchInvidious, type InvidiousVideo } from "@/lib/invidious";
import { isQuotaError, markQuotaBlocked, quotaBlocked } from "@/lib/ytQuota";
import { bumpRequest } from "@/lib/api-stats";
import { cached } from "@/lib/api-cache";

const KEY = process.env.YOUTUBE_API_KEY;

export type YoutubeChartItem = {
  youtubeId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  viewCount: number;
  publishedAt: string;
  duration: number;
};

export type YoutubeResult = {
  items: YoutubeChartItem[];
  error?: "quota_exceeded" | "unavailable";
};

const TRENDING_TTL = 24 * 60 * 60 * 1000;
const SEARCH_TTL = 12 * 60 * 60 * 1000;

function fromInvidious(item: InvidiousVideo): YoutubeChartItem {
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

function parseIsoDuration(value: string) {
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

// ===== YouTube Data API — только fallback =====

async function fetchDurationsApi(ids: string[]): Promise<Map<string, number>> {
  const durations = new Map<string, number>();
  if (!KEY || quotaBlocked() || !ids.length) return durations;
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "contentDetails");
  url.searchParams.set("id", ids.slice(0, 50).join(","));
  url.searchParams.set("key", KEY);
  try {
    bumpRequest("youtube");
    const response = await fetch(url, { cache: "no-store" });
    if (isQuotaError(response.status)) markQuotaBlocked();
    if (!response.ok) return durations;
    const data = (await response.json()) as { items?: Array<{ id: string; contentDetails?: { duration?: string } }> };
    for (const item of data.items ?? []) durations.set(item.id, parseIsoDuration(item.contentDetails?.duration ?? ""));
  } catch {
    // ignore
  }
  return durations;
}

async function mapApiItems(items: Array<Record<string, unknown>>): Promise<YoutubeChartItem[]> {
  const ids = items
    .map((item) => (item.id as { videoId?: string } | undefined)?.videoId ?? (typeof item.id === "string" ? item.id : undefined))
    .filter((id): id is string => Boolean(id));
  const durations = await fetchDurationsApi(ids);
  return items
    .map((item) => {
      const snippet = item.snippet as
        | { title?: string; channelTitle?: string; publishedAt?: string; thumbnails?: { medium?: { url?: string }; high?: { url?: string } } }
        | undefined;
      const stats = item.statistics as { viewCount?: string } | undefined;
      const youtubeId = (item.id as { videoId?: string } | undefined)?.videoId ?? (typeof item.id === "string" ? item.id : undefined);
      if (!youtubeId || !snippet?.title) return null;
      return {
        youtubeId,
        title: snippet.title,
        channelTitle: snippet.channelTitle ?? "",
        thumbnail: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`,
        viewCount: Number(stats?.viewCount ?? 0),
        publishedAt: snippet.publishedAt ?? "",
        duration: durations.get(youtubeId) ?? 0,
      };
    })
    .filter((item): item is YoutubeChartItem => item !== null);
}

async function trendingViaApi(regionCode: string, limit: number): Promise<YoutubeResult> {
  if (!KEY) return { items: [], error: "unavailable" };
  if (quotaBlocked()) return { items: [], error: "quota_exceeded" };
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set("chart", "mostPopular");
  url.searchParams.set("regionCode", regionCode);
  url.searchParams.set("maxResults", String(limit));
  url.searchParams.set("key", KEY);
  try {
    bumpRequest("youtube");
    const response = await fetch(url, { cache: "no-store" });
    if (isQuotaError(response.status)) {
      markQuotaBlocked();
      return { items: [], error: "quota_exceeded" };
    }
    if (!response.ok) return { items: [], error: "unavailable" };
    const data = (await response.json()) as { items?: Array<Record<string, unknown>> };
    return { items: await mapApiItems(data.items ?? []) };
  } catch {
    return { items: [], error: "unavailable" };
  }
}

async function searchViaApi(query: string, limit: number): Promise<YoutubeResult> {
  if (!KEY) return { items: [], error: "unavailable" };
  if (quotaBlocked()) return { items: [], error: "quota_exceeded" };
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("videoCategoryId", "10");
  url.searchParams.set("order", "viewCount");
  url.searchParams.set("maxResults", String(limit));
  url.searchParams.set("key", KEY);
  try {
    bumpRequest("youtube");
    const response = await fetch(url, { cache: "no-store" });
    if (isQuotaError(response.status)) {
      markQuotaBlocked();
      return { items: [], error: "quota_exceeded" };
    }
    if (!response.ok) return { items: [], error: "unavailable" };
    const data = (await response.json()) as { items?: Array<Record<string, unknown>> };
    return { items: await mapApiItems(data.items ?? []) };
  } catch {
    return { items: [], error: "unavailable" };
  }
}

// ===== Публичные функции: Invidious → YouTube API =====

export async function getTrendingVideos(regionCode: string, limit = 20): Promise<YoutubeResult> {
  return cached(`ycharts:trending:${regionCode}:${limit}`, TRENDING_TTL, "invidious", async () => {
    try {
      const items = await getTrendingInvidious(regionCode, limit);
      return { items: items.map(fromInvidious) };
    } catch {
      // все Invidious-инстансы упали → YouTube Data API
      return trendingViaApi(regionCode, limit);
    }
  });
}

export async function searchMusic(query: string, limit = 20): Promise<YoutubeResult> {
  return cached(`ycharts:search:${query}:${limit}`, SEARCH_TTL, "invidious", async () => {
    try {
      const items = await searchInvidious(query, limit);
      return { items: items.map(fromInvidious) };
    } catch {
      return searchViaApi(query, limit);
    }
  });
}
