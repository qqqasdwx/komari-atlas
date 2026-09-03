import { describe, expect, it } from "vitest";

import {
  DEFAULT_PING_THRESHOLDS,
  normalizePingTaskThresholds,
  pingMetricTone,
  resolvePingTaskThresholds,
} from "./pingThresholds";

describe("normalizePingTaskThresholds", () => {
  it("uses the current card color thresholds by default", () => {
    expect(normalizePingTaskThresholds(undefined)).toEqual(DEFAULT_PING_THRESHOLDS);
    expect(normalizePingTaskThresholds({
      latency: { greenMax: null, yellowMax: "" },
    })).toEqual(DEFAULT_PING_THRESHOLDS);
  });

  it("clamps invalid ranges and preserves valid decimal thresholds", () => {
    expect(normalizePingTaskThresholds({
      latency: { greenMax: 300, yellowMax: 200 },
      loss: { greenMax: 1.5, yellowMax: 101 },
    })).toEqual({
      latency: { greenMax: 300, yellowMax: 300 },
      loss: { greenMax: 1.5, yellowMax: 100 },
    });
  });
});

describe("resolvePingTaskThresholds", () => {
  it("resolves thresholds independently for each task", () => {
    expect(resolvePingTaskThresholds({
      cardPingTaskIds: [3],
      pingThresholds: {
        "3": {
          latency: { greenMax: 100, yellowMax: 250 },
          loss: { greenMax: 2, yellowMax: 10 },
        },
      },
    }, 3)).toEqual({
      latency: { greenMax: 100, yellowMax: 250 },
      loss: { greenMax: 2, yellowMax: 10 },
    });
    expect(resolvePingTaskThresholds(undefined, 3)).toEqual(DEFAULT_PING_THRESHOLDS);
  });
});

describe("pingMetricTone", () => {
  it("applies green, yellow and red at the configured boundaries", () => {
    const thresholds = normalizePingTaskThresholds(undefined);

    expect(pingMetricTone("latency", null, thresholds)).toBe("neutral");
    expect(pingMetricTone("latency", 80, thresholds)).toBe("good");
    expect(pingMetricTone("latency", 81, thresholds)).toBe("warning");
    expect(pingMetricTone("latency", 180, thresholds)).toBe("warning");
    expect(pingMetricTone("latency", 181, thresholds)).toBe("danger");
    expect(pingMetricTone("loss", 1, thresholds)).toBe("good");
    expect(pingMetricTone("loss", 5, thresholds)).toBe("warning");
    expect(pingMetricTone("loss", 5.1, thresholds)).toBe("danger");
  });
});
