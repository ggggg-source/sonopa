import { bumpRequest } from "@/lib/api-stats";

const API = "http://ws.audioscrobbler.com/2.0/";
const KEY = process.env.LASTFM_API_KEY;

export type LastfmImage = { size: string; "#text": string };

export type LastfmTrack = {
  title: string;
  artist: string;
  playcount: number;
  cover: string;
  url: string;
};

export type LastfmArtist = {
  name: string;
  playcount: number;
  cover: string;
  url: string;
};

const CACHE_TTL = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: unknown }>();

async function call<T>(params: Record<string, string>): Promise<T> {
  if (!KEY) throw new Error("LASTFM_API_KEY не задан");
  const query = new URLSearchParams({ ...params, api_key: KEY, format: "json" });
  const cacheKey = query.toString();
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL) {
    console.log(`[Cache] HIT lastfm ${cacheKey.slice(0, 50)}`);
    return hit.data as T;
  }

  bumpRequest("lastfm");
  console.log(`[Cache] MISS lastfm ${cacheKey.slice(0, 50)}`);
  const response = await fetch(`${API}?${query.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Last.fm ${response.status}`);
  const data = (await response.json()) as T & { error?: number; message?: string };
  if (data.error) throw new Error(data.message ?? "Last.fm error");
  cache.set(cacheKey, { at: Date.now(), data });
  return data;
}

function pickCover(images?: LastfmImage[]) {
  if (!images?.length) return "";
  return images[images.length - 1]?.["#text"] ?? images[0]?.["#text"] ?? "";
}

export function lastfmConfigured() {
  return Boolean(KEY);
}

type RawTrack = {
  name?: string;
  artist?: { name?: string } | Array<{ name?: string }>;
  image?: LastfmImage[];
  playcount?: string;
  listeners?: string;
  url?: string;
};

function toTrack(item: RawTrack, fallbackArtist = ""): LastfmTrack {
  const artist = Array.isArray(item.artist) ? item.artist[0]?.name : item.artist?.name;
  return {
    title: item.name ?? "",
    artist: artist ?? fallbackArtist,
    playcount: Number(item.playcount ?? item.listeners ?? 0),
    cover: pickCover(item.image),
    url: item.url ?? "",
  };
}

function trackList(data: { tracks?: { track?: RawTrack[] }; toptracks?: { track?: RawTrack[] } }) {
  return (data.tracks?.track ?? data.toptracks?.track ?? [])
    .map((item) => toTrack(item))
    .filter((track) => track.title && track.artist);
}

export async function getTopTracks(country: string, limit = 20): Promise<LastfmTrack[]> {
  const data = await call<{ tracks?: { track?: RawTrack[] }; toptracks?: { track?: RawTrack[] } }>({
    method: "geo.gettoptracks",
    country,
    limit: String(limit),
  });
  return trackList(data);
}

export async function getGlobalTop(limit = 20): Promise<LastfmTrack[]> {
  const data = await call<{ tracks?: { track?: RawTrack[] }; toptracks?: { track?: RawTrack[] } }>({
    method: "chart.gettoptracks",
    limit: String(limit),
  });
  return trackList(data);
}

export async function getTopArtists(country: string, limit = 10): Promise<LastfmArtist[]> {
  const data = await call<{
    topartists?: { artist?: Array<{ name?: string; image?: LastfmImage[]; playcount?: string; listeners?: string; url?: string }> };
    artists?: { artist?: Array<{ name?: string; image?: LastfmImage[]; playcount?: string; listeners?: string; url?: string }> };
  }>({ method: "geo.gettopartists", country, limit: String(limit) });

  return (data.topartists?.artist ?? data.artists?.artist ?? [])
    .map((item) => ({
      name: item.name ?? "",
      playcount: Number(item.playcount ?? item.listeners ?? 0),
      cover: pickCover(item.image),
      url: item.url ?? "",
    }))
    .filter((artist) => artist.name);
}

export async function getArtistTopTracks(artist: string, limit = 10): Promise<LastfmTrack[]> {
  const data = await call<{ toptracks?: { track?: RawTrack[] }; tracks?: { track?: RawTrack[] } }>({
    method: "artist.gettoptracks",
    artist,
    limit: String(limit),
  });
  return (data.toptracks?.track ?? data.tracks?.track ?? [])
    .map((item) => toTrack(item, artist))
    .filter((track) => track.title);
}
