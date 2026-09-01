"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Cpu,
  Gauge,
  HardDrive,
  MemoryStick,
  Network,
  Radio,
  Save,
  Server,
  SlidersHorizontal,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import SpaLink from "@/components/SpaLink";
import { HistoricalCharts, type HistoryRange } from "@/components/v2/HistoricalCharts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAtlasSettings } from "@/contexts/AtlasSettingsContext";
import { useBillingTraffic } from "@/contexts/BillingTrafficContext";
import { useLiveData } from "@/contexts/LiveDataContext";
import { useNodeList } from "@/contexts/NodeListContext";
import { percentage, resourceTone, type HealthTone } from "@/lib/atlas";
import { buildRemainingValueSnapshot } from "@/lib/remainingValue";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/utils/unitHelper";

const RANGES: HistoryRange[] = ["1h", "6h", "24h", "7d", "30d"];

function formatUptime(seconds: number, t: (key: string, options?: Record<string, unknown>) => string) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "--";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return days > 0
    ? t("atlas.detail.uptimeDays", { days, hours })
    : t("atlas.detail.uptimeHours", { hours });
}

function DetailMetric({ icon: Icon, label, value, tone }: {
  icon: typeof Cpu;
  label: string;
  value: string;
  tone?: HealthTone;
}) {
  return (
    <div className="atlas-detail-metric">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={cn(
        "mt-2 truncate text-lg font-semibold tabular-nums",
        tone === "good" && "text-emerald-500",
        tone === "warning" && "text-amber-500",
        tone === "danger" && "text-red-500",
      )}>{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(7rem,0.8fr)_minmax(0,1.4fr)] gap-3 border-b border-border/45 py-2.5 last:border-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm">{value || "--"}</dd>
    </div>
  );
}

function pingTone(value: number, warning: number, danger: number) {
  const tone = resourceTone(value, warning, danger);
  return tone === "danger"
    ? "text-red-500"
    : tone === "warning"
      ? "text-amber-500"
      : "text-emerald-500";
}

