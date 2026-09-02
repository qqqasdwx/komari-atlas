import { describe, expect, it } from "vitest";

import type { MetricSeries, MetricsResponse } from "@/types/atlas";
import { buildCardPingHistories, cardPingHistoryKey } from "./pingHistory";

const START = "2026-09-01T00:00:00.000Z";
const END = "2026-09-02T00:00:00.000Z";

function series(
  metricKey: string,
  points: MetricSeries["points"],
  taskId = "07",
): MetricSeries {
  return {
    metric_key: metricKey,
    entity_id: "node-a",
    tags: { task_id: taskId },
    count: points.length,
    points,
  };
}

function response(seriesList: MetricSeries[]): MetricsResponse {
  return { start: START, end: END, count: seriesList.length, series: seriesList };
}

describe("buildCardPingHistories", () => {
  it("builds 24 fixed buckets for latency and packet loss", () => {
    const histories = buildCardPingHistories(response([
      series("ping.latency_ms", [
        { time: "2026-09-01T00:05:00.000Z", value: 37.25, count: 4 },
        { time: "2026-09-01T01:05:00.000Z", value: 60, count: 10 },
      ]),
      series("ping.loss", [
        { time: "2026-09-01T00:05:00.000Z", value: 0.25, count: 4 },
        { time: "2026-09-01T01:05:00.000Z", value: 0, count: 10 },
      ]),
    ]));

    const history = histories["node-a:7"];
    expect(history.buckets).toHaveLength(24);
    expect(history.buckets[0]).toMatchObject({
      start: "2026-09-01T00:00:00.000Z",
      end: "2026-09-01T01:00:00.000Z",
      loss: 25,
    });
    expect(history.buckets[0].latency).toBeCloseTo(50, 8);
    expect(history.buckets[1]).toMatchObject({ latency: 60, loss: 0 });
    expect(history.buckets[2]).toMatchObject({ latency: null, loss: null });
    expect(cardPingHistoryKey("node-a", 7)).toBe("node-a:7");
  });

  it("combines several metric points in the same display bucket by sample count", () => {
    const histories = buildCardPingHistories(response([
      series("ping.latency_ms", [
        { time: "2026-09-01T00:05:00.000Z", value: 20, count: 2 },
        { time: "2026-09-01T00:35:00.000Z", value: 40, count: 6 },
      ]),
      series("ping.loss", [
        { time: "2026-09-01T00:05:00.000Z", value: 0, count: 2 },
        { time: "2026-09-01T00:35:00.000Z", value: 0, count: 6 },
      ]),
    ]));

    expect(histories["node-a:7"].buckets[0]).toMatchObject({
      latency: 35,
      loss: 0,
    });
  });

  it("keeps full-loss and empty buckets distinct", () => {
    const histories = buildCardPingHistories(response([
      series("ping.latency_ms", [
        { time: "2026-09-01T02:05:00.000Z", value: -1, count: 5 },
      ], "3"),
      series("ping.loss", [
        { time: "2026-09-01T02:05:00.000Z", value: 1, count: 5 },
      ], "3"),
    ]));

    expect(histories["node-a:3"].buckets[2]).toMatchObject({
      latency: null,
      loss: 100,
    });
    expect(histories["node-a:3"].buckets[3]).toMatchObject({
      latency: null,
      loss: null,
    });
  });

  it("ignores invalid task IDs, timestamps and values", () => {
    const histories = buildCardPingHistories(response([
      series("ping.latency_ms", [
        { time: "invalid", value: 20, count: 1 },
        { time: "2026-09-01T00:05:00.000Z", value: Number.NaN, count: 1 },
      ], "bad"),
    ]));

    expect(histories).toEqual({});
    expect(cardPingHistoryKey("node-a", -1)).toBeNull();
  });
});
