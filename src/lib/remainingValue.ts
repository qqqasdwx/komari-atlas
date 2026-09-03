import type { NodeBasicInfo } from "@/contexts/NodeListContext";

type SkipReason =
  | "missing_price"
  | "missing_currency"
  | "unsupported_currency"
  | "missing_expired_at"
  | "invalid_expired_at"
  | "unsupported_billing_cycle";

type RemainingValueNodeStatus = "active" | "expired";

type RemainingValueNode = {
  uuid: string;
  name: string;
  price: number;
  billingCycle: number;
  currencySymbol: string;
  currencyCode: string;
  expiresAt: string | null;
  remainingMs: number | null;
  isLongTerm: boolean;
  remainingRatio: number;
  remainingValueOriginal: number;
  totalValueOriginal: number;
  monthlyCostOriginal: number;
  status: RemainingValueNodeStatus;
};

type SkippedRemainingValueNode = {
  uuid: string;
  name: string;
  skipReason: SkipReason;
};

type RemainingValueSnapshot = {
  active: RemainingValueNode[];
  expired: RemainingValueNode[];
  skipped: SkippedRemainingValueNode[];
};

type NodeValueCalculationInput = {
  renewalAmount: number;
  exchangeRate: number;
  billingMonths: number;
  expiryDate: string;
  transactionDate: string;
  salePrice?: number;
};

export type NodeValueCalculationResult = {
  renewalPriceCny: number;
  annualPriceCny: number;
  remainingDays: number;
  remainingValueCny: number;
  salePriceCny: number | null;
  premiumAmountCny: number | null;
  premiumRate: number | null;
};

export type NodeValueCalculationError =
  | "invalid_renewal_amount"
  | "invalid_exchange_rate"
  | "invalid_billing_cycle"
  | "invalid_date"
  | "expiry_not_after_transaction"
  | "invalid_sale_price";

type NodeValueCalculation =
  | { ok: true; result: NodeValueCalculationResult }
  | { ok: false; error: NodeValueCalculationError };

const SYMBOL_TO_ISO: Record<string, string> = {
  "\u00a5": "CNY",
  "$": "USD",
  "\u20ac": "EUR",
  "\u00a3": "GBP",
  "\u20bd": "RUB",
  "\u20a3": "CHF",
  "\u20b9": "INR",
  "\u20ab": "VND",
  "\u0e3f": "THB",
};

const LONG_TERM_THRESHOLD_MS = 36500 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const FINANCIAL_YEAR_DAYS = 360;

function parseCalendarDate(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp;
}

export function calculateNodeRemainingValue(
  input: NodeValueCalculationInput,
): NodeValueCalculation {
  if (!Number.isFinite(input.renewalAmount) || input.renewalAmount <= 0) {
    return { ok: false, error: "invalid_renewal_amount" };
  }
  if (!Number.isFinite(input.exchangeRate) || input.exchangeRate <= 0) {
    return { ok: false, error: "invalid_exchange_rate" };
  }
  if (!Number.isFinite(input.billingMonths) || input.billingMonths <= 0) {
    return { ok: false, error: "invalid_billing_cycle" };
  }
  if (input.salePrice !== undefined && (!Number.isFinite(input.salePrice) || input.salePrice < 0)) {
    return { ok: false, error: "invalid_sale_price" };
  }

  const expiryTimestamp = parseCalendarDate(input.expiryDate);
  const transactionTimestamp = parseCalendarDate(input.transactionDate);
  if (expiryTimestamp === null || transactionTimestamp === null) {
    return { ok: false, error: "invalid_date" };
  }

  const remainingDays = (expiryTimestamp - transactionTimestamp) / DAY_MS;
  if (remainingDays <= 0) {
    return { ok: false, error: "expiry_not_after_transaction" };
  }

  const renewalPriceCny = input.renewalAmount * input.exchangeRate;
  const annualPriceCny = renewalPriceCny * (12 / input.billingMonths);
  const remainingValueCny = (annualPriceCny / FINANCIAL_YEAR_DAYS) * remainingDays;
  const salePriceCny = input.salePrice ?? null;
  const premiumAmountCny = salePriceCny === null ? null : salePriceCny - remainingValueCny;
  const premiumRate = premiumAmountCny === null ? null : premiumAmountCny / remainingValueCny;

  return {
    ok: true,
    result: {
      renewalPriceCny,
      annualPriceCny,
      remainingDays,
      remainingValueCny,
      salePriceCny,
      premiumAmountCny,
      premiumRate,
    },
  };
}

