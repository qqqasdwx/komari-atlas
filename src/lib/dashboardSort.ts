import { percentage } from "./atlas";
import { resolveExpiryTimestamp } from "./expiry";
import type { AtlasNode } from "../types/atlas";
import type { LiveRecord } from "../types/LiveData";

export type DashboardSortKey =
  | "default"
  | "cpu"
  | "memory"
  | "disk"
  | "tcp"
  | "upload"
  | "download"
  | "monthlyCost"
  | "expiry";
export type DashboardSortDirection = "asc" | "desc";

type MonthlyCostMap = Record<string, { monthlyCost: number | null } | undefined>;
type LiveDataMap = Record<string, LiveRecord | undefined>;

function finiteValue(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sortValue(
  node: AtlasNode,
  live: LiveDataMap,
  monthlyCosts: MonthlyCostMap,
  key: Exclude<DashboardSortKey, "default">,
): number | null {
  const snapshot = live[node.uuid];
  const current = snapshot?.online ? snapshot : undefined;

  switch (key) {
    case "cpu":
      return finiteValue(current?.cpu.usage);
    case "memory":
      return current && node.mem_total > 0
        ? finiteValue(percentage(current.ram.used, node.mem_total))
        : null;
    case "disk":
      return current && node.disk_total > 0
        ? finiteValue(percentage(current.disk.used, node.disk_total))
        : null;
    case "tcp":
      return finiteValue(current?.connections.tcp);
    case "upload":
      return finiteValue(current?.network.up);
    case "download":
      return finiteValue(current?.network.down);
    case "monthlyCost":
      return finiteValue(monthlyCosts[node.uuid]?.monthlyCost);
    case "expiry":
      return resolveExpiryTimestamp(node.expired_at);
  }
}

export function sortDashboardNodeIds(
  nodes: AtlasNode[],
  live: LiveDataMap,
  monthlyCosts: MonthlyCostMap,
  key: DashboardSortKey,
  direction: DashboardSortDirection,
): string[] {
  if (key === "default") return nodes.map((node) => node.uuid);

  const directionFactor = direction === "asc" ? 1 : -1;
  return nodes
    .map((node, index) => ({
      uuid: node.uuid,
      index,
      value: sortValue(node, live, monthlyCosts, key),
    }))
    .sort((left, right) => {
      if (left.value === null && right.value === null) return left.index - right.index;
      if (left.value === null) return 1;
      if (right.value === null) return -1;
      if (left.value === right.value) return left.index - right.index;
      return (left.value - right.value) * directionFactor;
    })
    .map((item) => item.uuid);
}
