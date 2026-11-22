// LRC Lib (https://lrclib.net) — бесплатный API текстов песен, без ключа.
// Поддерживает synced (time-synced) и plain тексты.

export type LyricsResult = {
  syncedLyrics: string | null;
  plainLyrics: string | null;
};

type LrcLibTrack = {
  id: number;
  trackName: string;
  artistName: string;
  syncedLyrics: string | null;
  plainLyrics: string | null;
};

const CACHE_TTL = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: LyricsResult | null }>();

export async function searchLyrics(artistName: string, trackName: string): Promise<LyricsResult | null> {
  const cacheKey = `${artistName}::${trackName}`.toLowerCase();
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data;

  try {
    const url = new URL("https://lrclib.net/api/search");
    url.searchParams.set("artist_name", artistName);
    url.searchParams.set("track_name", trackName);
    url.searchParams.set("format", "json");

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      cache.set(cacheKey, { at: Date.now(), data: null });
      return null;
    }
    const data = (await response.json()) as LrcLibTrack[];
    const first = Array.isArray(data) ? data[0] : undefined;
    if (!first) {
      cache.set(cacheKey, { at: Date.now(), data: null });
      return null;
    }
    const result: LyricsResult = {
      syncedLyrics: first.syncedLyrics || null,
      plainLyrics: first.plainLyrics || null,
    };
    if (!result.syncedLyrics && !result.plainLyrics) {
      cache.set(cacheKey, { at: Date.now(), data: null });
      return null;
    }
    cache.set(cacheKey, { at: Date.now(), data: result });
    return result;
  } catch {
    return null;
  }
}
