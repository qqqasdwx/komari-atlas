const DAY_MS = 24 * 60 * 60 * 1000;
const LONG_TERM_DAYS = 36500;

export type ExpiryState =
  | { kind: "unset" }
  | { kind: "long-term" }
  | { kind: "scheduled"; timestamp: number; daysRemaining: number }
  | { kind: "expired"; timestamp: number };

export function resolveExpiryTimestamp(value: string | number | null | undefined): number | null {
  if (value == null) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^-?\d+$/.test(raw)) {
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return numeric < 1e12 ? numeric * 1000 : numeric;
  }

  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

export function resolveExpiry(
  value: string | number | null | undefined,
  now = Date.now(),
): ExpiryState {
  const timestamp = resolveExpiryTimestamp(value);
  if (timestamp == null || !Number.isFinite(now)) return { kind: "unset" };

  const remainingMs = timestamp - now;
  if (remainingMs > LONG_TERM_DAYS * DAY_MS) return { kind: "long-term" };
  if (remainingMs <= 0) return { kind: "expired", timestamp };

  return {
    kind: "scheduled",
    timestamp,
    daysRemaining: Math.ceil(remainingMs / DAY_MS),
  };
}
