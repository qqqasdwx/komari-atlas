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

import { getSettings, updateSettings } from "@/lib/api";
import { EMPTY_ATLAS_SETTINGS, normalizeAtlasSettings } from "@/lib/atlas";
import type {
  AtlasNodeSettings,
  AtlasSettingsV2,
  PingTask,
  SettingsSaveState,
} from "@/types/atlas";
import { useRPC2Call } from "@/contexts/RPC2Context";

interface AtlasSettingsContextValue {
  settings: AtlasSettingsV2;
  pingTasks: PingTask[];
  isLoading: boolean;
  error: string | null;
  saveState: SettingsSaveState;
  updateNodeSettings: (uuid: string, patch: Partial<AtlasNodeSettings>) => void;
}

const AtlasSettingsContext = createContext<AtlasSettingsContextValue | null>(null);

export function AtlasSettingsProvider({ children }: { children: React.ReactNode }) {
  const { callViaHTTP } = useRPC2Call();
  const [settings, setSettings] = useState<AtlasSettingsV2>(EMPTY_ATLAS_SETTINGS);
  const [pingTasks, setPingTasks] = useState<PingTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SettingsSaveState>("idle");
  const saveTimerRef = useRef<number | null>(null);
  const saveRunningRef = useRef(false);
  const queuedSettingsRef = useRef<AtlasSettingsV2 | null>(null);

  const drainSaveQueue = useCallback(async () => {
    if (saveRunningRef.current) return;
    saveRunningRef.current = true;
    let failed = false;

    while (queuedSettingsRef.current) {
      const nextSettings = queuedSettingsRef.current;
      queuedSettingsRef.current = null;
      try {
        await updateSettings({ theme_settings: nextSettings });
        failed = false;
      } catch (saveError) {
        failed = true;
        setError(saveError instanceof Error ? saveError.message : "Failed to save settings");
      }
    }

    saveRunningRef.current = false;
    setSaveState(failed ? "error" : "saved");
  }, []);

  const scheduleSave = useCallback((nextSettings: AtlasSettingsV2) => {
    queuedSettingsRef.current = nextSettings;
    setSaveState("saving");
    setError(null);
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void drainSaveQueue();
    }, 600);
  }, [drainSaveQueue]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    Promise.all([
      getSettings(),
      callViaHTTP<undefined, PingTask[]>("public:getPublicPingTasks"),
    ])
      .then(([rawSettings, tasks]) => {
        if (!active) return;
        setSettings(normalizeAtlasSettings(rawSettings.theme_settings));
        setPingTasks(
          [...(tasks || [])].sort((left, right) =>
            left.weight === right.weight
              ? left.name.localeCompare(right.name)
              : right.weight - left.weight,
          ),
        );
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load settings");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [callViaHTTP]);

  useEffect(() => () => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
  }, []);

  const updateNodeSettings = useCallback((
    uuid: string,
    patch: Partial<AtlasNodeSettings>,
  ) => {
    if (!uuid.trim()) return;
    setSettings((previous) => {
      const current = previous.nodes[uuid] || { cardPingTaskIds: [] };
      const nextNode: AtlasNodeSettings = {
        ...current,
        ...patch,
        cardPingTaskIds: patch.cardPingTaskIds ?? current.cardPingTaskIds,
      };
      if (patch.trafficResetDay === undefined && "trafficResetDay" in patch) {
        delete nextNode.trafficResetDay;
      }

      const next: AtlasSettingsV2 = {
        schema: 2,
        nodes: {
          ...previous.nodes,
          [uuid]: nextNode,
        },
      };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const value = useMemo<AtlasSettingsContextValue>(() => ({
    settings,
    pingTasks,
    isLoading,
    error,
    saveState,
    updateNodeSettings,
  }), [error, isLoading, pingTasks, saveState, settings, updateNodeSettings]);

  return (
    <AtlasSettingsContext.Provider value={value}>
      {children}
    </AtlasSettingsContext.Provider>
  );
}

export function useAtlasSettings() {
  const context = useContext(AtlasSettingsContext);
  if (!context) {
    throw new Error("useAtlasSettings must be used within AtlasSettingsProvider");
  }
  return context;
}
