// Универсальный кэш: Map в памяти + localStorage на клиенте.
// На сервере localStorage недоступен — работает in-memory Map,
// который живёт всё время работы dev/prod-процесса.

import { bumpCache, bumpRequest } from "@/lib/api-stats";

export type CacheSource = "youtube" | "invidious" | "lastfm" | "lrclib" | "other";

type Entry = { expires: number; data: unknown };

const memory = new Map<string, Entry>();
const LS_PREFIX = "sonora.cache.";
const LS_MAX_KEYS = 300;

function lsGet(key: string): Entry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as Entry;
  } catch {
    return null;
  }
}

function lsSet(key: string, entry: Entry) {
  if (typeof window === "undefined") return;
  try {
    // ограничиваем размер: если ключей слишком много — чистим старейшие
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(LS_PREFIX));
    if (keys.length >= LS_MAX_KEYS) {
      const oldest = keys
        .map((k) => ({ k, at: (JSON.parse(localStorage.getItem(k) ?? "{}") as Entry).expires ?? 0 }))
        .sort((a, b) => a.at - b.at)
        .slice(0, 50);
      oldest.forEach(({ k }) => localStorage.removeItem(k));
    }
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry));
  } catch {
    // quota exceeded — молча пропускаем
  }
}

export function cacheGet<T>(key: string): T | null {
  const now = Date.now();
  const mem = memory.get(key);
  if (mem && mem.expires > now) return mem.data as T;
  const ls = lsGet(key);
  if (ls && ls.expires > now) {
    memory.set(key, ls);
    return ls.data as T;
  }
  return null;
}

export function cacheSet(key: string, data: unknown, ttlMs: number) {
  const entry: Entry = { expires: Date.now() + ttlMs, data };
  memory.set(key, entry);
  lsSet(key, entry);
}

// cached() — get-or-fetch с логированием HIT/MISS и учётом источника
export async function cached<T>(key: string, ttlMs: number, source: CacheSource, fn: () => Promise<T>): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== null) {
    bumpCache(true);
    console.log(`[Cache] HIT ${key.slice(0, 60)} (${source})`);
    return hit;
  }
  bumpCache(false);
  bumpRequest(source === "other" ? "youtube" : source);
  console.log(`[Cache] MISS ${key.slice(0, 60)} (${source})`);
  const data = await fn();
  // Пустые результаты кэшируем ненадолго — провайдер мог быть временно недоступен
  const effectiveTtl = Array.isArray(data) && data.length === 0 ? 5 * 60 * 1000 : ttlMs;
  cacheSet(key, data, effectiveTtl);
  return data;
}
