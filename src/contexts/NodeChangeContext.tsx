"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNodeList } from "@/contexts/NodeListContext";
import { clearNodeChangeHistory, normalizeNodeChangeStore, recordNodeListChanges } from "@/lib/nodeChanges";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import type { NodeChangeEvent } from "@/lib/nodeChanges";

interface NodeChangeContextValue {
  changesByNode: Record<string, NodeChangeEvent[]>;
  clearNodeChanges: (uuid: string) => void;
}

const NodeChangeContext = createContext<NodeChangeContextValue | null>(null);

export function NodeChangeProvider({ children }: { children: React.ReactNode }) {
  const { nodeList } = useNodeList();
  const [store, setStore] = useState(() => normalizeNodeChangeStore(null));
  const storeRef = useRef(store);
  const loadedRef = useRef(false);

  const persist = useCallback((nextStore: typeof store) => {
    storeRef.current = nextStore;
    setStore(nextStore);
    try {
      window.localStorage.setItem(STORAGE_KEYS.nodeChanges, JSON.stringify(nextStore));
    } catch (error) {
      console.warn("Unable to persist node change history:", error);
    }
  }, []);

  useEffect(() => {
    let loaded = normalizeNodeChangeStore(null);
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.nodeChanges);
      loaded = normalizeNodeChangeStore(raw ? JSON.parse(raw) : null);
    } catch (error) {
      console.warn("Unable to load node change history:", error);
    }
    storeRef.current = loaded;
    setStore(loaded);
    loadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!loadedRef.current || !nodeList) return;
    const nextStore = recordNodeListChanges(storeRef.current, nodeList, new Date().toISOString());
    if (JSON.stringify(nextStore) === JSON.stringify(storeRef.current)) return;
    persist(nextStore);
  }, [nodeList, persist]);

  const clearNodeChanges = useCallback((uuid: string) => {
    const nextStore = clearNodeChangeHistory(storeRef.current, uuid);
    if (nextStore === storeRef.current) return;
    persist(nextStore);
  }, [persist]);

  const value = useMemo(() => ({
    changesByNode: store.changes,
    clearNodeChanges,
  }), [clearNodeChanges, store.changes]);

  return (
    <NodeChangeContext.Provider value={value}>
      {children}
    </NodeChangeContext.Provider>
  );
}

export function useNodeChanges() {
  const context = useContext(NodeChangeContext);
  if (!context) {
    throw new Error("useNodeChanges must be used within NodeChangeProvider");
  }
  return context;
}