export function NodeDetail({ uuid }: { uuid: string }) {
  const { t, i18n } = useTranslation();
  const { nodeList, isLoading } = useNodeList();
  const { live_data } = useLiveData();
  const { settings, pingTasks, saveState, updateNodeSettings } = useAtlasSettings();
  const { trafficByNode } = useBillingTraffic();
  const [range, setRange] = useState<HistoryRange>("24h");
  const node = nodeList?.find((item) => item.uuid === uuid);
  const live = live_data?.data.data[uuid];
  const locale = i18n.resolvedLanguage || i18n.language;

  const availablePingTasks = useMemo(
    () => pingTasks.filter((task) => task.clients.includes(uuid)),
    [pingTasks, uuid],
  );

  if (isLoading || !nodeList) {
    return <main className="atlas-content py-24 text-center text-sm text-muted-foreground">{t("atlas.loading")}</main>;
  }

  if (!node) {
    return (
      <main className="atlas-content py-24 text-center">
        <CircleAlert className="mx-auto h-6 w-6 text-amber-500" />
        <p className="mt-3 text-sm">{t("atlas.detail.nodeNotFound")}</p>
        <Button asChild variant="outline" className="mt-4"><SpaLink href="/">{t("atlas.detail.back")}</SpaLink></Button>
      </main>
    );
  }

  const nodeSettings = settings.nodes[uuid] || { cardPingTaskIds: [] };
  const traffic = trafficByNode[uuid] || { status: "loading" as const };
  const cpu = live?.cpu.usage ?? 0;
  const ramPercent = live ? percentage(live.ram.used, node.mem_total) : 0;
  const diskPercent = live ? percentage(live.disk.used, node.disk_total) : 0;
  const remaining = buildRemainingValueSnapshot([node]).active[0];
  const sections = [
    ["live", t("atlas.detail.nav.live")],
    ["hardware", t("atlas.detail.nav.hardware")],
    ["charts", t("atlas.detail.nav.charts")],
    ["ping", t("atlas.detail.nav.ping")],
    ["traffic", t("atlas.detail.nav.traffic")],
    ["assets", t("atlas.detail.nav.assets")],
    ["settings", t("atlas.detail.nav.settings")],
  ];

  return (
    <main className="atlas-detail-shell">
      <div className="atlas-content py-5 sm:py-7">
        <div className="mb-5 flex items-start gap-3">
          <Button asChild variant="ghost" size="icon" className="mt-0.5 h-9 w-9 shrink-0">
            <SpaLink href="/" title={t("atlas.detail.back")}><ArrowLeft className="h-4 w-4" /></SpaLink>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold sm:text-2xl">{node.name}</h1>
              <span className={cn("atlas-status-badge", live?.online ? "is-online" : "is-offline")}>
                {live?.online ? t("atlas.status.online") : t("atlas.status.offline")}
              </span>
            </div>
            <p className="mt-1 break-all text-xs text-muted-foreground">{node.uuid}</p>
          </div>
        </div>
      </div>

      <nav className="atlas-detail-nav" aria-label={t("atlas.detail.sectionNavigation")}>
        <div className="atlas-content flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex w-max items-center gap-1">
            {sections.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="atlas-detail-nav-link">{label}</a>
            ))}
          </div>
          <div className="flex w-max items-center gap-1">
            {RANGES.map((item) => (
              <button
                key={item}
                type="button"
                className={cn("atlas-range-button", range === item && "is-active")}
                onClick={() => setRange(item)}
              >{item}</button>
            ))}
          </div>
        </div>
      </nav>

      <div className="atlas-content space-y-7 py-6 sm:space-y-9 sm:py-8">
        <section id="live" className="atlas-detail-section scroll-mt-28">
          <div className="atlas-section-heading">
            <div><span className="atlas-section-index">01</span><h2>{t("atlas.detail.liveStatus")}</h2></div>
            <span>{live?.updated_at ? new Date(live.updated_at).toLocaleString(locale) : t("atlas.noData")}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <DetailMetric icon={Cpu} label="CPU" value={live ? `${cpu.toFixed(1)}%` : "--"} tone={live ? resourceTone(cpu, 75, 90) : undefined} />
            <DetailMetric icon={MemoryStick} label={t("atlas.metrics.memory")} value={live ? `${ramPercent.toFixed(1)}%` : "--"} tone={live ? resourceTone(ramPercent, 75, 90) : undefined} />
            <DetailMetric icon={HardDrive} label={t("atlas.metrics.disk")} value={live ? `${diskPercent.toFixed(1)}%` : "--"} tone={live ? resourceTone(diskPercent, 80, 90) : undefined} />
            <DetailMetric icon={ArrowUp} label={t("atlas.metrics.upload")} value={live ? `${formatBytes(live.network.up)}/s` : "--"} />
            <DetailMetric icon={ArrowDown} label={t("atlas.metrics.download")} value={live ? `${formatBytes(live.network.down)}/s` : "--"} />
            <DetailMetric icon={Gauge} label={t("atlas.detail.uptime")} value={live ? formatUptime(live.uptime, t) : "--"} />
          </div>
        </section>

        <section id="hardware" className="atlas-detail-section scroll-mt-28">
          <div className="atlas-section-heading"><div><span className="atlas-section-index">02</span><h2>{t("atlas.detail.hardwareNetwork")}</h2></div></div>
          <div className="grid gap-3 lg:grid-cols-2">
            <dl className="atlas-glass-panel px-4 py-2">
              <InfoRow label={t("atlas.detail.cpuModel")} value={node.cpu_name} />
              <InfoRow label={t("atlas.detail.cpuCores")} value={`${node.cpu_cores}`} />
              <InfoRow label={t("atlas.detail.memoryTotal")} value={formatBytes(node.mem_total)} />
              <InfoRow label={t("atlas.detail.swapTotal")} value={formatBytes(node.swap_total)} />
              <InfoRow label={t("atlas.detail.diskTotal")} value={formatBytes(node.disk_total)} />
              <InfoRow label="GPU" value={node.gpu_name} />
            </dl>
            <dl className="atlas-glass-panel px-4 py-2">
              <InfoRow label={t("atlas.detail.system")} value={[node.os, node.arch].filter(Boolean).join(" / ")} />
              <InfoRow label={t("atlas.detail.kernel")} value={node.kernel_version} />
              <InfoRow label={t("atlas.detail.virtualization")} value={node.virtualization} />
              <InfoRow label="IPv4" value={node.ipv4} />
              <InfoRow label="IPv6" value={node.ipv6} />
              <InfoRow label={t("atlas.detail.clientVersion")} value={node.version} />
            </dl>
          </div>
        </section>

        <section id="charts" className="atlas-detail-section scroll-mt-28">
          <div className="atlas-section-heading">
            <div><span className="atlas-section-index">03</span><h2>{t("atlas.detail.historyCharts")}</h2></div>
            <span>{t("atlas.detail.range", { range })}</span>
          </div>
          <HistoricalCharts node={node} range={range} />
        </section>

        <section id="ping" className="atlas-detail-section scroll-mt-28">
          <div className="atlas-section-heading"><div><span className="atlas-section-index">04</span><h2>{t("atlas.detail.pingStatus")}</h2></div></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {availablePingTasks.length === 0 ? (
              <div className="atlas-glass-panel p-5 text-sm text-muted-foreground">{t("atlas.detail.noPingTasks")}</div>
            ) : availablePingTasks.map((task) => {
              const snapshot = live?.ping?.[String(task.id)];
              return (
                <article key={task.id} className="atlas-glass-panel p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Radio className="h-4 w-4 text-primary" />
                    <span className="truncate">{task.name}</span>
                  </div>
                  {snapshot ? (
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-muted-foreground">{t("atlas.detail.latest")}</div>
                        <div className={cn("mt-1 font-semibold tabular-nums", pingTone(snapshot.latest, 150, 300))}>{snapshot.latest.toFixed(1)} ms</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">{t("atlas.detail.average")}</div>
                        <div className={cn("mt-1 font-semibold tabular-nums", pingTone(snapshot.avg, 150, 300))}>{snapshot.avg.toFixed(1)} ms</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">{t("atlas.detail.loss")}</div>
                        <div className={cn("mt-1 font-semibold tabular-nums", pingTone(snapshot.loss, 1, 5))}>{snapshot.loss.toFixed(1)}%</div>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-muted-foreground">{t("atlas.noData")}</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section id="traffic" className="atlas-detail-section scroll-mt-28">
          <div className="atlas-section-heading"><div><span className="atlas-section-index">05</span><h2>{t("atlas.detail.billingTraffic")}</h2></div></div>
          <div className="atlas-glass-panel p-4 sm:p-5">
            {traffic.status === "ready" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DetailMetric icon={ArrowUp} label={t("atlas.metrics.upload")} value={formatBytes(traffic.up)} />
                <DetailMetric icon={ArrowDown} label={t("atlas.metrics.download")} value={formatBytes(traffic.down)} />
                <DetailMetric icon={Network} label={t("atlas.traffic.billingUsage")} value={formatBytes(traffic.used)} />
                <DetailMetric icon={Server} label={t("atlas.detail.trafficLimit")} value={node.traffic_limit > 0 ? formatBytes(node.traffic_limit) : t("atlas.detail.unlimited")} />
                <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-4">
                  {new Date(traffic.start).toLocaleString(locale)} - {new Date(traffic.end).toLocaleString(locale)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {traffic.status === "loading"
                  ? t("atlas.loading")
                  : traffic.status === "unconfigured"
                    ? t("atlas.traffic.unconfigured")
                    : traffic.message}
              </p>
            )}
          </div>
        </section>

        <section id="assets" className="atlas-detail-section scroll-mt-28">
          <div className="atlas-section-heading"><div><span className="atlas-section-index">06</span><h2>{t("atlas.detail.assets")}</h2></div></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailMetric icon={WalletCards} label={t("atlas.detail.price")} value={node.price > 0 ? `${node.currency} ${node.price.toFixed(2)}` : "--"} />
            <DetailMetric icon={CalendarDays} label={t("atlas.detail.expiry")} value={node.expired_at ? new Date(node.expired_at).toLocaleDateString(locale) : "--"} />
            <DetailMetric icon={Gauge} label={t("atlas.detail.billingCycle")} value={node.billing_cycle === -1 ? t("atlas.assets.longTerm") : node.billing_cycle > 0 ? t("atlas.detail.days", { count: node.billing_cycle }) : "--"} />
            <DetailMetric icon={WalletCards} label={t("atlas.detail.remainingValue")} value={remaining ? `${remaining.currencyCode} ${remaining.remainingValueOriginal.toFixed(2)}` : "--"} />
          </div>
        </section>

        <section id="settings" className="atlas-detail-section scroll-mt-28">
          <div className="atlas-section-heading">
            <div><span className="atlas-section-index">07</span><h2>{t("atlas.detail.nodeSettings")}</h2></div>
            <span className={cn(
              "flex items-center gap-1.5",
              saveState === "error" ? "text-red-500" : saveState === "saved" ? "text-emerald-500" : "",
            )}>
              {saveState === "saved" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              {t(`atlas.saveState.${saveState}`)}
            </span>
          </div>
          <div className="atlas-glass-panel divide-y divide-border/50">
            <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center sm:p-5">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-medium"><SlidersHorizontal className="h-4 w-4" />{t("atlas.detail.resetDay")}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{t("atlas.detail.resetDayDescription")}</p>
              </div>
              <select
                className="h-10 rounded-md border border-input bg-background/70 px-3 text-sm"
                value={nodeSettings.trafficResetDay ?? "expiry"}
                onChange={(event) => updateNodeSettings(uuid, {
                  trafficResetDay: event.target.value === "expiry" ? undefined : Number(event.target.value),
                })}
              >
                <option value="expiry">{t("atlas.detail.followExpiry")}</option>
                {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                  <option key={day} value={day}>{t("atlas.detail.monthDay", { day })}</option>
                ))}
              </select>
            </div>
            <div className="p-4 sm:p-5">
              <h3 className="text-sm font-medium">{t("atlas.detail.homePingTasks")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("atlas.detail.homePingDescription")}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {availablePingTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("atlas.detail.noPingTasks")}</p>
                ) : availablePingTasks.map((task) => {
                  const checked = nodeSettings.cardPingTaskIds.includes(task.id);
                  return (
                    <label key={task.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border/60 bg-background/25 px-3 py-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(nextChecked) => updateNodeSettings(uuid, {
                          cardPingTaskIds: nextChecked
                            ? [...nodeSettings.cardPingTaskIds, task.id]
                            : nodeSettings.cardPingTaskIds.filter((id) => id !== task.id),
                        })}
                      />
                      <span className="min-w-0 truncate">{task.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
