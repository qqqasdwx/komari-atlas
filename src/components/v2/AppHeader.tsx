"use client";

import { Activity, LogOut, Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AppearanceMenu } from "@/components/v2/AppearanceMenu";
import { AssetSummary } from "@/components/v2/AssetSummary";
import { LanguageMenu } from "@/components/v2/LanguageMenu";
import { Button } from "@/components/ui/button";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { useRPC2 } from "@/contexts/RPC2Context";
import SpaLink from "@/components/SpaLink";

export function AppHeader() {
  const { t } = useTranslation();
  const { publicInfo } = usePublicInfo();
  const { isConnected } = useRPC2();

  return (
    <header className="atlas-header">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <SpaLink href="/" className="flex min-w-0 items-center gap-2.5">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${isConnected ? "bg-emerald-400" : "bg-amber-400"}`} />
          <span className="truncate text-base font-semibold sm:text-lg">
            {publicInfo?.sitename || "Komari"}
          </span>
        </SpaLink>

        <div className="flex items-center gap-0.5">
          <div
            className="mr-1 hidden items-center gap-1.5 text-xs text-muted-foreground md:flex"
            title={isConnected ? t("atlas.connection.live") : t("atlas.connection.polling")}
          >
            {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isConnected ? t("atlas.connection.live") : t("atlas.connection.polling")}
          </div>
          <AssetSummary />
          <AppearanceMenu />
          <LanguageMenu />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => window.location.assign("/api/logout")}
            title={t("atlas.logout")}
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">{t("atlas.logout")}</span>
          </Button>
        </div>
      </div>
      <Activity className="sr-only" />
    </header>
  );
}
