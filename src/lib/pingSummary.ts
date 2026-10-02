import type { MetricPoint, MetricSeries, PingTaskThresholds } from "@/types/atlas";

const LATENCY_KEY = "ping.latency_ms";
const LOSS_KEY = "ping.loss";
const GAP_MULTIPLIER = 1.5;

export interface PingSummaryTaskInput {
  taskId: number;
  label: string;
  thresholds: PingTaskThresholds;
}

export interface PingTaskSummary {
  taskId: number;
  label: string;
  maxLatency: number | null;
  maxLoss: number | null;
  coverage: number | null;
  longestAnomalyMs: number | null;
  longestNoDataMs: number | null;
}

interface Sample {
  time: number;
  value: number | null;
}

interface SampleRow {
  time: number;
  latency: number | null;
  loss: number | null;
}

function taskIdForSeries(series: MetricSeries): number | null {
  const pointTaskId = series.points.find(
    (point) => point.tags?.task_id || point.labels?.task_id,
  );
  const value = Number(
    series.tags?.task_id
      || pointTaskId?.tags?.task_id
      || pointTaskId?.labels?.task_id,
  );
  return Number.isInteger(value) && value > 0 ? value : null;
}

function normalizeValue(metricKey: string, point: MetricPoint): number | null {
  if (typeof point.value !== "number" || !Number.isFinite(point.value)) return null;
  if (typeof point.count === "number" && (!Number.isFinite(point.count) || point.count <= 0)) return null;
  if (metricKey === LATENCY_KEY) return point.value >= 0 ? point.value : null;
  if (metricKey === LOSS_KEY) {
    const value = point.value <= 1 ? point.value * 100 : point.value;
    return Math.max(0, Math.min(100, value));
  }
  return null;
}

function samplesForSeries(series: MetricSeries): Sample[] {
  return (series.points || [])
    .map((point) => ({
      time: Date.parse(point.time),
      value: normalizeValue(series.metric_key, point),
    }))
    .filter((sample) => Number.isFinite(sample.time))
    .sort((left, right) => left.time - right.time);
}

function inferredIntervalMs(samples: Sample[], intervalSeconds?: number): number | null {
  if (typeof intervalSeconds === "number" && Number.isFinite(intervalSeconds) && intervalSeconds > 0) {
    return intervalSeconds * 1000;
  }

  const deltas: number[] = [];
  for (let index = 1; index < samples.length; index += 1) {
    const delta = samples[index].time - samples[index - 1].time;
    if (delta > 0) deltas.push(delta);
  }
  if (deltas.length === 0) return null;
  deltas.sort((left, right) => left - right);
  return deltas[Math.floor(deltas.length / 2)] || null;
}

function maxValue(samples: Sample[]): number | null {
  const values = samples
    .map((sample) => sample.value)
    .filter((value): value is number => value !== null);
  return values.length > 0 ? Math.max(...values) : null;
}

function clampFraction(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function longestRun(
  rows: SampleRow[],
  intervalMs: number | null,
  isMatch: (row: SampleRow) => boolean,
): number | null {
  if (!intervalMs || rows.length === 0) return null;

  let longest = 0;
  let runStart: number | null = null;
  let previousTime: number | null = null;

  const finish = (endTime: number | null) => {
    if (runStart === null || endTime === null) return;
    longest = Math.max(longest, Math.max(intervalMs, endTime - runStart + intervalMs));
  };

  for (const row of rows) {
    const contiguous = previousTime !== null && row.time - previousTime <= intervalMs * GAP_MULTIPLIER;
    if (!isMatch(row) || (runStart !== null && !contiguous)) {
      finish(previousTime);
      runStart = null;
    }
    if (isMatch(row)) runStart ??= row.time;
    previousTime = row.time;
  }
  finish(previousTime);
  return longest > 0 ? longest : null;
}

function longestGap(rows: SampleRow[], intervalMs: number | null): number | null {
  if (!intervalMs || rows.length < 2) return null;
  let longest = 0;
  for (let index = 1; index < rows.length; index += 1) {
    const delta = rows[index].time - rows[index - 1].time;
    if (delta > intervalMs * GAP_MULTIPLIER) {
      longest = Math.max(longest, delta - intervalMs);
    }
  }
  return longest > 0 ? longest : null;
}

export function buildPingTaskSummaries(
  series: MetricSeries[],
  tasks: PingSummaryTaskInput[],
  timeDomain: [number, number] | null,
): PingTaskSummary[] {
  return tasks.map((task) => {
    const taskSeries = series.filter((item) => taskIdForSeries(item) === task.taskId);
    const latencySeries = taskSeries.filter((item) => item.metric_key === LATENCY_KEY);
    const lossSeries = taskSeries.filter((item) => item.metric_key === LOSS_KEY);
    const latencySamples = latencySeries.flatMap(samplesForSeries);
    const lossSamples = lossSeries.flatMap(samplesForSeries);
    const allSamples = [...latencySamples, ...lossSamples].sort((left, right) => left.time - right.time);
    const intervalMs = inferredIntervalMs(
      allSamples,
      latencySeries[0]?.interval_seconds || lossSeries[0]?.interval_seconds,
    );
    const rowsByTime = new Map<number, SampleRow>();
    for (const sample of latencySamples) {
      const row = rowsByTime.get(sample.time) || { time: sample.time, latency: null, loss: null };
      row.latency = sample.value;
      rowsByTime.set(sample.time, row);
    }
    for (const sample of lossSamples) {
      const row = rowsByTime.get(sample.time) || { time: sample.time, latency: null, loss: null };
      row.loss = sample.value;
      rowsByTime.set(sample.time, row);
    }
    const rows = [...rowsByTime.values()].sort((left, right) => left.time - right.time);
    const expectedSamples = intervalMs && timeDomain && timeDomain[1] > timeDomain[0]
      ? Math.floor((timeDomain[1] - timeDomain[0]) / intervalMs) + 1
      : null;
    const coverageValues = [
      latencySamples.filter((sample) => sample.value !== null).length,
      lossSamples.filter((sample) => sample.value !== null).length,
    ]
      .filter((count) => count > 0)
      .map((count) => expectedSamples ? clampFraction(count / expectedSamples) : null)
      .filter((value): value is number => value !== null);

    return {
      taskId: task.taskId,
      label: task.label,
      maxLatency: maxValue(latencySamples),
      maxLoss: maxValue(lossSamples),
      coverage: coverageValues.length > 0
        ? coverageValues.reduce((sum, value) => sum + value, 0) / coverageValues.length
        : null,
      longestAnomalyMs: longestRun(
        rows,
        intervalMs,
        (row) => (
          (row.latency !== null && row.latency > task.thresholds.latency.yellowMax)
          || (row.loss !== null && row.loss > task.thresholds.loss.yellowMax)
        ),
      ),
      longestNoDataMs: Math.max(
        longestRun(rows, intervalMs, (row) => row.latency === null && row.loss === null) || 0,
        longestGap(rows, intervalMs) || 0,
      ) || null,
    };
  });
}
