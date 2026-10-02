import { describe, expect, it } from "vitest";

import {
  calculateRenewedExpiry,
  dateInputToTimestamp,
  toDateInputValue,
} from "./renewal";

const now = Date.UTC(2026, 9, 2, 12);

describe("calculateRenewedExpiry", () => {
  it("extends an active node from its current expiry", () => {
    const current = Date.UTC(2026, 9, 12, 12);
    const result = calculateRenewedExpiry(new Date(current).toISOString(), 30, now);

    expect(result).toEqual({
      ok: true,
      result: {
        currentTimestamp: current,
        baseTimestamp: current,
        nextTimestamp: Date.UTC(2026, 10, 11, 12),
        billingCycle: 30,
        startsFromNow: false,
      },
    });
  });

  it("starts an expired node from now", () => {
    const current = Date.UTC(2026, 8, 1, 12);
    const result = calculateRenewedExpiry(new Date(current).toISOString(), 15, now);

    expect(result).toEqual({
      ok: true,
      result: {
        currentTimestamp: current,
        baseTimestamp: now,
        nextTimestamp: Date.UTC(2026, 9, 17, 12),
        billingCycle: 15,
        startsFromNow: true,
      },
    });
  });

  it("rejects missing expiry and unsupported cycles", () => {
    expect(calculateRenewedExpiry("", 30, now)).toEqual({
      ok: false,
      error: "missing_expiry",
    });
    expect(calculateRenewedExpiry(new Date(now).toISOString(), 0, now)).toEqual({
      ok: false,
      error: "unsupported_billing_cycle",
    });
    expect(calculateRenewedExpiry(new Date(now).toISOString(), -1, now)).toEqual({
      ok: false,
      error: "unsupported_billing_cycle",
    });
  });

  it("rejects long-term expiry values", () => {
    const longTerm = Date.UTC(2227, 0, 1, 12);
    expect(calculateRenewedExpiry(new Date(longTerm).toISOString(), 30, now)).toEqual({
      ok: false,
      error: "long_term_expiry",
    });
  });
});

describe("renewal date inputs", () => {
  it("formats and parses a local calendar date while preserving the time", () => {
    const reference = new Date(2026, 9, 11, 15, 30, 45, 250).getTime();
    const value = toDateInputValue(reference);

    expect(value).toBe("2026-10-11");
    expect(dateInputToTimestamp("2026-10-20", reference)).toBe(
      new Date(2026, 9, 20, 15, 30, 45, 250).getTime(),
    );
  });

  it("rejects malformed and impossible calendar dates", () => {
    expect(dateInputToTimestamp("", Date.now())).toBeNull();
    expect(dateInputToTimestamp("2026-02-30", Date.now())).toBeNull();
  });
});
