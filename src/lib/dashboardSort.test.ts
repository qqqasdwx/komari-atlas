import { describe, expect, it } from "vitest";

import {
  sortDashboardNodeIds,
  type DashboardSortDirection,
  type DashboardSortKey,
} from "./dashboardSort";
import type { AtlasNode } from "@/types/atlas";
import type { LiveRecord } from "@/types/LiveData";

function node(uuid: string, patch: Partial<AtlasNode> = {}): AtlasNode {
  return {
    uuid,
    name: uuid,
    cpu_name: "",
    cpu_cores: 1,
    virtualization: "",
    arch: "amd64",
    os: "Linux",
    kernel_version: "",
    gpu_name: "",
    ipv4: "",
    ipv6: "",
    region: "",
    remark: "",
    public_remark: "",
    mem_total: 100,
    swap_total: 0,
    disk_total: 100,
    version: "",
    weight: 0,
    price: 0,
    billing_cycle: 0,
    currency: "CNY",
    expired_at: "",
    group: "",
    traffic_limit: 0,
    traffic_limit_type: "sum",
    ...patch,
  };
}

function live(patch: {
  cpu?: number;
  memory?: number;
  disk?: number;
  tcp?: number;
  upload?: number;
  download?: number;
} = {}): LiveRecord {
  return {
    cpu: { usage: patch.cpu ?? 0 },
    ram: { used: patch.memory ?? 0 },
    swap: { used: 0 },
    disk: { used: patch.disk ?? 0 },
    network: {
      up: patch.upload ?? 0,
      down: patch.download ?? 0,
    },
    connections: { tcp: patch.tcp ?? 0, udp: 0 },
    uptime: 0,
    updated_at: "",
    online: true,
  };
}

describe("sortDashboardNodeIds", () => {
  const nodes = [node("a"), node("b"), node("missing")];
  const liveByNode = {
    a: live({ cpu: 70, memory: 60, disk: 30, tcp: 8, upload: 200, download: 100 }),
    b: live({ cpu: 20, memory: 25, disk: 80, tcp: 3, upload: 100, download: 300 }),
  };
  const costs = {
    a: { monthlyCost: 30 },
    b: { monthlyCost: 10 },
  };

  function sorted(key: DashboardSortKey, direction: DashboardSortDirection = "asc") {
    return sortDashboardNodeIds(nodes, liveByNode, costs, key, direction);
  }

  it("sorts live and asset metrics in either direction", () => {
    expect(sorted("cpu")).toEqual(["b", "a", "missing"]);
    expect(sorted("memory", "desc")).toEqual(["a", "b", "missing"]);
    expect(sorted("disk")).toEqual(["a", "b", "missing"]);
    expect(sorted("tcp", "desc")).toEqual(["a", "b", "missing"]);
    expect(sorted("upload")).toEqual(["b", "a", "missing"]);
    expect(sorted("download", "desc")).toEqual(["b", "a", "missing"]);
    expect(sorted("monthlyCost")).toEqual(["b", "a", "missing"]);
  });

  it("sorts expiry timestamps while keeping unset values last", () => {
    const expiryNodes = [
      node("long", { expired_at: "2226-09-02T00:00:00Z" }),
      node("soon", { expired_at: "2026-10-01T00:00:00Z" }),
      node("unset"),
      node("expired", { expired_at: "2026-01-01T00:00:00Z" }),
    ];

    expect(sortDashboardNodeIds(expiryNodes, {}, {}, "expiry", "asc")).toEqual([
      "expired",
      "soon",
      "long",
      "unset",
    ]);
    expect(sortDashboardNodeIds(expiryNodes, {}, {}, "expiry", "desc")).toEqual([
      "long",
      "soon",
      "expired",
      "unset",
    ]);
  });

  it("keeps the original order for equal values and default sorting", () => {
    const equalLive = {
      a: live({ cpu: 50 }),
      b: live({ cpu: 50 }),
      missing: live({ cpu: 50 }),
    };

    expect(sortDashboardNodeIds(nodes, equalLive, {}, "cpu", "desc")).toEqual([
      "a",
      "b",
      "missing",
    ]);
    expect(sorted("default", "desc")).toEqual(["a", "b", "missing"]);
  });

  it("treats cached metrics from offline nodes as missing", () => {
    const offline = live({ cpu: 100 });
    offline.online = false;

    expect(sortDashboardNodeIds(
      [node("offline"), node("online")],
      { offline, online: live({ cpu: 50 }) },
      {},
      "cpu",
      "desc",
    )).toEqual(["online", "offline"]);
  });

  it("returns a snapshot that is unaffected by later live updates", () => {
    const mutableLive = {
      a: live({ cpu: 10 }),
      b: live({ cpu: 90 }),
    };
    const snapshot = sortDashboardNodeIds(nodes, mutableLive, {}, "cpu", "desc");

    mutableLive.a.cpu.usage = 100;
    mutableLive.b.cpu.usage = 0;

    expect(snapshot).toEqual(["b", "a", "missing"]);
    expect(sortDashboardNodeIds(nodes, mutableLive, {}, "cpu", "desc")).toEqual([
      "a",
      "b",
      "missing",
    ]);
  });
});
