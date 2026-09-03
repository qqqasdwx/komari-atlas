import type {
  CardPingHistory,
  CardPingHistoryBucket,
  MetricPoint,
  MetricsResponse,
} from "@/types/atlas";

const PING_LATENCY_METRIC = "ping.latency_ms";
const PING_LOSS_METRIC = "ping.loss";

interface BucketAccumulator {
  latencyCount: number;
  latencySum: number;
  lossCount: number;
  lossSum: number;
  reportedLatencyCount: number;
  reportedLossCount: number;
}

function normalizeTaskId(taskId: string | number | undefined): string | null {
  const numericId = Number(taskId);
  return Number.isInteger(numericId) && numericId > 0 ? String(numericId) : null;
}

function pointCount(point: MetricPoint): number {
  if (typeof point.count === "number") {
    return Number.isFinite(point.count) && point.count > 0 ? point.count : 0;
  }
  return point.value == null ? 0 : 1;
}

function emptyAccumulators(count: number): BucketAccumulator[] {
  return Array.from({ length: count }, () => ({
    latencyCount: 0,
    latencySum: 0,
    lossCount: 0,
    lossSum: 0,
    reportedLatencyCount: 0,
    reportedLossCount: 0,
  }));
}

export function cardPingHistoryKey(entityId: string, taskId: string | number): string | null {
  const normalizedEntityId = entityId.trim();
  const normalizedTaskId = normalizeTaskId(taskId);
  if (!normalizedEntityId || !normalizedTaskId) return null;
  return `${normalizedEntityId}:${normalizedTaskId}`;
}

export function buildCardPingHistories(
  response: MetricsResponse,
  bucketCount = 24,
  expectedIntervalSeconds?: number,
): Record<string, CardPingHistory> {
  const startMs = Date.parse(response.start);
  const endMs = Date.parse(response.end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs || bucketCount <= 0) {
    return {};
  }

  const normalizedBucketCount = Math.max(1, Math.trunc(bucketCount));
  const bucketDuration = (endMs - startMs) / normalizedBucketCount;
  const accumulators = new Map<string, BucketAccumulator[]>();

  for (const series of response.series || []) {
    if (series.metric_key !== PING_LATENCY_METRIC && series.metric_key !== PING_LOSS_METRIC) {
      continue;
    }

    for (const point of series.points || []) {
      const taskId = normalizeTaskId(
        point.tags?.task_id
          || point.labels?.task_id
          || series.tags?.task_id,
      );
      const key = taskId ? cardPingHistoryKey(series.entity_id, taskId) : null;
      const timestamp = Date.parse(point.time);
      const count = pointCount(point);
      if (!key || !Number.isFinite(timestamp) || timestamp < startMs || timestamp >= endMs || count <= 0) {
        continue;
      }

      const index = Math.min(
        normalizedBucketCount - 1,
        Math.floor((timestamp - startMs) / bucketDuration),
      );
      const buckets = accumulators.get(key) || emptyAccumulators(normalizedBucketCount);
      const bucket = buckets[index];

      if (series.metric_key === PING_LATENCY_METRIC) {
        if (typeof point.count === "number") bucket.reportedLatencyCount += count;
        if (typeof point.value === "number" && Number.isFinite(point.value) && point.value >= 0) {
          bucket.latencyCount += count;
          bucket.latencySum += point.value * count;
        }
      } else {
        if (typeof point.count === "number") bucket.reportedLossCount += count;
        if (typeof point.value === "number" && Number.isFinite(point.value) && point.value >= 0) {
          bucket.lossCount += count;
          bucket.lossSum += Math.max(0, Math.min(1, point.value)) * count;
        }
      }

      accumulators.set(key, buckets);
    }
  }

  const result: Record<string, CardPingHistory> = {};
  for (const [key, buckets] of accumulators) {
    const hasCountMetadata = buckets.some(
      (bucket) => bucket.reportedLatencyCount > 0 || bucket.reportedLossCount > 0,
    );
    const expectedSamples = typeof expectedIntervalSeconds === "number"
      && Number.isFinite(expectedIntervalSeconds)
      && expectedIntervalSeconds > 0
      ? bucketDuration / 1000 / expectedIntervalSeconds
      : 0;
    result[key] = {
      buckets: buckets.map((bucket, index): CardPingHistoryBucket => {
        const lossRatio = bucket.lossCount > 0
          ? bucket.lossSum / bucket.lossCount
          : null;
        const lostLatencySamples = lossRatio === null
          ? 0
          : lossRatio * bucket.latencyCount;
        const validLatencySamples = bucket.latencyCount - lostLatencySamples;
        const latency = validLatencySamples > 0
          ? (bucket.latencySum + lostLatencySamples) / validLatencySamples
          : null;
        return {
          start: new Date(startMs + bucketDuration * index).toISOString(),
          end: new Date(startMs + bucketDuration * (index + 1)).toISOString(),
          latency: latency !== null && Number.isFinite(latency) && latency >= 0 ? latency : null,
          loss: lossRatio === null ? null : lossRatio * 100,
          coverage: hasCountMetadata && expectedSamples > 0
            ? Math.max(0, Math.min(1, Math.max(
                bucket.reportedLatencyCount,
                bucket.reportedLossCount,
              ) / expectedSamples))
            : null,
        };
      }),
    };
  }

  return result;
}
