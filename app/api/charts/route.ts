import { NextResponse } from "next/server";
import { catalog } from "@/lib/catalog";
import { getGlobalTop, getTopArtists, getTopTracks, lastfmConfigured, type LastfmArtist, type LastfmTrack } from "@/lib/lastfm";
import { fetchDurations, resolveYoutubeMeta, youtubeConfigured } from "@/lib/youtube-resolver";
import { getTrendingVideos } from "@/lib/youtubeCharts";
import type { RegionId, Track } from "@/types";

export const dynamic = "force-dynamic";

// Last.fm geo.* принимает полные английские названия стран;
// "Russia" не поддерживается — используется "Russian Federation".
const REGION_COUNTRIES: Record<string, string[]> = {
  russia: ["Russian Federation"],
  cis: ["Russian Federation", "Ukraine", "Belarus", "Kazakhstan"],
  europe: ["Germany", "France", "United Kingdom", "Poland", "Spain", "Italy"],
};

const YT_REGION: Record<string, string> = {
  russia: "RU",
  cis: "RU",
  europe: "DE",
  global: "US",
};

const REGION_ID: Record<string, RegionId> = {
  russia: "cis",
  cis: "cis",
  europe: "europe",
  global: "europe",
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

type ChartArtist = { name: string; playcount: number; cover: string; url: string };

type ChartsResponse = {
  tracks: Track[];
  artists: ChartArtist[];
  source: "lastfm" | "youtube";
  fallback?: boolean;
  error?: string;
};

const responseCache = new Map<string, { at: number; data: ChartsResponse }>();
const RESPONSE_TTL = 2 * 60 * 60 * 1000;

function toTrack(item: LastfmTrack, youtubeId: string | null, index: number, region: RegionId): Track {
  const [coverColor, coverAccent] = PALETTE[index % PALETTE.length];
  // Last.fm geo.* отдаёт пустые image — берём превью YouTube-видео как обложку
  const coverUrl = item.cover || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : undefined);
  return {
    id: youtubeId ? `yt_${youtubeId}` : `chart_${index}_${item.title}`,
    title: item.title,
    artist: item.artist,
    album: "Чарт",
    genre: "chart",
    region,
    duration: 0,
    coverColor,
    coverAccent,
    coverUrl,
    source: "youtube",
    youtubeId: youtubeId ?? undefined,
    playcount: item.playcount || undefined,
  };
}

async function lastfmCharts(region: string, type: string): Promise<ChartsResponse> {
  if (!lastfmConfigured()) throw new Error("LASTFM_API_KEY не задан");

  let rawTracks: LastfmTrack[] = [];
  let rawArtists: LastfmArtist[] = [];

  if (type === "artists") {
    if (region === "global") {
      const lists = await Promise.all(["Russian Federation", "Ukraine", "Germany", "France", "Poland"].map((c) => getTopArtists(c, 10).catch(() => [])));
      rawArtists = lists.flat().sort((a, b) => b.playcount - a.playcount).slice(0, 20);
    } else {
      const lists = await Promise.all(
        (REGION_COUNTRIES[region] ?? ["Russian Federation"]).map((country) => getTopArtists(country, 10).catch(() => []))
      );
      rawArtists = lists.flat().sort((a, b) => b.playcount - a.playcount).slice(0, 20);
    }
  } else {
    if (region === "global") {
      rawTracks = await getGlobalTop(20);
    } else {
      const lists = await Promise.all(
        (REGION_COUNTRIES[region] ?? ["Russian Federation"]).map((country) => getTopTracks(country, 20).catch(() => []))
      );
      const merged = new Map<string, LastfmTrack>();
      for (const list of lists) {
        for (const track of list) {
          const key = `${track.artist}::${track.title}`.toLowerCase();
          const prev = merged.get(key);
          if (!prev || track.playcount > prev.playcount) merged.set(key, track);
        }
      }
      rawTracks = [...merged.values()].sort((a, b) => b.playcount - a.playcount).slice(0, 20);
    }
  }

  const artists: ChartArtist[] = rawArtists.map((a) => ({ name: a.name, playcount: a.playcount, cover: a.cover, url: a.url }));

  // Резолвим YouTube ID только для треков (id + duration за один запрос)
  const resolved = await Promise.all(
    rawTracks.map(async (track, index) => {
      const meta = await resolveYoutubeMeta(track.title, track.artist).catch(() => ({ id: null, duration: 0 }));
      return { track, index, youtubeId: meta.id, duration: meta.duration };
    })
  );

  // Длительности догружаем только для треков, где их не дал поиск
  const missingDurations = resolved.filter((r) => r.youtubeId && !r.duration).map((r) => r.youtubeId as string);
  const fetched = missingDurations.length ? await fetchDurations(missingDurations) : new Map<string, number>();

  const regionId = REGION_ID[region] ?? "cis";
  const tracks: Track[] = resolved.map(({ track, index, youtubeId, duration }) => {
    const mapped = toTrack(track, youtubeId, index, regionId);
    mapped.duration = duration || (youtubeId ? fetched.get(youtubeId) ?? 0 : 0);
    return mapped;
  });

  return { tracks, artists, source: "lastfm" };
}

