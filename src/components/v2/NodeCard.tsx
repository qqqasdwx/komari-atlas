"use client";

import { ArrowDown, ArrowUp, CalendarDays, Clock3, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";

import SpaLink from "@/components/SpaLink";
import { PingHistoryStrip } from "@/components/v2/PingHistoryStrip";
import { Card } from "@/components/ui/card";
import { useAtlasSettings } from "@/contexts/AtlasSettingsContext";
import { useBillingTraffic } from "@/contexts/BillingTrafficContext";
import { useCardPingHistory } from "@/contexts/CardPingHistoryContext";
import { expiryTone, percentage, resourceTone, type HealthTone } from "@/lib/atlas";
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

function MetricRing({ label, value, tone }: { label: string; value: number | null; tone: HealthTone }) {
  const safeValue = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn("atlas-metric-ring", toneClass[tone])}
        style={{ "--metric-value": `${safeValue * 3.6}deg` } as React.CSSProperties}
      >
        <div className="atlas-metric-ring__center">
          <span className="text-sm font-semibold tabular-nums">
            {value === null ? "--" : `${Math.round(value)}%`}
          </span>
        </div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn("mt-0.5 text-xs font-medium", toneClass[tone])}>
          {value === null ? "--" : `${value.toFixed(1)}%`}
        </div>
      </div>
    </div>
  );
}

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

function expiryLabel(expiredAt: string, locale: string) {
  const timestamp = new Date(expiredAt).getTime();
  if (!Number.isFinite(timestamp)) return null;
  const days = Math.ceil((timestamp - Date.now()) / (24 * 60 * 60 * 1000));
  return {
    date: new Date(timestamp).toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" }),
    days,
  };
}

export function NodeCard({
  node,
  live,
}: {
  node: NodeBasicInfo;
  live: LiveRecord | undefined;
}) {
  const { t, i18n } = useTranslation();
  const { settings, pingTasks } = useAtlasSettings();
  const { trafficByNode } = useBillingTraffic();
  const { historiesByKey } = useCardPingHistory();
  const online = Boolean(live?.online);
  const cpu = live ? live.cpu.usage : null;
  const ram = live ? percentage(live.ram.used, node.mem_total || live.ram.used) : null;
  const disk = live ? percentage(live.disk.used, node.disk_total || live.disk.used) : null;
  const cpuTone = cpu === null ? "neutral" : resourceTone(cpu, 75, 90);
  const ramTone = ram === null ? "neutral" : resourceTone(ram, 75, 90);
  const diskTone = disk === null ? "neutral" : resourceTone(disk, 80, 90);
  const expiry = expiryLabel(node.expired_at, i18n.resolvedLanguage || "en");
  const selectedPingIds = settings.nodes[node.uuid]?.cardPingTaskIds || [];
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

  return (
    <SpaLink href={`/instance/${node.uuid}`} className="block h-full focus-visible:outline-none">
      <Card className="atlas-node-card h-full overflow-hidden border-border/60 p-0 transition duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary">
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
          <div className="grid grid-cols-2 gap-3">
            <MetricRing label="CPU" value={cpu} tone={cpuTone} />
            <MetricRing label={t("atlas.metrics.memory")} value={ram} tone={ramTone} />
          </div>

          <section className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">{t("atlas.metrics.disk")}</span>
              <span className={cn("font-medium tabular-nums", toneClass[diskTone])}>
                {disk === null ? "--" : `${disk.toFixed(1)}%`}
              </span>
            </div>
            <MetricBar value={disk || 0} tone={diskTone} />
            <div className="text-right text-[10px] text-muted-foreground">
              {live ? `${formatBytes(live.disk.used)} / ${formatBytes(node.disk_total)}` : "--"}
            </div>
          </section>

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
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">{t("atlas.traffic.billingUsage")}</span>
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
              {selectedPing.map(({ taskId, name, history }) => (
                <div key={taskId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                      <Radio className="h-3 w-3 shrink-0" />
                      <span className="truncate">{name}</span>
                    </span>
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

          <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1.5">
              <Clock3 className="h-3 w-3 shrink-0" />
              <span className="truncate">{live?.updated_at ? new Date(live.updated_at).toLocaleString() : t("atlas.noData")}</span>
            </span>
            {expiry && (
              <span className={cn("flex shrink-0 items-center gap-1", toneClass[expiryTone(node.expired_at)])} title={expiry.date}>
                <CalendarDays className="h-3 w-3" />
                {expiry.days < 0
                  ? t("atlas.expiry.expired")
                  : t("atlas.expiry.days", { count: expiry.days })}
              </span>
            )}
          </div>
        </div>
      </Card>
    </SpaLink>
  );
}
