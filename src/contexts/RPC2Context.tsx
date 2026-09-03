"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { RPC2Client } from "../lib/rpc2";

interface RPC2ContextType {
  client: RPC2Client;
  isConnected: boolean;
}

const RPC2Context = createContext<RPC2ContextType | undefined>(undefined);

// 模块级单例，避免在开发环境 StrictMode 或路由切换时产生多个连接
let __rpc2_singleton__: RPC2Client | null = null;
let __rpc2_refcount = 0;

export const RPC2Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 创建/复用客户端实例，默认启用自动连接
  const [client] = useState(() => {
    if (!__rpc2_singleton__) {
      __rpc2_singleton__ = new RPC2Client("/api/rpc2", { autoConnect: true });
    }
    return __rpc2_singleton__;
  });
  const [connectionState, setConnectionState] = useState(client.state);

  useEffect(() => {
    __rpc2_refcount++;
    // 设置事件监听器
    client.setEventListeners({
      onConnect: () => {
        setConnectionState(client.state);
      },
      onDisconnect: () => {
        setConnectionState(client.state);
      },
      onError: () => {
        setConnectionState(client.state);
      },
      onReconnecting: () => {
        setConnectionState(client.state);
      },
    });

    // 清理函数
    return () => {
      __rpc2_refcount = Math.max(0, __rpc2_refcount - 1);
      // 只有在最后一个 Provider 卸载时才断开连接
      if (__rpc2_refcount === 0) {
        client.disconnect();
      }
    };
  }, [client]);

  const isConnected = connectionState === "connected";

  return (
    <RPC2Context.Provider
      value={{
        client,
        isConnected,
      }}
    >
      {children}
    </RPC2Context.Provider>
  );
};

export const useRPC2 = (): RPC2ContextType => {
  const context = useContext(RPC2Context);
  if (context === undefined) {
    throw new Error("useRPC2 必须在 RPC2Provider 内使用");
  }
  return context;
};

// 自定义 Hook 用于调用 RPC 方法
export const useRPC2Call = () => {
  const { client, isConnected } = useRPC2();

  // 保持稳定引用，避免消费者重复触发副作用
  const call = useCallback(<TParams = any, TResult = any>(
    method: string,
    params?: TParams,
    options?: any
  ): Promise<TResult> => client.call(method, params, options), [client]);

  const callViaHTTP = useCallback(<TParams = any, TResult = any>(
    method: string,
    params?: TParams,
    options?: any
  ): Promise<TResult> => client.callViaHTTP(method, params, options), [client]);

  return {
    call,
    callViaHTTP,
    isConnected,
  };
}
