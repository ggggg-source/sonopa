// Защита квоты YouTube Data API: при 429/403 блокируем запросы на 30 минут,
// чтобы не сжигать лимит и не спамить API.

const BLOCK_TTL = 30 * 60 * 1000;
let blockedUntil = 0;

export function isQuotaError(status: number) {
  return status === 429 || status === 403;
}

export function markQuotaBlocked() {
  blockedUntil = Date.now() + BLOCK_TTL;
}

export function quotaBlocked() {
  return Date.now() < blockedUntil;
}

export function quotaBlockedSeconds() {
  return Math.max(0, Math.ceil((blockedUntil - Date.now()) / 1000));
}
