import type { MetricPoint, MetricSeries } from "@/types/atlas";

const GAP_THRESHOLD_MULTIPLIER = 1.5;

function timestamp(point: MetricPoint) {
  return Date.parse(point.time);
}

function normalizedValue(metricKey: string, point: MetricPoint) {
  if (point.value === null || !Number.isFinite(point.value)) return null;
  if (typeof point.count === "number" && (!Number.isFinite(point.count) || point.count <= 0)) {
    return null;
  }
  if (metricKey.startsWith("ping.") && point.value < 0) return null;
  return point.value;
}

function inferredInterval(points: MetricPoint[], intervalSeconds?: number) {
  let expectedMs = typeof intervalSeconds === "number" && Number.isFinite(intervalSeconds) && intervalSeconds > 0
    ? intervalSeconds * 1000
    : 0;
  const deltas: number[] = [];

  for (let index = 1; index < points.length; index += 1) {
    const delta = timestamp(points[index]) - timestamp(points[index - 1]);
    if (delta > 0) deltas.push(delta);
  }

  if (deltas.length >= 2) {
    deltas.sort((left, right) => left - right);
    const observedMs = deltas[Math.floor((deltas.length - 1) / 4)];
    expectedMs = Math.max(expectedMs, observedMs);
  }

  return expectedMs;
}

export function insertMetricGapMarkers(series: MetricSeries): MetricPoint[] {
  const points = (series.points || [])
    .filter((point) => Number.isFinite(timestamp(point)))
    .map((point) => ({
      ...point,
      value: normalizedValue(series.metric_key, point),
    }))
    .sort((left, right) => timestamp(left) - timestamp(right));
  const expectedMs = inferredInterval(points, series.interval_seconds);

  if (expectedMs <= 0 || points.length < 2) return points;

  const result: MetricPoint[] = [];
  for (const point of points) {
    const previous = result[result.length - 1];
    if (
      previous
      && previous.value !== null
      && point.value !== null
      && timestamp(point) - timestamp(previous) > expectedMs * GAP_THRESHOLD_MULTIPLIER
    ) {
      result.push({
        time: new Date(timestamp(previous) + expectedMs).toISOString(),
        value: null,
      });
    }
    result.push(point);
  }

  return result;
}
