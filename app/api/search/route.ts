import { NextResponse } from "next/server";
import { decodeHtml, parseIsoDuration } from "@/lib/format";
import { searchInvidious } from "@/lib/invidious";
import { bumpRequest } from "@/lib/api-stats";
import { cached } from "@/lib/api-cache";
import type { RegionId, Track } from "@/types";

type SearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    liveBroadcastContent?: string;
    thumbnails?: { medium?: { url?: string } };
  };
};

const PALETTE = [
  ["#ffffff", "#3a3a3a"],
  ["#d4d4d4", "#262626"],
  ["#a3a3a3", "#1c1c1c"],
  ["#f5f5f5", "#333333"],
  ["#e5e5e5", "#2e2e2e"],
  ["#b3b3b3", "#242424"],
  ["#cfcfcf", "#303030"],
  ["#9a9a9a", "#202020"],
];

function toTrack(partial: { youtubeId: string; title: string; artist: string; thumbnail?: string; duration: number }, index: number, region: RegionId): Track {
  const [coverColor, coverAccent] = PALETTE[index % PALETTE.length];
  return {
    id: `yt_${partial.youtubeId}`,
    title: partial.title,
    artist: partial.artist,
    album: "YouTube",
    genre: "youtube",
    region,
    duration: partial.duration,
    coverColor,
    coverAccent,
    coverUrl: partial.thumbnail,
    source: "youtube",
    youtubeId: partial.youtubeId,
  };
}

// YouTube Data API — fallback, если все Invidious-инстансы недоступны
async function searchViaApi(q: string, regionCode: string, region: RegionId): Promise<Track[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("videoCategoryId", "10");
  searchUrl.searchParams.set("videoEmbeddable", "true");
  searchUrl.searchParams.set("maxResults", "8");
  searchUrl.searchParams.set("q", q);
  searchUrl.searchParams.set("regionCode", regionCode);
  searchUrl.searchParams.set("relevanceLanguage", region === "europe" ? "en" : "ru");
  searchUrl.searchParams.set("key", key);

  bumpRequest("youtube");
  const searchRes = await fetch(searchUrl, { cache: "no-store" });
  if (!searchRes.ok) {
    const details = await searchRes.text();
    return [];
  }

  const searchJson = (await searchRes.json()) as { items?: SearchItem[] };
  const items = (searchJson.items ?? []).filter((item) => item.snippet?.liveBroadcastContent !== "live" && item.id?.videoId);
  const ids = items.map((item) => item.id?.videoId).filter((id): id is string => Boolean(id));
  const durations = new Map<string, number>();

  if (ids.length) {
    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videosUrl.searchParams.set("part", "contentDetails");
    videosUrl.searchParams.set("id", ids.join(","));
    videosUrl.searchParams.set("key", key);
    const videosRes = await fetch(videosUrl, { cache: "no-store" });
    if (videosRes.ok) {
      const videosJson = (await videosRes.json()) as { items?: { id: string; contentDetails?: { duration?: string } }[] };
      for (const item of videosJson.items ?? []) {
        durations.set(item.id, parseIsoDuration(item.contentDetails?.duration ?? ""));
      }
    }
  }

  return items
    .map((item, index) => {
      const youtubeId = item.id?.videoId;
      if (!youtubeId) return null;
      return toTrack(
        {
          youtubeId,
          title: decodeHtml(item.snippet?.title ?? "Без названия"),
          artist: decodeHtml(item.snippet?.channelTitle ?? "YouTube"),
          thumbnail: item.snippet?.thumbnails?.medium?.url,
          duration: durations.get(youtubeId) ?? 0,
        },
        index,
        region
      );
    })
    .filter((track): track is Track => track !== null);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const regionCode = (searchParams.get("regionCode") || "RU").slice(0, 2).toUpperCase();
  const region: RegionId = searchParams.get("region") === "europe" ? "europe" : "cis";

  console.log(`[API] GET /api/search q="${q}" region=${region} — source: invidious/piped (cache см. [Cache])`);
  if (!q) return NextResponse.json({ configured: true, tracks: [], source: "invidious" });

  try {
    const tracks = await cached(`search:${q}:${region}`, 60 * 60 * 1000, "invidious", async () => {
      try {
        const items = await searchInvidious(q, 12);
        return items.map((item, index) =>
          toTrack(
            {
              youtubeId: item.videoId,
              title: item.title,
              artist: item.author || "YouTube",
              thumbnail: item.thumbnail,
              duration: item.lengthSeconds,
            },
            index,
            region
          )
        );
      } catch {
        return searchViaApi(q, regionCode, region);
      }
    });

    return NextResponse.json({ configured: true, tracks, source: "invidious" }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (error) {
    return NextResponse.json({ configured: true, tracks: [], error: error instanceof Error ? error.message : "search error" }, { status: 503 });
  }
}
