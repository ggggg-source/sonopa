import { NextResponse } from "next/server";
import { catalog } from "@/lib/catalog";
import { getNewReleases, getPopularByGenre, getRecommendations } from "@/lib/recommendations";
import { fetchDurations } from "@/lib/youtube-resolver";
import type { RegionId, Track } from "@/types";

export const dynamic = "force-dynamic";

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

type RecItem = { youtubeId: string; title: string; channelTitle: string; thumbnail: string; publishedAt: string; duration: number };

async function toTracks(items: RecItem[], region: RegionId = "cis"): Promise<Track[]> {
  // Длительности запрашиваем только для треков, где поиск их не вернул
  const missingIds = items.filter((i) => !i.duration).map((i) => i.youtubeId);
  const durations = missingIds.length ? await fetchDurations(missingIds) : new Map<string, number>();
  return items.map((item, index) => ({
    id: `yt_${item.youtubeId}`,
    title: item.title,
    artist: item.channelTitle || "YouTube",
    album: "Рекомендации",
    genre: "rec",
    region,
    duration: item.duration || durations.get(item.youtubeId) || 0,
    coverColor: PALETTE[index % PALETTE.length][0],
    coverAccent: PALETTE[index % PALETTE.length][1],
    coverUrl: item.thumbnail,
    source: "youtube",
    youtubeId: item.youtubeId,
  }));
}

const GENRES = new Set(["pop", "rock", "hip hop", "electronic", "indie", "jazz", "russian rap", "european pop"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "new";
  const genre = searchParams.get("genre")?.trim() || "pop";
  console.log(`[API] GET /api/recommendations mode=${mode} genre=${genre} — source: invidious/piped (cache см. [Cache])`);

  try {
    if (mode === "genre") {
      const safeGenre = GENRES.has(genre) ? genre : "pop";
      const items = await getPopularByGenre(safeGenre, 20);
      return NextResponse.json({ tracks: await toTracks(items), mode });
    }
    const items = await getNewReleases(20);
    return NextResponse.json({ tracks: await toTracks(items), mode: "new" });
  } catch (error) {
    // fallback на демо-каталог — UI не должен показывать красную ошибку
    return NextResponse.json(
      { tracks: catalog.slice(0, 12), mode, fallback: true, error: error instanceof Error ? error.message : "recommendations error" },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  console.log(`[API] POST /api/recommendations — source: invidious/piped (cache см. [Cache])`);
  try {
    const body = (await request.json()) as { seedIds?: string[] };
    const seedIds = Array.isArray(body.seedIds) ? body.seedIds.filter((id): id is string => typeof id === "string") : [];
    if (!seedIds.length) return NextResponse.json({ tracks: [], mode: "personal" });
    const items = await getRecommendations(seedIds, 20);
    return NextResponse.json({ tracks: await toTracks(items), mode: "personal" });
  } catch (error) {
    return NextResponse.json(
      { tracks: catalog.slice(0, 12), mode: "personal", fallback: true, error: error instanceof Error ? error.message : "recommendations error" },
      { status: 503 }
    );
  }
}
