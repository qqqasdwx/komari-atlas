"use client";

import React from "react";
import { useRPC2Call } from "./RPC2Context";
import type { AtlasNode } from "@/types/atlas";

export type NodeBasicInfo = AtlasNode;

interface NodeListContextType {
  nodeList: NodeBasicInfo[] | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const NodeListContext = React.createContext<NodeListContextType | undefined>(
  undefined
);

function normalizeTrafficLimit(value: unknown): number {
  const bytes = Number(value);
  return Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
}

export const NodeListProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [nodeList, setNodeList] = React.useState<NodeBasicInfo[] | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const { call } = useRPC2Call();

  const refresh = React.useCallback(() => {
    setError(null);
    // 通过 RPC2 获取节点基本信息
    call<{ uuid?: string }, Record<string, any>>("common:getNodes")
      .then((result) => {
        if (!result || typeof result !== "object") {
          setNodeList([]);
          return;
        }
        // 将 { [uuid]: Client } 转换为 NodeBasicInfo[]
        const list: NodeBasicInfo[] = Object.values(result).map((n: any) => ({
          uuid: String(n.uuid ?? ""),
          name: String(n.name ?? n.uuid ?? ""),
          cpu_name: String(n.cpu_name ?? ""),
          virtualization: String(n.virtualization ?? ""),
          arch: String(n.arch ?? ""),
          cpu_cores: Number(n.cpu_cores) || 0,
          os: String(n.os ?? ""),
          kernel_version: String(n.kernel_version ?? ""),
          gpu_name: String(n.gpu_name ?? ""),
          region: String(n.region ?? ""),
          mem_total: Number(n.mem_total) || 0,
          swap_total: Number(n.swap_total) || 0,
          disk_total: Number(n.disk_total) || 0,
          version: String(n.version ?? ""),
          weight: n.weight ?? 0,
          price: n.price ?? 0,
          billing_cycle: n.billing_cycle ?? 0,
          currency: String(n.currency ?? ""),
          group: String(n.group ?? ""),
          traffic_limit: normalizeTrafficLimit(n.traffic_limit),
          traffic_limit_type: n.traffic_limit_type ?? "sum",
          expired_at: String(n.expired_at ?? ""),
          ipv4: String(n.ipv4 ?? ""),
          ipv6: String(n.ipv6 ?? ""),
          tags: String(n.tags ?? ""),
          remark: String(n.remark ?? ""),
          public_remark: String(n.public_remark ?? ""),
        }));
        setNodeList(list.sort((left, right) => right.weight - left.weight));
      })
      .catch((err: any) => {
        setError(err?.message || "An error occurred while fetching data");
        setNodeList([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [call]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const contextValue = React.useMemo(
    () => ({ nodeList, isLoading, error, refresh }),
    [nodeList, isLoading, error, refresh]
  );

  return (
    <NodeListContext.Provider value={contextValue}>
      {children}
    </NodeListContext.Provider>
  );
};

export const useNodeList = () => {
  const context = React.useContext(NodeListContext);
  if (!context) {
    throw new Error("useNodeList must be used within a NodeListProvider");
  }
  return context;
};
