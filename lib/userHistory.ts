const HISTORY_KEY = "sonopa_history";
const LIKES_KEY = "sonopa_likes";
const MAX_ITEMS = 100;

function read(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function write(key: string, value: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value.slice(0, MAX_ITEMS)));
  } catch {
    // ignore
  }
}

export function addToHistory(youtubeId: string) {
  if (!youtubeId) return;
  const next = [youtubeId, ...read(HISTORY_KEY).filter((id) => id !== youtubeId)];
  write(HISTORY_KEY, next);
}

export function getHistory(): string[] {
  return read(HISTORY_KEY);
}

export function clearHistory() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}

export function addLike(youtubeId: string) {
  if (!youtubeId) return;
  const next = [youtubeId, ...read(LIKES_KEY).filter((id) => id !== youtubeId)];
  write(LIKES_KEY, next);
}

export function getLikes(): string[] {
  return read(LIKES_KEY);
}
