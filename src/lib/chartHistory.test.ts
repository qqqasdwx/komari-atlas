import { describe, expect, it } from "vitest";

import type { MetricPoint, MetricSeries } from "@/types/atlas";
import { insertMetricGapMarkers } from "./chartHistory";

function series(points: MetricPoint[], overrides: Partial<MetricSeries> = {}): MetricSeries {
  return {
    metric_key: "cpu.usage",
    entity_id: "node-a",
    count: points.length,
    points,
    ...overrides,
  };
}

describe("insertMetricGapMarkers", () => {
  it("inserts a null marker when a regular series has a missing interval", () => {
    const points = insertMetricGapMarkers(series([
      { time: "2026-09-03T00:00:00.000Z", value: 10 },
      { time: "2026-09-03T00:01:00.000Z", value: 20 },
      { time: "2026-09-03T00:02:00.000Z", value: 30 },
      { time: "2026-09-03T00:06:00.000Z", value: 40 },
    ]));

    expect(points).toHaveLength(5);
    expect(points[3]).toEqual({
      time: "2026-09-03T00:03:00.000Z",
      value: null,
    });
  });

  it("uses the server interval when there are too few points to infer one", () => {
    const points = insertMetricGapMarkers(series([
      { time: "2026-09-03T00:00:00.000Z", value: 10 },
      { time: "2026-09-03T00:05:00.000Z", value: 20 },
    ], { interval_seconds: 60 }));

    expect(points[1]).toMatchObject({
      time: "2026-09-03T00:01:00.000Z",
      value: null,
    });
  });

  it("turns empty aggregate buckets and negative Ping sentinels into gaps", () => {
    const emptyAggregate = insertMetricGapMarkers(series([
      { time: "2026-09-03T00:00:00.000Z", value: 0, count: 0 },
    ]));
    const emptyPing = insertMetricGapMarkers(series([
      { time: "2026-09-03T00:00:00.000Z", value: -1, count: 1 },
    ], { metric_key: "ping.latency_ms" }));

    expect(emptyAggregate[0].value).toBeNull();
    expect(emptyPing[0].value).toBeNull();
  });

  it("does not add gaps to a regular sparse series", () => {
    const source = [
      { time: "2026-09-03T00:00:00.000Z", value: 10 },
      { time: "2026-09-03T00:05:00.000Z", value: 20 },
      { time: "2026-09-03T00:10:00.000Z", value: 30 },
    ];

    expect(insertMetricGapMarkers(series(source))).toEqual(source);
  });
});
