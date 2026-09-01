"use client";

import { AlertCircle, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { LoginScreen } from "@/components/v2/LoginScreen";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/contexts/AccountContext";
import { AtlasSettingsProvider } from "@/contexts/AtlasSettingsContext";
import { BillingTrafficProvider } from "@/contexts/BillingTrafficContext";
import { LiveDataProvider } from "@/contexts/LiveDataContext";
import { NodeListProvider } from "@/contexts/NodeListContext";
import { RPC2Provider, useRPC2Call } from "@/contexts/RPC2Context";
import { compareVersions } from "@/lib/atlas";

const MINIMUM_KOMARI_VERSION = "1.4.3";

function FullScreenState({ error, retry }: { error?: string; retry?: () => void }) {
  const { t } = useTranslation();
  return (
    <main className="atlas-state-screen">
      <div className="atlas-glass-panel flex max-w-md flex-col items-center gap-4 p-6 text-center">
        {error ? <AlertCircle className="h-6 w-6 text-red-400" /> : <LoaderCircle className="h-6 w-6 animate-spin" />}
        <p className="text-sm">{error || t("atlas.loading")}</p>
        {retry && <Button onClick={retry}>{t("atlas.retry")}</Button>}
      </div>
    </main>
  );
}

function VersionGate({ children }: { children: React.ReactNode }) {
  const { callViaHTTP } = useRPC2Call();
  const { t } = useTranslation();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ loading: boolean; error: string | null }>({
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    setState({ loading: true, error: null });
    callViaHTTP<undefined, { version: string }>("public:getVersion")
      .then((result) => {
        if (!active) return;
        if (compareVersions(result.version, MINIMUM_KOMARI_VERSION) < 0) {
          setState({
            loading: false,
            error: t("atlas.unsupportedVersion", {
              current: result.version,
              minimum: MINIMUM_KOMARI_VERSION,
            }),
          });
          return;
        }
        setState({ loading: false, error: null });
      })
      .catch((versionError) => {
        if (!active) return;
        setState({
          loading: false,
          error: versionError instanceof Error ? versionError.message : t("atlas.versionCheckFailed"),
        });
      });
    return () => {
      active = false;
    };
  }, [attempt, callViaHTTP, t]);

  if (state.loading) return <FullScreenState />;
  if (state.error) return <FullScreenState error={state.error} retry={() => setAttempt((value) => value + 1)} />;
  return children;
}

function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  return (
    <RPC2Provider>
      <VersionGate>
        <NodeListProvider>
          <LiveDataProvider>
            <AtlasSettingsProvider>
              <BillingTrafficProvider>
                {children}
              </BillingTrafficProvider>
            </AtlasSettingsProvider>
          </LiveDataProvider>
        </NodeListProvider>
      </VersionGate>
    </RPC2Provider>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { account, loading, error, refresh } = useAccount();

  if (loading) return <FullScreenState />;
  if (error || !account) {
    return <FullScreenState error={error?.message || "Unable to load account"} retry={() => void refresh()} />;
  }
  if (!account.logged_in) return <LoginScreen />;
  return <AuthenticatedProviders>{children}</AuthenticatedProviders>;
}
