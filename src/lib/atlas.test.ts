import { describe, expect, it } from "vitest";

import {
  compareVersions,
  getTrafficUsed,
  normalizeAtlasSettings,
  resolveBillingWindow,
  resolveCardPingTaskIds,
  resourceTone,
  splitBillingMetricWindow,
  sumMetricSeries,
} from "./atlas";

describe("normalizeAtlasSettings", () => {
  it("rejects legacy settings without schema 2", () => {
    expect(normalizeAtlasSettings({ nodes: { node: { trafficResetDay: 5 } } })).toEqual({
      schema: 2,
      nodes: {},
    });
  });

  it("normalizes node settings and removes invalid values", () => {
    expect(normalizeAtlasSettings({
      schema: 2,
      nodes: {
        node: {
          trafficResetDay: 31,
          cardPingTaskIds: [2, "2", -1, 4.5, 7],
        },
      },
    })).toEqual({
      schema: 2,
      nodes: {
        node: {
          trafficResetDay: 31,
          cardPingTaskIds: [2, 7],
        },
      },
    });
  });
});

describe("resolveCardPingTaskIds", () => {
  const tasks = [
    { id: 3, weight: 3, name: "Global", clients: ["node-a", "node-b"], default_on: false, type: "icmp", interval: 60 },
    { id: 7, weight: 2, name: "Node A", clients: ["node-a"], default_on: false, type: "icmp", interval: 60 },
    { id: 9, weight: 1, name: "Node B", clients: ["node-b"], default_on: false, type: "icmp", interval: 60 },
  ];

  it("selects every available task for a node without saved settings", () => {
    expect(resolveCardPingTaskIds(undefined, tasks, "node-a")).toEqual([3, 7]);
  });

  it("uses the saved selection and excludes tasks unavailable to the node", () => {
    expect(resolveCardPingTaskIds(
      { cardPingTaskIds: [7, 9] },
      tasks,
      "node-a",
    )).toEqual([7]);
    expect(resolveCardPingTaskIds({ cardPingTaskIds: [] }, tasks, "node-a")).toEqual([]);
  });
});

describe("resolveBillingWindow", () => {
  it("uses the configured reset day in Asia/Shanghai", () => {
    const window = resolveBillingWindow(
      { expired_at: "2026-12-20T00:00:00+08:00" },
      { trafficResetDay: 5, cardPingTaskIds: [] },
      new Date("2026-09-18T12:00:00+08:00"),
    );

    expect(window?.source).toBe("configured");
    expect(window?.start.toISOString()).toBe("2026-09-04T16:00:00.000Z");
    expect(window?.end.toISOString()).toBe("2026-10-04T16:00:00.000Z");
  });

  it("clamps reset days to the end of short months", () => {
    const window = resolveBillingWindow(
      { expired_at: "" },
      { trafficResetDay: 31, cardPingTaskIds: [] },
      new Date("2026-02-28T20:00:00+08:00"),
    );

    expect(window?.start.toISOString()).toBe("2026-02-27T16:00:00.000Z");
    expect(window?.end.toISOString()).toBe("2026-03-30T16:00:00.000Z");
  });

  it("derives the reset day from expiry and supports unconfigured nodes", () => {
    const derived = resolveBillingWindow(
      { expired_at: "2026-12-23T00:00:00+08:00" },
      { cardPingTaskIds: [] },
      new Date("2026-09-18T12:00:00+08:00"),
    );
    expect(derived?.resetDay).toBe(23);
    expect(derived?.source).toBe("expiry");
    expect(resolveBillingWindow({ expired_at: "" }, { cardPingTaskIds: [] })).toBeNull();
  });
});

describe("splitBillingMetricWindow", () => {
  it("splits a monthly window at Komari rollup retention boundaries", () => {
    const windows = splitBillingMetricWindow(
      new Date("2026-08-01T16:00:00.000Z"),
      new Date("2026-09-01T14:21:00.000Z"),
    );

    expect(windows.map((window) => [window.start.toISOString(), window.end.toISOString()])).toEqual([
      ["2026-08-01T16:00:00.000Z", "2026-08-07T23:59:59.999Z"],
      ["2026-08-08T00:00:00.000Z", "2026-08-30T12:59:59.999Z"],
      ["2026-08-30T13:00:00.000Z", "2026-09-01T04:24:59.999Z"],
      ["2026-09-01T04:25:00.000Z", "2026-09-01T14:21:00.000Z"],
    ]);
  });

  it("keeps a recent window as one request", () => {
    const windows = splitBillingMetricWindow(
      new Date("2026-09-01T12:00:00.000Z"),
      new Date("2026-09-01T14:00:00.000Z"),
    );

    expect(windows).toHaveLength(1);
    expect(windows[0].start.toISOString()).toBe("2026-09-01T12:00:00.000Z");
    expect(windows[0].end.toISOString()).toBe("2026-09-01T14:00:00.000Z");
  });
});

describe("sumMetricSeries", () => {
  it("adds matching series from multiple query windows", () => {
    expect(sumMetricSeries({
      start: "2026-09-01T12:00:00.000Z",
      end: "2026-09-01T14:00:00.000Z",
      count: 3,
      series: [
        {
          metric_key: "traffic.up",
          entity_id: "node-a",
          count: 2,
          points: [
            { time: "2026-09-01T12:00:00.000Z", value: 10 },
            { time: "2026-09-01T12:01:00.000Z", value: 20 },
          ],
        },
        {
          metric_key: "traffic.up",
          entity_id: "node-a",
          count: 1,
          points: [{ time: "2026-09-01T13:00:00.000Z", value: 30 }],
        },
        {
          metric_key: "traffic.down",
          entity_id: "node-a",
          count: 1,
          points: [{ time: "2026-09-01T13:00:00.000Z", value: 99 }],
        },
      ],
    }, "traffic.up")).toEqual({ "node-a": 60 });
  });
});

describe("Atlas calculations", () => {
  it("applies every Komari traffic limit mode", () => {
    expect(getTrafficUsed(10, 20, "sum")).toBe(30);
    expect(getTrafficUsed(10, 20, "max")).toBe(20);
    expect(getTrafficUsed(10, 20, "min")).toBe(10);
    expect(getTrafficUsed(10, 20, "up")).toBe(10);
    expect(getTrafficUsed(10, 20, "down")).toBe(20);
  });

  it("uses fixed health thresholds", () => {
    expect(resourceTone(74.9, 75, 90)).toBe("good");
    expect(resourceTone(75, 75, 90)).toBe("warning");
    expect(resourceTone(90, 75, 90)).toBe("danger");
  });

  it("compares stable and prefixed Komari versions", () => {
    expect(compareVersions("v1.4.3", "1.4.3")).toBe(0);
    expect(compareVersions("1.4.4", "1.4.3")).toBe(1);
    expect(compareVersions("1.4.2", "1.4.3")).toBe(-1);
  });
});
