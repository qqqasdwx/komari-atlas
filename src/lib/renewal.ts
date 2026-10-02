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
