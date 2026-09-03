"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { LiveDataResponse } from "../types/LiveData";
import { useRPC2Call } from "./RPC2Context";

// 创建Context
interface LiveDataContextType {
  live_data: LiveDataResponse | null;
  showCallout: boolean;
}

const LiveDataContext = createContext<LiveDataContextType>({
  live_data: null,
  showCallout: true,
});

// 创建Provider组件
export const LiveDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [live_data, setLiveData] = useState<LiveDataResponse | null>(null);
  const [showCallout, setShowCallout] = useState(false);
  const { call } = useRPC2Call();

  // 采用 RPC2 轮询最新状态，替代 WebSocket
  useEffect(() => {
    // Skip during SSR/SSG
    if (typeof window === 'undefined') return;
    
    let timer: number | undefined;
    let stopped = false;
    let running = false; // 防抖：避免并发请求
    const intervalMs = 2000;

    const fetchLatest = async () => {
      if (running) return; // 如果上次请求还在，跳过
      running = true;
      try {
        // 策略由 RPC2Client 内部实现
        const result: Record<string, any> = await call("common:getNodesLatestStatus");
        // 将返回转换为 LiveDataResponse 结构
        const dataMap: Record<string, any> = {};
        for (const [uuid, v] of Object.entries(result)) {
          const rec = v as any;
          dataMap[uuid] = {
            cpu: { usage: typeof rec.cpu === "number" ? rec.cpu : 0 },
            ram: { used: rec.ram ?? 0 },
            swap: { used: rec.swap ?? 0 },
            disk: { used: rec.disk ?? 0 },
            network: {
              up: rec.net_out ?? 0,
              down: rec.net_in ?? 0,
            },
            connections: {
              tcp: Math.max(0, (rec.connections ?? 0) - (rec.connections_udp ?? 0)),
              udp: rec.connections_udp ?? 0,
            },
            uptime: rec.uptime ?? 0,
            updated_at: rec.time ?? 0,
            online: Boolean(rec.online),
            ping: rec.ping ?? {},
          };
        }

        const live: LiveDataResponse = {
          data: {
            data: dataMap,
          },
        };
        setLiveData(live);
        setShowCallout(true);
      } catch (e) {
        console.error("RPC2 获取最新状态失败:", e);
        setShowCallout(false);
      } finally {
        running = false;
        if (!stopped) {
          timer = window.setTimeout(fetchLatest, intervalMs);
        }
      }
    };

    fetchLatest();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [call]);

  const contextValue = useMemo(
    () => ({ live_data, showCallout }),
    [live_data, showCallout]
  );

  return (
    <LiveDataContext.Provider value={contextValue}>
      {children}
    </LiveDataContext.Provider>
  );
};

export const useLiveData = () => useContext(LiveDataContext);
