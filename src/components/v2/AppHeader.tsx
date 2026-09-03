"use client";

import { Activity, Eye, EyeOff, LogOut, Settings, Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import SpaLink from "@/components/SpaLink";
import { AppearanceMenu } from "@/components/v2/AppearanceMenu";
import { AssetSummary } from "@/components/v2/AssetSummary";
import { HeaderTooltip, HEADER_TOOL_BUTTON_CLASS } from "@/components/v2/HeaderTooltip";
import { LanguageMenu } from "@/components/v2/LanguageMenu";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { useRPC2 } from "@/contexts/RPC2Context";
import { cn } from "@/lib/utils";

export function AppHeader({
  privacyMode,
  onPrivacyModeChange,
}: {
  privacyMode: boolean;
  onPrivacyModeChange: (enabled: boolean) => void;
}) {
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

        <TooltipProvider disableHoverableContent delayDuration={200} skipDelayDuration={100}>
          <div className="flex items-center gap-0.5">
            <div
              className="mr-1 hidden items-center gap-1.5 text-xs text-muted-foreground md:flex"
              title={isConnected ? t("atlas.connection.live") : t("atlas.connection.polling")}
            >
              {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {isConnected ? t("atlas.connection.live") : t("atlas.connection.polling")}
            </div>
            <AssetSummary />
            <HeaderTooltip label={t("atlas.admin")}>
              <Button asChild variant="ghost" size="icon" className={HEADER_TOOL_BUTTON_CLASS}>
                <a href="/admin" aria-label={t("atlas.admin")}>
                  <Settings className="h-4 w-4" />
                  <span className="sr-only">{t("atlas.admin")}</span>
                </a>
              </Button>
            </HeaderTooltip>
            <AppearanceMenu />
            <LanguageMenu />
            <HeaderTooltip label={t(privacyMode ? "atlas.privacy.disable" : "atlas.privacy.enable")}>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  HEADER_TOOL_BUTTON_CLASS,
                  privacyMode && "bg-[var(--accent-6)] text-[var(--accent-12)]",
                )}
                onClick={() => onPrivacyModeChange(!privacyMode)}
                aria-label={t(privacyMode ? "atlas.privacy.disable" : "atlas.privacy.enable")}
                aria-pressed={privacyMode}
              >
                {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </HeaderTooltip>
            <HeaderTooltip label={t("atlas.logout")}>
              <Button
                variant="ghost"
                size="icon"
                className={HEADER_TOOL_BUTTON_CLASS}
                onClick={() => window.location.assign("/api/logout")}
                aria-label={t("atlas.logout")}
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">{t("atlas.logout")}</span>
              </Button>
            </HeaderTooltip>
          </div>
        </TooltipProvider>
      </div>
      <Activity className="sr-only" />
    </header>
  );
}
