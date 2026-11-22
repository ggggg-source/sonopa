// Счётчики обращений к внешним API — для /api/stats (dev-мониторинг).

export type ApiSource = "youtube" | "youtubei" | "invidious" | "lastfm" | "lrclib";

type Stats = {
  requests: Record<ApiSource, number>;
  cacheHits: number;
  cacheMisses: number;
};

const g = globalThis as unknown as { __sonoraStats?: Stats };

export const apiStats: Stats = (g.__sonoraStats ??= {
  requests: { youtube: 0, youtubei: 0, invidious: 0, lastfm: 0, lrclib: 0 },
  cacheHits: 0,
  cacheMisses: 0,
});

export function bumpRequest(source: ApiSource) {
  apiStats.requests[source] += 1;
}

export function bumpCache(hit: boolean) {
  if (hit) apiStats.cacheHits += 1;
  else apiStats.cacheMisses += 1;
}

export function statsSnapshot() {
  const total = apiStats.cacheHits + apiStats.cacheMisses;
  return {
    ...apiStats,
    cacheHitRate: total ? Math.round((apiStats.cacheHits / total) * 1000) / 10 : 0,
    generatedAt: new Date().toISOString(),
  };
}
