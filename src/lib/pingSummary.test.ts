import { describe, expect, it } from "vitest";

import { DEFAULT_PING_THRESHOLDS } from "./pingThresholds";
import { buildPingTaskSummaries } from "./pingSummary";

describe("buildPingTaskSummaries", () => {
  it("normalizes loss, calculates maxima and detects threshold runs", () => {
    const summary = buildPingTaskSummaries(
      [
        {
          metric_key: "ping.latency_ms",
          entity_id: "node-a",
          interval_seconds: 60,
          count: 4,
          tags: { task_id: "7" },
          points: [
            { time: "2026-09-01T00:00:00.000Z", value: 100 },
            { time: "2026-09-01T00:01:00.000Z", value: 240 },
            { time: "2026-09-01T00:02:00.000Z", value: 260 },
            { time: "2026-09-01T00:03:00.000Z", value: 90 },
          ],
        },
        {
          metric_key: "ping.loss",
          entity_id: "node-a",
          interval_seconds: 60,
          count: 4,
          tags: { task_id: "7" },
          points: [
            { time: "2026-09-01T00:00:00.000Z", value: 0 },
            { time: "2026-09-01T00:01:00.000Z", value: 0.1 },
            { time: "2026-09-01T00:02:00.000Z", value: 0.08 },
            { time: "2026-09-01T00:03:00.000Z", value: 0 },
          ],
        },
      ],
      [{ taskId: 7, label: "Transit", thresholds: DEFAULT_PING_THRESHOLDS }],
      [
        Date.parse("2026-09-01T00:00:00.000Z"),
        Date.parse("2026-09-01T00:03:00.000Z"),
      ],
    );

    expect(summary[0]).toMatchObject({
      taskId: 7,
      maxLatency: 260,
      maxLoss: 10,
      coverage: 1,
      longestAnomalyMs: 120_000,
      longestNoDataMs: null,
    });
  });

  it("reports gaps and keeps tasks without data visible", () => {
    const summary = buildPingTaskSummaries(
      [{
        metric_key: "ping.latency_ms",
        entity_id: "node-a",
        interval_seconds: 60,
        count: 2,
        tags: { task_id: "7" },
        points: [
          { time: "2026-09-01T00:00:00.000Z", value: 20 },
          { time: "2026-09-01T00:05:00.000Z", value: 20 },
        ],
      }],
      [
        { taskId: 7, label: "Transit", thresholds: DEFAULT_PING_THRESHOLDS },
        { taskId: 9, label: "Backup", thresholds: DEFAULT_PING_THRESHOLDS },
      ],
      [
        Date.parse("2026-09-01T00:00:00.000Z"),
        Date.parse("2026-09-01T00:05:00.000Z"),
      ],
    );

    expect(summary[0].longestNoDataMs).toBe(240_000);
    expect(summary[1]).toMatchObject({
      maxLatency: null,
      maxLoss: null,
      coverage: null,
      longestAnomalyMs: null,
      longestNoDataMs: null,
    });
  });
});
