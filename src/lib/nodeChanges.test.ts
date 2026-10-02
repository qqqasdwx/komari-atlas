import { describe, expect, it } from "vitest";

import type { AtlasNode } from "@/types/atlas";

import {
  clearNodeChangeHistory,
  createNodeSnapshot,
  EMPTY_NODE_CHANGE_STORE,
  recordNodeListChanges,
} from "./nodeChanges";

function node(patch: Partial<AtlasNode> = {}): AtlasNode {
  return {
    uuid: "node-a",
    name: "Atlas",
    cpu_name: "CPU",
    cpu_cores: 4,
    virtualization: "KVM",
    arch: "amd64",
    os: "Debian",
    kernel_version: "6.1",
    gpu_name: "",
    ipv4: "192.0.2.1",
    ipv6: "",
    region: "Tokyo",
    tags: "",
    remark: "",
    public_remark: "",
    mem_total: 8,
    swap_total: 2,
    disk_total: 100,
    version: "1.0.0",
    weight: 0,
    price: 10,
    billing_cycle: 30,
    currency: "CNY",
    expired_at: "2026-12-01T00:00:00Z",
    group: "default",
    traffic_limit: 1000,
    traffic_limit_type: "sum",
    ...patch,
  };
}

describe("node change tracking", () => {
  it("stores a baseline and records changed fields on later observations", () => {
    const baseline = node();
    const initial = recordNodeListChanges(EMPTY_NODE_CHANGE_STORE, [baseline], "2026-10-01T00:00:00Z");
    expect(initial.changes).toEqual({});

    const next = recordNodeListChanges(
      initial,
      [node({ ipv4: "192.0.2.2", os: "Ubuntu", weight: 99 })],
      "2026-10-02T00:00:00Z",
    );

    expect(next.changes["node-a"]).toEqual([{
      changedAt: "2026-10-02T00:00:00Z",
      fields: [
        { field: "os", previous: "Debian", current: "Ubuntu" },
        { field: "ipv4", previous: "192.0.2.1", current: "192.0.2.2" },
      ],
    }]);
    expect(next.snapshots["node-a"]).toEqual(createNodeSnapshot(node({ ipv4: "192.0.2.2", os: "Ubuntu", weight: 99 })));
  });

  it("clears events without losing the current baseline", () => {
    const initial = recordNodeListChanges(EMPTY_NODE_CHANGE_STORE, [node()]);
    const changed = recordNodeListChanges(initial, [node({ region: "Seoul" })]);
    const cleared = clearNodeChangeHistory(changed, "node-a");

    expect(cleared.changes).toEqual({});
    expect(cleared.snapshots["node-a"].region).toBe("Seoul");
  });
});