function createSkippedNode(node: NodeBasicInfo, skipReason: SkipReason): SkippedRemainingValueNode {
  return {
    uuid: node.uuid,
    name: node.name,
    skipReason,
  };
}

function createRemainingValueNode(
  node: NodeBasicInfo,
  currencyCode: string,
  status: RemainingValueNodeStatus,
  remainingRatio: number,
  remainingMs: number | null,
  isLongTerm: boolean,
  remainingValueOriginal: number,
): RemainingValueNode {
  const monthlyCostOriginal = node.billing_cycle > 0
    ? (node.price * 30) / node.billing_cycle
    : 0;

  return {
    uuid: node.uuid,
    name: node.name,
    price: node.price,
    billingCycle: node.billing_cycle,
    currencySymbol: node.currency,
    currencyCode,
    expiresAt: node.expired_at.trim() ? node.expired_at : null,
    remainingMs,
    isLongTerm,
    remainingRatio,
    remainingValueOriginal,
    totalValueOriginal: node.price,
    monthlyCostOriginal,
    status,
  };
}

export function normalizeCurrencyCode(currency: string): string | null {
  const trimmed = currency.trim();
  if (!trimmed) {
    return null;
  }

  const upper = trimmed.toUpperCase();
  if (/^[A-Z]{3}$/.test(upper)) {
    return upper;
  }

  return SYMBOL_TO_ISO[trimmed] ?? null;
}

function toRemainingValueNode(
  node: NodeBasicInfo,
  nowMs: number,
): RemainingValueNode | SkippedRemainingValueNode {
  if (!Number.isFinite(node.price) || node.price <= 0) {
    return createSkippedNode(node, "missing_price");
  }

  if (!node.currency.trim()) {
    return createSkippedNode(node, "missing_currency");
  }

  const currencyCode = normalizeCurrencyCode(node.currency);
  if (!currencyCode) {
    return createSkippedNode(node, "unsupported_currency");
  }

  if (node.billing_cycle === -1) {
    return createRemainingValueNode(node, currencyCode, "active", 1, null, false, node.price);
  }

  if (node.billing_cycle <= 0) {
    return createSkippedNode(node, "unsupported_billing_cycle");
  }

  if (!node.expired_at.trim()) {
    return createSkippedNode(node, "missing_expired_at");
  }

  const expiresAtMs = new Date(node.expired_at).getTime();
  if (Number.isNaN(expiresAtMs)) {
    return createSkippedNode(node, "invalid_expired_at");
  }

  const cycleMs = node.billing_cycle * 24 * 60 * 60 * 1000;
  const remainingMs = expiresAtMs - nowMs;

  if (remainingMs <= 0) {
    return createRemainingValueNode(node, currencyCode, "expired", 0, 0, false, 0);
  }

  const isLongTerm = remainingMs > LONG_TERM_THRESHOLD_MS;
  const remainingRatio = isLongTerm ? 1 : Math.max(0, remainingMs / cycleMs);

  return createRemainingValueNode(
    node,
    currencyCode,
    "active",
    remainingRatio,
    remainingMs,
    isLongTerm,
    node.price * remainingRatio,
  );
}

export function buildRemainingValueSnapshot(
  nodes: NodeBasicInfo[],
  now: Date = new Date(),
): RemainingValueSnapshot {
  const active: RemainingValueNode[] = [];
  const expired: RemainingValueNode[] = [];
  const skipped: SkippedRemainingValueNode[] = [];

  for (const node of nodes) {
    const result = toRemainingValueNode(node, now.getTime());

    if ("skipReason" in result) {
      skipped.push(result);
      continue;
    }

    if (result.status === "expired") {
      expired.push(result);
      continue;
    }

    active.push(result);
  }

  return {
    active,
    expired,
    skipped,
  };
}
