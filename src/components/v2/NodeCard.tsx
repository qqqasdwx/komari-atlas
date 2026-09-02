"use client";

import { ArrowDown, ArrowUp, CalendarDays, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";

import SpaLink from "@/components/SpaLink";
import { PingHistoryStrip } from "@/components/v2/PingHistoryStrip";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAssetValues } from "@/contexts/AssetValueContext";
import { useAtlasSettings } from "@/contexts/AtlasSettingsContext";
import { useBillingTraffic } from "@/contexts/BillingTrafficContext";
import { useCardPingHistory } from "@/contexts/CardPingHistoryContext";
import {
  percentage,
  resolveCardPingTaskIds,
  resourceTone,
  type HealthTone,
} from "@/lib/atlas";
import { cardPingHistoryKey } from "@/lib/pingHistory";
import { cn } from "@/lib/utils";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { Record as LiveRecord } from "@/types/LiveData";
import { formatBytes } from "@/utils/unitHelper";

const toneClass: Record<HealthTone, string> = {
  neutral: "text-muted-foreground",
  good: "text-emerald-500",
  warning: "text-amber-500",
  danger: "text-red-500",
};

function MetricBar({ value, tone }: { value: number; tone: HealthTone }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-muted/70">
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500",
          tone === "danger" ? "bg-red-500" : tone === "warning" ? "bg-amber-500" : "bg-emerald-500",
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function ResourceBar({
  label,
  value,
  tone,
  detail,
}: {
  label: string;
  value: number | null;
  tone: HealthTone;
  detail?: string;
}) {
  return (
    <section className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-medium tabular-nums", toneClass[tone])}>
          {value === null ? "--" : `${value.toFixed(1)}%`}
        </span>
      </div>
      <MetricBar value={value ?? 0} tone={tone} />
      {detail && (
        <div className="text-right text-[10px] text-muted-foreground">{detail}</div>
      )}
    </section>
  );
}

export function NodeCard({
  node,
  live,
}: {
  node: NodeBasicInfo;
  live: LiveRecord | undefined;
}) {
  const { t, i18n } = useTranslation();
  const { cnyByNode, ratesUnavailable } = useAssetValues();
  const { settings, pingTasks, updateNodeSettings } = useAtlasSettings();
  const { trafficByNode } = useBillingTraffic();
  const { historiesByKey } = useCardPingHistory();
  const online = Boolean(live?.online);
  const cpu = live ? live.cpu.usage : null;
  const ram = live && node.mem_total > 0
    ? percentage(live.ram.used, node.mem_total)
    : null;
  const swap = live && node.swap_total > 0
    ? percentage(live.swap.used, node.swap_total)
    : null;
  const disk = live && node.disk_total > 0
    ? percentage(live.disk.used, node.disk_total)
    : null;
  const cpuTone = cpu === null ? "neutral" : resourceTone(cpu, 75, 90);
  const ramTone = ram === null ? "neutral" : resourceTone(ram, 75, 90);
  const swapTone = swap === null ? "neutral" : resourceTone(swap, 75, 90);
  const diskTone = disk === null ? "neutral" : resourceTone(disk, 80, 90);
  const locale = i18n.resolvedLanguage || i18n.language;
  const assetValue = cnyByNode[node.uuid];
  const formatCny = (value: number | null | undefined) => value == null
    ? "--"
    : new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "CNY",
        currencyDisplay: "symbol",
      }).format(value);
  const monthlyCost = formatCny(assetValue?.monthlyCost);
  const remainingValue = formatCny(assetValue?.remainingValue);
  const expiryDate = node.expired_at && Number.isFinite(new Date(node.expired_at).getTime())
    ? new Date(node.expired_at).toLocaleDateString(locale)
    : "--";
  const selectedPingIds = resolveCardPingTaskIds(
    settings.nodes[node.uuid],
    pingTasks,
    node.uuid,
  );
  const selectedPing = selectedPingIds.map((taskId) => ({
    taskId,
    name: pingTasks.find((task) => task.id === taskId)?.name
      || t("atlas.detail.pingTask", { id: taskId }),
    history: historiesByKey[cardPingHistoryKey(node.uuid, taskId) || ""],
  }));
  const traffic = trafficByNode[node.uuid] || { status: "loading" as const };
  const trafficPercent = traffic.status === "ready" && node.traffic_limit > 0
    ? percentage(traffic.used, node.traffic_limit)
    : 0;
  const trafficTone = resourceTone(trafficPercent, 80, 95);
  const trafficResetDay = traffic.status === "unconfigured" ? undefined : traffic.resetDay;
  const movePingTask = (taskId: number, offset: -1 | 1) => {
    const currentIndex = selectedPingIds.indexOf(taskId);
    const targetIndex = currentIndex + offset;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= selectedPingIds.length) return;

    const reorderedIds = [...selectedPingIds];
    [reorderedIds[currentIndex], reorderedIds[targetIndex]] = [
      reorderedIds[targetIndex],
      reorderedIds[currentIndex],
    ];
    updateNodeSettings(node.uuid, { cardPingTaskIds: reorderedIds });
  };

  return (
    <Card className="atlas-node-card relative h-full overflow-hidden border-border/60 p-0 transition duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-lg focus-within:ring-2 focus-within:ring-primary">
      <SpaLink
        href={`/instance/${node.uuid}`}
        className="absolute inset-0 z-20 rounded-[inherit] focus-visible:outline-none"
        aria-label={node.name}
      />
      <div>
        <div className="flex items-start justify-between gap-3 border-b border-border/55 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", online ? "bg-emerald-400" : "bg-red-500")} />
              <h2 className="truncate text-sm font-semibold">{node.name}</h2>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              {node.region && <span>{node.region}</span>}
              {node.os && <span className="truncate">{node.os}</span>}
            </div>
          </div>
          <span className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
            online
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
              : "border-red-500/30 bg-red-500/10 text-red-500",
          )}>
            {online ? t("atlas.status.online") : t("atlas.status.offline")}
          </span>
        </div>

        <div className="space-y-4 p-4">
          <div className="space-y-3">
            <ResourceBar label="CPU" value={cpu} tone={cpuTone} />
            <ResourceBar
              label={t("atlas.metrics.memory")}
              value={ram}
              tone={ramTone}
              detail={`${live ? formatBytes(live.ram.used) : "--"} / ${formatBytes(node.mem_total)}`}
            />
            <ResourceBar
              label={t("atlas.metrics.disk")}
              value={disk}
              tone={diskTone}
              detail={`${live ? formatBytes(live.disk.used) : "--"} / ${formatBytes(node.disk_total)}`}
            />
            <ResourceBar
              label={t("atlas.metrics.swap")}
              value={swap}
              tone={swapTone}
              detail={`${live ? formatBytes(live.swap.used) : "--"} / ${formatBytes(node.swap_total)}`}
            />
          </div>

          <section className="grid grid-cols-2 gap-2 rounded-md border border-border/50 bg-background/25 p-2.5 text-xs">
            <div>
              <div className="flex items-center gap-1 text-muted-foreground"><ArrowUp className="h-3 w-3" />{t("atlas.metrics.upload")}</div>
              <div className="mt-1 font-semibold tabular-nums">{live ? `${formatBytes(live.network.up)}/s` : "--"}</div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-muted-foreground"><ArrowDown className="h-3 w-3" />{t("atlas.metrics.download")}</div>
              <div className="mt-1 font-semibold tabular-nums">{live ? `${formatBytes(live.network.down)}/s` : "--"}</div>
            </div>
          </section>

          <section className="space-y-1.5">
            <div className="flex items-start justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                {t("atlas.traffic.billingUsage")}
                {trafficResetDay && (
                  <span className="mt-0.5 block text-[10px]">
                    {t("atlas.traffic.resetOnDay", { day: trafficResetDay })}
                  </span>
                )}
              </span>
              {traffic.status === "ready" && (
                <span className={cn("font-medium tabular-nums", toneClass[trafficTone])}>
                  {formatBytes(traffic.used)}{node.traffic_limit > 0 ? ` / ${formatBytes(node.traffic_limit)}` : " / ∞"}
                </span>
              )}
            </div>
            {traffic.status === "ready" ? (
              <>
                {node.traffic_limit > 0 && <MetricBar value={trafficPercent} tone={trafficTone} />}
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>↑ {formatBytes(traffic.up)}</span>
                  <span>↓ {formatBytes(traffic.down)}</span>
                </div>
              </>
            ) : (
              <div className="rounded-md border border-dashed px-2 py-1.5 text-[11px] text-muted-foreground">
                {traffic.status === "loading"
                  ? t("atlas.loading")
                  : traffic.status === "unconfigured"
                    ? t("atlas.traffic.unconfigured")
                    : t("atlas.unavailable")}
              </div>
            )}
          </section>

          {selectedPing.length > 0 && (
            <section className="space-y-3 border-t border-border/50 pt-3">
              {selectedPing.map(({ taskId, name, history }, index) => (
                <div key={taskId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex min-w-0 items-center gap-1 text-muted-foreground">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Radio className="h-3 w-3 shrink-0" />
                        <span className="truncate">{name}</span>
                      </span>
                      <div className="relative z-30 flex shrink-0 items-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 rounded-sm"
                          disabled={index === 0}
                          onClick={() => movePingTask(taskId, -1)}
                          title={t("atlas.detail.movePingTaskUp")}
                        >
                          <ArrowUp className="h-3 w-3" />
                          <span className="sr-only">{t("atlas.detail.movePingTaskUp")}</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 rounded-sm"
                          disabled={index === selectedPing.length - 1}
                          onClick={() => movePingTask(taskId, 1)}
                          title={t("atlas.detail.movePingTaskDown")}
                        >
                          <ArrowDown className="h-3 w-3" />
                          <span className="sr-only">{t("atlas.detail.movePingTaskDown")}</span>
                        </Button>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {t("atlas.ping.window24h")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <PingHistoryStrip
                      label={t("atlas.ping.latency")}
                      buckets={history?.buckets}
                      metric="latency"
                    />
                    <PingHistoryStrip
                      label={t("atlas.ping.loss")}
                      buckets={history?.buckets}
                      metric="loss"
                    />
                  </div>
                </div>
              ))}
            </section>
          )}

          <div
            className="grid grid-cols-2 gap-3 border-t border-border/50 pt-3 text-[11px]"
            title={ratesUnavailable && assetValue?.remainingValue == null
              ? t("remainingValue.errorRatesUnavailable")
              : undefined}
          >
            <div className="min-w-0">
              <div className="text-muted-foreground">{t("remainingValue.monthlyCost")}</div>
              <div className="mt-0.5 truncate font-medium tabular-nums">{monthlyCost}</div>
            </div>
            <div className="min-w-0 text-right">
              <div className="text-muted-foreground">{t("atlas.detail.remainingValue")}</div>
              <div className="mt-0.5 truncate font-medium tabular-nums">{remainingValue}</div>
            </div>
            <div className="col-span-2 flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                {t("atlas.detail.expiry")}
              </div>
              <div className="font-medium tabular-nums">{expiryDate}</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
