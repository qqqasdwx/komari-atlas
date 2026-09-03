import type {
  AtlasNodeSettings,
  PingMetric,
  PingMetricThresholds,
  PingTaskThresholds,
} from "@/types/atlas";

export const DEFAULT_PING_THRESHOLDS: PingTaskThresholds = {
  latency: { greenMax: 80, yellowMax: 180 },
  loss: { greenMax: 1, yellowMax: 5 },
};

export const PING_THRESHOLD_MAXIMUMS: Record<PingMetric, number> = {
  latency: 60_000,
  loss: 100,
};

export type PingTone = "neutral" | "good" | "warning" | "danger";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeNumber(value: unknown, fallback: number, maximum: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(maximum, value));
}

function normalizeMetricThresholds(
  input: unknown,
  defaults: PingMetricThresholds,
  maximum: number,
): PingMetricThresholds {
  const source = isRecord(input) ? input : {};
  const greenMax = normalizeNumber(source.greenMax, defaults.greenMax, maximum);
  const yellowMax = Math.max(
    greenMax,
    normalizeNumber(source.yellowMax, defaults.yellowMax, maximum),
  );
  return { greenMax, yellowMax };
}

export function normalizePingTaskThresholds(input: unknown): PingTaskThresholds {
  const source = isRecord(input) ? input : {};
  return {
    latency: normalizeMetricThresholds(
      source.latency,
      DEFAULT_PING_THRESHOLDS.latency,
      PING_THRESHOLD_MAXIMUMS.latency,
    ),
    loss: normalizeMetricThresholds(
      source.loss,
      DEFAULT_PING_THRESHOLDS.loss,
      PING_THRESHOLD_MAXIMUMS.loss,
    ),
  };
}

export function resolvePingTaskThresholds(
  nodeSettings: AtlasNodeSettings | undefined,
  taskId: string | number,
): PingTaskThresholds {
  return normalizePingTaskThresholds(nodeSettings?.pingThresholds?.[String(taskId)]);
}

export function pingMetricTone(
  metric: PingMetric,
  value: number | null,
  thresholds: PingTaskThresholds,
): PingTone {
  if (value === null) return "neutral";
  if (value <= thresholds[metric].greenMax) return "good";
  if (value <= thresholds[metric].yellowMax) return "warning";
  return "danger";
}
