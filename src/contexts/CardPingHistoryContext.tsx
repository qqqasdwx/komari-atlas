"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAtlasSettings } from "@/contexts/AtlasSettingsContext";
import { useNodeList } from "@/contexts/NodeListContext";
import { useRPC2Call } from "@/contexts/RPC2Context";
import { resolveCardPingTaskIds } from "@/lib/atlas";
import { buildCardPingHistories } from "@/lib/pingHistory";
import type { CardPingHistory, MetricsResponse } from "@/types/atlas";

const REFRESH_INTERVAL_MS = 60 * 1000;
const PING_WINDOW_HOURS = 24;
const PING_BUCKET_COUNT = 24;

interface CardPingHistoryContextValue {
  historiesByKey: Record<string, CardPingHistory>;
}

const CardPingHistoryContext = createContext<CardPingHistoryContextValue | null>(null);

export function CardPingHistoryProvider({ children }: { children: React.ReactNode }) {
  const { settings, pingTasks } = useAtlasSettings();
  const { nodeList } = useNodeList();
  const { callViaHTTP } = useRPC2Call();
  const [historiesByKey, setHistoriesByKey] = useState<Record<string, CardPingHistory>>({});

  const queries = useMemo(() => {
    const entitiesByTask = new Map<number, Set<string>>();
    for (const node of nodeList || []) {
      const taskIds = resolveCardPingTaskIds(settings.nodes[node.uuid], pingTasks, node.uuid);
      for (const taskId of taskIds) {
        const entityIds = entitiesByTask.get(taskId) || new Set<string>();
        entityIds.add(node.uuid);
        entitiesByTask.set(taskId, entityIds);
      }
    }
    return [...entitiesByTask]
      .sort(([left], [right]) => left - right)
      .map(([taskId, entityIds]) => ({ taskId, entityIds: [...entityIds].sort() }));
  }, [nodeList, pingTasks, settings.nodes]);

  useEffect(() => {
    if (queries.length === 0) {
      setHistoriesByKey({});
      return;
    }

    let active = true;
    let running = false;

    const refresh = async () => {
      if (running) return;
      running = true;
      try {
        const responses = await Promise.all(queries.map(({ taskId, entityIds }) =>
          callViaHTTP<Record<string, unknown>, MetricsResponse>(
            "public:queryMetrics",
            {
              metric_keys: ["ping.latency_ms", "ping.loss"],
              entity_ids: entityIds,
              tags: { task_id: String(taskId) },
              hours: PING_WINDOW_HOURS,
              aggregation: "avg",
              max_points: PING_BUCKET_COUNT,
            },
            { timeout: 30_000 },
          ),
        ));
        if (!active) return;
        setHistoriesByKey(Object.assign(
          {},
          ...responses.map((response) => buildCardPingHistories(response, PING_BUCKET_COUNT)),
        ));
      } catch (error) {
        console.error("Failed to load 24-hour Ping history:", error);
        if (active) setHistoriesByKey({});
      } finally {
        running = false;
      }
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [callViaHTTP, queries]);

  const value = useMemo(() => ({ historiesByKey }), [historiesByKey]);

  return (
    <CardPingHistoryContext.Provider value={value}>
      {children}
    </CardPingHistoryContext.Provider>
  );
}

export function useCardPingHistory() {
  const context = useContext(CardPingHistoryContext);
  if (!context) {
    throw new Error("useCardPingHistory must be used within CardPingHistoryProvider");
  }
  return context;
}
