import type {
  AtlasNode,
  AtlasNodeSettings,
  AtlasSettingsV2,
  BillingTrafficDay,
  BillingWindow,
  MetricSeries,
  MetricsResponse,
  PingTask,
  TrafficLimitType,
} from "@/types/atlas";
import { normalizePingTaskThresholds } from "./pingThresholds";

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

// Komari 1.4.3 keeps rollups at 1m/5m/1h/24h for 10h/50h/600h/metric retention.
// Keep each request inside one backing tier so a newly extended retention policy
// can still read the finer rollups that already exist.
const KOMARI_ROLLUP_BOUNDARIES = [
  { ageMs: 600 * 60 * MINUTE_MS, alignmentMs: 24 * 60 * MINUTE_MS },
  { ageMs: 50 * 60 * MINUTE_MS, alignmentMs: 60 * MINUTE_MS },
  { ageMs: 10 * 60 * MINUTE_MS, alignmentMs: 5 * MINUTE_MS },
];

export const EMPTY_ATLAS_SETTINGS: AtlasSettingsV2 = {
  schema: 2,
  nodes: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeAtlasSettings(input: unknown): AtlasSettingsV2 {
  let source = input;
  if (typeof input === "string") {
    try {
      source = JSON.parse(input);
    } catch {
      return EMPTY_ATLAS_SETTINGS;
    }
  }

  if (!isRecord(source) || source.schema !== 2 || !isRecord(source.nodes)) {
    return EMPTY_ATLAS_SETTINGS;
  }

  const nodes: Record<string, AtlasNodeSettings> = {};
  for (const [uuid, value] of Object.entries(source.nodes)) {
    if (!uuid.trim() || !isRecord(value)) continue;

    const resetDay = Number(value.trafficResetDay);
    const pingIds = Array.isArray(value.cardPingTaskIds)
      ? Array.from(
          new Set(
            value.cardPingTaskIds
              .map(Number)
              .filter((id) => Number.isInteger(id) && id > 0),
          ),
        )
      : [];
    const pingThresholds = isRecord(value.pingThresholds)
      ? Object.fromEntries(
          Object.entries(value.pingThresholds)
            .filter(([taskId, thresholds]) => {
              const numericTaskId = Number(taskId);
              return Number.isInteger(numericTaskId) && numericTaskId > 0 && isRecord(thresholds);
            })
            .map(([taskId, thresholds]) => [
              String(Number(taskId)),
              normalizePingTaskThresholds(thresholds),
            ]),
        )
      : {};

    nodes[uuid] = {
      ...(Number.isInteger(resetDay) && resetDay >= 1 && resetDay <= 31
        ? { trafficResetDay: resetDay }
        : {}),
      cardPingTaskIds: pingIds,
      ...(Object.keys(pingThresholds).length > 0 ? { pingThresholds } : {}),
    };
  }

  return { schema: 2, nodes };
}

export function resolveCardPingTaskIds(
  nodeSettings: AtlasNodeSettings | undefined,
  pingTasks: PingTask[],
  nodeId: string,
): number[] {
  const availableIds = pingTasks
    .filter((task) => task.clients.includes(nodeId))
    .map((task) => task.id);

  if (!nodeSettings) return availableIds;

  const availableIdSet = new Set(availableIds);
  return nodeSettings.cardPingTaskIds.filter((taskId) => availableIdSet.has(taskId));
}

export function orderPingTasksByCardSelection(
  pingTasks: PingTask[],
  selectedTaskIds: number[],
): PingTask[] {
  const selectedRank = new Map(selectedTaskIds.map((taskId, index) => [taskId, index]));

  return pingTasks
    .map((task, index) => ({ task, index, rank: selectedRank.get(task.id) }))
    .sort((left, right) => {
      if (left.rank === undefined && right.rank === undefined) return left.index - right.index;
      if (left.rank === undefined) return 1;
      if (right.rank === undefined) return -1;
      return left.rank - right.rank;
    })
    .map(({ task }) => task);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function shanghaiMidnightUtc(year: number, monthIndex: number, day: number): Date {
  const clampedDay = Math.min(day, daysInMonth(year, monthIndex));
  return new Date(Date.UTC(year, monthIndex, clampedDay) - SHANGHAI_OFFSET_MS);
}

function getShanghaiParts(date: Date) {
  const shifted = new Date(date.getTime() + SHANGHAI_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    monthIndex: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

function expiryResetDay(expiredAt: string): number | null {
  if (!expiredAt.trim()) return null;
  const expiry = new Date(expiredAt);
  if (!Number.isFinite(expiry.getTime())) return null;
  return getShanghaiParts(expiry).day;
}

export function resolveBillingWindow(
  node: Pick<AtlasNode, "expired_at">,
  settings: AtlasNodeSettings | undefined,
  now = new Date(),
): BillingWindow | null {
  const configuredDay = settings?.trafficResetDay;
  const derivedDay = expiryResetDay(node.expired_at);
  const resetDay = configuredDay ?? derivedDay;
  if (!resetDay) return null;

  const nowParts = getShanghaiParts(now);
  let start = shanghaiMidnightUtc(nowParts.year, nowParts.monthIndex, resetDay);
  if (now.getTime() < start.getTime()) {
    start = shanghaiMidnightUtc(nowParts.year, nowParts.monthIndex - 1, resetDay);
  }

  const startParts = getShanghaiParts(start);
  const end = shanghaiMidnightUtc(startParts.year, startParts.monthIndex + 1, resetDay);

  return {
    resetDay,
    source: configuredDay ? "configured" : "expiry",
    start,
    end,
  };
}

export function splitBillingMetricWindow(
  start: Date,
  end: Date,
): Array<{ start: Date; end: Date }> {
  if (end.getTime() <= start.getTime()) return [];

  const boundaries = KOMARI_ROLLUP_BOUNDARIES
    .map(({ ageMs, alignmentMs }) => {
      const cutoff = end.getTime() - ageMs;
      return Math.ceil(cutoff / alignmentMs) * alignmentMs;
    })
    .filter((boundary) => boundary > start.getTime() && boundary < end.getTime());

  const windows: Array<{ start: Date; end: Date }> = [];
  let windowStart = start.getTime();
  for (const boundary of boundaries) {
    windows.push({
      start: new Date(windowStart),
      end: new Date(boundary - 1),
    });
    windowStart = boundary;
  }
  windows.push({ start: new Date(windowStart), end: new Date(end) });
  return windows;
}

export function getTrafficUsed(
  up: number,
  down: number,
  type: TrafficLimitType,
): number {
  switch (type) {
    case "max":
      return Math.max(up, down);
    case "min":
      return Math.min(up, down);
    case "up":
      return up;
    case "down":
      return down;
    case "sum":
    default:
      return up + down;
  }
}

export function sumMetricSeries(
  response: MetricsResponse,
  metricKey: string,
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const series of response.series || []) {
    if (series.metric_key !== metricKey || !series.entity_id) continue;
    totals[series.entity_id] = (totals[series.entity_id] || 0) +
      (series.points || []).reduce(
        (sum, point) => sum + (typeof point.value === "number" ? point.value : 0),
        0,
      );
  }
  return totals;
}

export function buildDailyTrafficSeries(
  response: MetricsResponse,
  entityId: string,
  start: Date,
  end: Date,
): BillingTrafficDay[] {
  const days = new Map<string, BillingTrafficDay>();
  for (let time = start.getTime(); time <= end.getTime(); time += DAY_MS) {
    const parts = getShanghaiParts(new Date(time));
    const date = `${parts.year}-${String(parts.monthIndex + 1).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
    days.set(date, { date, up: 0, down: 0 });
  }

  for (const series of response.series || []) {
    if (
      series.entity_id !== entityId ||
      (series.metric_key !== "traffic.up" && series.metric_key !== "traffic.down")
    ) continue;

    for (const point of series.points || []) {
      if (typeof point.value !== "number" || !Number.isFinite(point.value)) continue;
      const pointTime = new Date(point.time);
      if (!Number.isFinite(pointTime.getTime())) continue;
      const parts = getShanghaiParts(pointTime);
      const date = `${parts.year}-${String(parts.monthIndex + 1).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
      const day = days.get(date);
      if (!day) continue;
      day[series.metric_key === "traffic.up" ? "up" : "down"] += Math.max(0, point.value);
    }
  }

  return Array.from(days.values());
}

export function metricSeriesKey(series: MetricSeries, index: number): string {
  const task = series.tags?.task_id;
  return task ? `${series.metric_key}:${task}` : `${series.metric_key}:${index}`;
}

export function percentage(used: number, total: number): number {
  if (!Number.isFinite(used) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, (used / total) * 100);
}

export type HealthTone = "neutral" | "good" | "warning" | "danger";

export function resourceTone(
  value: number,
  warning: number,
  danger: number,
): HealthTone {
  if (!Number.isFinite(value)) return "neutral";
  if (value >= danger) return "danger";
  if (value >= warning) return "warning";
  return "good";
}

export function compareVersions(left: string, right: string): number {
  const parse = (value: string) =>
    value
      .replace(/^v/i, "")
      .split(/[.+-]/)
      .slice(0, 3)
      .map((part) => Number.parseInt(part, 10) || 0);
  const leftParts = parse(left);
  const rightParts = parse(right);
  for (let index = 0; index < 3; index++) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] > rightParts[index] ? 1 : -1;
    }
  }
  return 0;
}
