import { describe, expect, it } from "vitest";

import { resolveExpiry, resolveExpiryTimestamp } from "./expiry";

const NOW = Date.parse("2026-09-02T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

describe("resolveExpiryTimestamp", () => {
  it("treats Komari no-expiry sentinels as unset", () => {
    expect(resolveExpiryTimestamp("")).toBeNull();
    expect(resolveExpiryTimestamp("0")).toBeNull();
    expect(resolveExpiryTimestamp("-1")).toBeNull();
    expect(resolveExpiryTimestamp("0001-01-01T00:00:00Z")).toBeNull();
  });

  it("supports ISO dates and Unix timestamps", () => {
    expect(resolveExpiryTimestamp("2026-09-12T12:00:00Z")).toBe(NOW + 10 * DAY_MS);
    expect(resolveExpiryTimestamp(String((NOW + DAY_MS) / 1000))).toBe(NOW + DAY_MS);
    expect(resolveExpiryTimestamp(String(NOW + DAY_MS))).toBe(NOW + DAY_MS);
  });
});

describe("resolveExpiry", () => {
  it("returns a rounded-up remaining-day count", () => {
    expect(resolveExpiry(NOW + 10.25 * DAY_MS, NOW)).toEqual({
      kind: "scheduled",
      timestamp: NOW + 10.25 * DAY_MS,
      daysRemaining: 11,
    });
  });

  it("recognizes Komari long-term dates and expired dates", () => {
    expect(resolveExpiry(NOW + 40000 * DAY_MS, NOW)).toEqual({ kind: "long-term" });
    expect(resolveExpiry(NOW - DAY_MS, NOW)).toEqual({
      kind: "expired",
      timestamp: NOW - DAY_MS,
    });
  });
});
