import { describe, expect, it } from "vitest";

import { calculateNodeRemainingValue } from "./remainingValue";

describe("calculateNodeRemainingValue", () => {
  it("matches the calculator example using a 360-day financial year", () => {
    const calculation = calculateNodeRemainingValue({
      renewalAmount: 111,
      exchangeRate: 6.757,
      billingMonths: 12,
      transactionDate: "2026-09-03",
      expiryDate: "2027-10-03",
      salePrice: 800,
    });

    expect(calculation.ok).toBe(true);
    if (!calculation.ok) return;

    expect(calculation.result.remainingDays).toBe(395);
    expect(calculation.result.renewalPriceCny).toBeCloseTo(750.027, 6);
    expect(calculation.result.remainingValueCny).toBeCloseTo(822.95, 2);
    expect(calculation.result.premiumAmountCny).toBeCloseTo(-22.95, 2);
    expect(calculation.result.premiumRate).toBeCloseTo(-0.028, 3);
  });

  it("supports non-annual billing cycles and an omitted sale price", () => {
    const calculation = calculateNodeRemainingValue({
      renewalAmount: 30,
      exchangeRate: 1,
      billingMonths: 3,
      transactionDate: "2026-01-01",
      expiryDate: "2026-06-30",
    });

    expect(calculation).toEqual({
      ok: true,
      result: {
        renewalPriceCny: 30,
        annualPriceCny: 120,
        remainingDays: 180,
        remainingValueCny: 60,
        salePriceCny: null,
        premiumAmountCny: null,
        premiumRate: null,
      },
    });
  });

  it("uses UTC calendar dates so daylight-saving changes cannot alter the day count", () => {
    const calculation = calculateNodeRemainingValue({
      renewalAmount: 360,
      exchangeRate: 1,
      billingMonths: 12,
      transactionDate: "2026-03-01",
      expiryDate: "2026-04-01",
    });

    expect(calculation.ok && calculation.result.remainingDays).toBe(31);
  });

  it("rejects malformed dates and non-positive date ranges", () => {
    expect(calculateNodeRemainingValue({
      renewalAmount: 10,
      exchangeRate: 1,
      billingMonths: 1,
      transactionDate: "2026-02-30",
      expiryDate: "2026-03-10",
    })).toEqual({ ok: false, error: "invalid_date" });

    expect(calculateNodeRemainingValue({
      renewalAmount: 10,
      exchangeRate: 1,
      billingMonths: 1,
      transactionDate: "2026-03-10",
      expiryDate: "2026-03-10",
    })).toEqual({ ok: false, error: "expiry_not_after_transaction" });
  });
});