async function youtubeCharts(region: string, type: string): Promise<ChartsResponse> {
  const regionCode = YT_REGION[region] ?? "US";
  const { items, error } = await getTrendingVideos(regionCode, 20);
  if (error === "quota_exceeded") throw new Error("quota_exceeded");
  if (error) throw new Error("youtube unavailable");
  const tracks: Track[] = items.map((item, index) => ({
    id: `yt_${item.youtubeId}`,
    title: item.title,
    artist: item.channelTitle || "YouTube",
    album: "В тренде",
    genre: "chart",
    region: REGION_ID[region] ?? "europe",
    duration: item.duration,
    coverColor: PALETTE[index % PALETTE.length][0],
    coverAccent: PALETTE[index % PALETTE.length][1],
    coverUrl: item.thumbnail,
    source: "youtube",
    youtubeId: item.youtubeId,
    viewCount: item.viewCount || undefined,
  }));
  return { tracks, artists: [], source: "youtube" };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region") || "russia";
  const type = searchParams.get("type") === "artists" ? "artists" : "tracks";
  const source = searchParams.get("source") === "youtube" ? "youtube" : "lastfm";
  const cacheKey = `${region}:${type}:${source}`;

  const hit = responseCache.get(cacheKey);
  if (hit && Date.now() - hit.at < RESPONSE_TTL) {
    console.log(`[API] GET /api/charts region=${region} type=${type} source=${source} — cache: HIT, source: ${hit.data.source}`);
    return NextResponse.json(hit.data, { headers: { "Cache-Control": "public, max-age=21600" } });
  }
  console.log(`[API] GET /api/charts region=${region} type=${type} source=${source} — cache: MISS`);

  const json = (data: ChartsResponse, status = 200) =>
    NextResponse.json(data, { status, headers: { "Cache-Control": "public, max-age=21600" } });

  try {
    // source=lastfm (по умолчанию): Last.fm безлимитный.
    // YouTube trending — только явный ?source=youtube или как fallback,
    // когда Last.fm недоступен.
    if (source === "youtube") {
      const data = await youtubeCharts(region, type);
      if (!data.tracks.length) throw new Error("youtube returned empty chart");
      responseCache.set(cacheKey, { at: Date.now(), data });
      return json(data);
    }
    try {
      const data = await lastfmCharts(region, type);
      if (!data.tracks.length && !data.artists.length) throw new Error("lastfm returned empty chart");
      console.log(`[API] GET /api/charts region=${region} — source: lastfm`);
      responseCache.set(cacheKey, { at: Date.now(), data });
      return json(data);
    } catch (lastfmError) {
      try {
        const data = await youtubeCharts(region, type);
        if (!data.tracks.length) throw new Error("youtube returned empty chart");
        data.source = "youtube";
        console.log(`[API] GET /api/charts region=${region} — source: youtube (lastfm fallback)`);
        responseCache.set(cacheKey, { at: Date.now(), data });
        return json(data);
      } catch {
        throw lastfmError;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "charts error";
    // fallback на демо-каталог
    const fallbackTracks = catalog.slice(0, 12).map((track) => ({ ...track }));
    return json(
      { tracks: fallbackTracks, artists: [], source, fallback: true, error: message } satisfies ChartsResponse,
      503
    );
  }
}
