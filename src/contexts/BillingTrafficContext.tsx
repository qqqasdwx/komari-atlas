"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAtlasSettings } from "@/contexts/AtlasSettingsContext";
import { useNodeList } from "@/contexts/NodeListContext";
import { useRPC2Call } from "@/contexts/RPC2Context";
import {
  buildDailyTrafficSeries,
  getTrafficUsed,
  resolveBillingWindow,
  splitBillingMetricWindow,
  sumMetricSeries,
} from "@/lib/atlas";
import type { BillingTrafficState, MetricsResponse } from "@/types/atlas";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const REQUIRED_RETENTION_DAYS = 35;

interface BillingTrafficContextValue {
  trafficByNode: Record<string, BillingTrafficState>;
  refresh: () => Promise<void>;
}

const BillingTrafficContext = createContext<BillingTrafficContextValue | null>(null);

export function BillingTrafficProvider({ children }: { children: React.ReactNode }) {
  const { nodeList } = useNodeList();
  const { settings } = useAtlasSettings();
  const { callViaHTTP } = useRPC2Call();
  const [trafficByNode, setTrafficByNode] = useState<Record<string, BillingTrafficState>>({});

  const refresh = useCallback(async () => {
    const nodes = nodeList || [];
    const now = new Date();
    const nextState: Record<string, BillingTrafficState> = {};
    const groups = new Map<string, {
      start: Date;
      nodeIds: string[];
      windows: Record<string, { start: Date; end: Date; resetDay: number }>;
    }>();

    for (const node of nodes) {
      const window = resolveBillingWindow(node, settings.nodes[node.uuid], now);
      if (!window) {
        nextState[node.uuid] = { status: "unconfigured" };
        continue;
      }

      nextState[node.uuid] = { status: "loading", resetDay: window.resetDay };
      const key = window.start.toISOString();
      const group = groups.get(key) || { start: window.start, nodeIds: [], windows: {} };
      group.nodeIds.push(node.uuid);
      group.windows[node.uuid] = {
        start: window.start,
        end: window.end,
        resetDay: window.resetDay,
      };
      groups.set(key, group);
    }

    setTrafficByNode((previous) => {
      const merged = { ...nextState };
      for (const uuid of Object.keys(merged)) {
        if (merged[uuid].status === "loading" && previous[uuid]?.status === "ready") {
          merged[uuid] = previous[uuid];
        }
      }
      return merged;
    });

    await Promise.all(Array.from(groups.values()).map(async (group) => {
      try {
        const queryWindows = splitBillingMetricWindow(group.start, now);
        const responses = await Promise.all(queryWindows.map((window) =>
          callViaHTTP<Record<string, unknown>, MetricsResponse>(
            "public:queryMetrics",
            {
              metric_keys: ["traffic.up", "traffic.down"],
              entity_ids: group.nodeIds,
              start: window.start.toISOString(),
              end: window.end.toISOString(),
              aggregation: "sum",
              max_points: 500,
            },
          ),
        ));
        const series = responses.flatMap((item) => item.series || []);
        const response: MetricsResponse = {
          start: group.start.toISOString(),
          end: now.toISOString(),
          series,
          count: series.length,
        };
        const finiteRetention = response.series
          .filter((series) => series.metric_key === "traffic.up" || series.metric_key === "traffic.down")
          .map((series) => series.retention_days)
          .filter((days): days is number => typeof days === "number" && days > 0);
        const minimumRetention = finiteRetention.length > 0 ? Math.min(...finiteRetention) : null;
        if (minimumRetention !== null && minimumRetention < REQUIRED_RETENTION_DAYS) {
          throw new Error(
            `Metric retention is ${minimumRetention} days; billing traffic requires at least ${REQUIRED_RETENTION_DAYS} days`,
          );
        }
        const upByNode = sumMetricSeries(response, "traffic.up");
        const downByNode = sumMetricSeries(response, "traffic.down");

        setTrafficByNode((previous) => {
          const updated = { ...previous };
          for (const uuid of group.nodeIds) {
            const node = nodes.find((item) => item.uuid === uuid);
            const window = group.windows[uuid];
            if (!node || !window) continue;
            const up = upByNode[uuid] || 0;
            const down = downByNode[uuid] || 0;
            updated[uuid] = {
              status: "ready",
              up,
              down,
              used: getTrafficUsed(up, down, node.traffic_limit_type),
              resetDay: window.resetDay,
              start: window.start.toISOString(),
              end: window.end.toISOString(),
              daily: buildDailyTrafficSeries(response, uuid, window.start, now),
            };
          }
          return updated;
        });
      } catch (queryError) {
        const message = queryError instanceof Error ? queryError.message : "Traffic query failed";
        setTrafficByNode((previous) => {
          const updated = { ...previous };
          for (const uuid of group.nodeIds) {
            updated[uuid] = {
              status: "error",
              message,
              resetDay: group.windows[uuid]?.resetDay,
            };
          }
          return updated;
        });
      }
    }));
  }, [callViaHTTP, nodeList, settings.nodes]);

  useEffect(() => {
    if (!nodeList) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [nodeList, refresh]);

  const value = useMemo(() => ({ trafficByNode, refresh }), [refresh, trafficByNode]);

  return (
    <BillingTrafficContext.Provider value={value}>
      {children}
    </BillingTrafficContext.Provider>
  );
}

export function useBillingTraffic() {
  const context = useContext(BillingTrafficContext);
  if (!context) {
    throw new Error("useBillingTraffic must be used within BillingTrafficProvider");
  }
  return context;
}
