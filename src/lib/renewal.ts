import { resolveExpiryTimestamp } from "./expiry";

const DAY_MS = 24 * 60 * 60 * 1000;

export type RenewalCalculationError =
  | "unsupported_billing_cycle"
  | "missing_expiry"
  | "long_term_expiry"
  | "invalid_expiry";

export interface RenewalCalculation {
  currentTimestamp: number;
  baseTimestamp: number;
  nextTimestamp: number;
  billingCycle: number;
  startsFromNow: boolean;
}

export function toDateInputValue(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateInputToTimestamp(value: string, referenceTimestamp: number): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match || !Number.isFinite(referenceTimestamp)) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const reference = new Date(referenceTimestamp);
  const date = new Date(
    year,
    month - 1,
    day,
    reference.getHours(),
    reference.getMinutes(),
    reference.getSeconds(),
    reference.getMilliseconds(),
  );

  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }

  return date.getTime();
}

export function calculateRenewedExpiry(
  expiredAt: string | number | null | undefined,
  billingCycle: number,
  now = Date.now(),
): { ok: true; result: RenewalCalculation } | { ok: false; error: RenewalCalculationError } {
  if (!Number.isFinite(billingCycle) || billingCycle <= 0) {
    return { ok: false, error: "unsupported_billing_cycle" };
  }

  const currentTimestamp = resolveExpiryTimestamp(expiredAt);
  if (currentTimestamp === null) {
    return { ok: false, error: "missing_expiry" };
  }
  if (!Number.isFinite(now) || now <= 0) {
    return { ok: false, error: "invalid_expiry" };
  }

  const startsFromNow = currentTimestamp < now;
  const baseTimestamp = startsFromNow ? now : currentTimestamp;
  if (baseTimestamp - now > 36500 * DAY_MS) {
    return { ok: false, error: "long_term_expiry" };
  }

  const nextDate = new Date(baseTimestamp);
  nextDate.setUTCDate(nextDate.getUTCDate() + billingCycle);

  return {
    ok: true,
    result: {
      currentTimestamp,
      baseTimestamp,
      nextTimestamp: nextDate.getTime(),
      billingCycle,
      startsFromNow,
    },
  };
}
