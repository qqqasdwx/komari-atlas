"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
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
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import SpaLink from "@/components/SpaLink";
import { DailyTrafficChart } from "@/components/v2/DailyTrafficChart";
import {
  HistoricalCharts,
  LatencyCharts,
  type HistoryRange,
} from "@/components/v2/HistoricalCharts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAssetValues } from "@/contexts/AssetValueContext";
import { useAtlasSettings } from "@/contexts/AtlasSettingsContext";
import { useBillingTraffic } from "@/contexts/BillingTrafficContext";
import { useLiveData } from "@/contexts/LiveDataContext";
import { useNodeList } from "@/contexts/NodeListContext";
import {
  percentage,
  resolveCardPingTaskIds,
  resourceTone,
  type HealthTone,
} from "@/lib/atlas";
import { resolveExpiry } from "@/lib/expiry";
import {
  normalizePingTaskThresholds,
  PING_THRESHOLD_MAXIMUMS,
  resolvePingTaskThresholds,
} from "@/lib/pingThresholds";
import { formatUptime } from "@/lib/uptime";
import { cn } from "@/lib/utils";
import type { PingMetricThresholds } from "@/types/atlas";
import { formatBytes } from "@/utils/unitHelper";

const RANGES: HistoryRange[] = ["1h", "6h", "24h", "7d", "30d"];

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

function ThresholdInput({
  label,
  value,
  min,
  max,
  step,
  unit,
  tone,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  tone: "green" | "yellow";
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const numericValue = Number(draft);
    if (!draft.trim() || !Number.isFinite(numericValue)) {
      setDraft(String(value));
      return;
    }
    const nextValue = Math.max(min, Math.min(max, numericValue));
    setDraft(String(nextValue));
    if (nextValue !== value) onCommit(nextValue);
  };

  return (
    <label className="min-w-0 space-y-1">
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className={cn(
          "h-2 w-2 shrink-0 rounded-[2px]",
          tone === "green" ? "bg-emerald-500" : "bg-amber-500",
        )} />
        {label}
      </span>
      <span className="relative block">
        <Input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={draft}
          className="h-9 pr-10 text-right text-xs tabular-nums"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setDraft(String(value));
              event.currentTarget.blur();
            }
          }}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] text-muted-foreground">
          {unit}
        </span>
      </span>
    </label>
  );
}

function PingThresholdRow({
  label,
  thresholds,
  maximum,
  step,
  unit,
  greenLabel,
  yellowLabel,
  redLabel,
  onChange,
}: {
  label: string;
  thresholds: PingMetricThresholds;
  maximum: number;
  step: number;
  unit: string;
  greenLabel: string;
  yellowLabel: string;
  redLabel: string;
  onChange: (thresholds: PingMetricThresholds) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        <ThresholdInput
          label={greenLabel}
          value={thresholds.greenMax}
          min={0}
          max={thresholds.yellowMax}
          step={step}
          unit={unit}
          tone="green"
          onCommit={(greenMax) => onChange({ ...thresholds, greenMax })}
        />
        <ThresholdInput
          label={yellowLabel}
          value={thresholds.yellowMax}
          min={thresholds.greenMax}
          max={maximum}
          step={step}
          unit={unit}
          tone="yellow"
          onCommit={(yellowMax) => onChange({ ...thresholds, yellowMax })}
        />
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="h-2 w-2 shrink-0 rounded-[2px] bg-red-500" />
        {redLabel}
      </div>
    </div>
  );
}

function HistoryRangeToolbar({
  range,
  label,
  onChange,
}: {
  range: HistoryRange;
  label: string;
  onChange: (range: HistoryRange) => void;
}) {
  return (
    <div
      className="atlas-range-toolbar atlas-glass-panel sticky top-[6.75rem] z-[35] mb-3 flex min-h-11 w-max max-w-full items-center gap-1 p-1 sm:top-[7.25rem]"
      role="group"
      aria-label={label}
    >
      <Clock3 className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 overflow-x-auto">
        <div className="flex w-max items-center gap-1">
          {RANGES.map((item) => (
            <button
              key={item}
              type="button"
              className={cn("atlas-range-button", range === item && "is-active")}
              onClick={() => onChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function NodeDetail({ uuid }: { uuid: string }) {
  const { t, i18n } = useTranslation();
  const { nodeList, isLoading } = useNodeList();
  const { live_data } = useLiveData();
  const { cnyByNode, ratesUnavailable } = useAssetValues();
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

  const persistedNodeSettings = settings.nodes[uuid];
  const selectedPingTaskIds = resolveCardPingTaskIds(
    persistedNodeSettings,
    pingTasks,
    uuid,
  );
  const nodeSettings = persistedNodeSettings || { cardPingTaskIds: selectedPingTaskIds };
  const updatePingThresholds = (
    taskId: number,
    metric: "latency" | "loss",
    metricThresholds: PingMetricThresholds,
  ) => {
    const currentThresholds = resolvePingTaskThresholds(nodeSettings, taskId);
    const nextThresholds = normalizePingTaskThresholds({
      ...currentThresholds,
      [metric]: metricThresholds,
    });
    updateNodeSettings(uuid, {
      pingThresholds: {
        ...nodeSettings.pingThresholds,
        [String(taskId)]: nextThresholds,
      },
    });
  };
  const traffic = trafficByNode[uuid] || { status: "loading" as const };
  const trafficResetDay = traffic.status === "unconfigured" ? undefined : traffic.resetDay;
  const cpu = live?.cpu.usage ?? 0;
  const ramPercent = live ? percentage(live.ram.used, node.mem_total) : 0;
  const diskPercent = live ? percentage(live.disk.used, node.disk_total) : 0;
  const assetValue = cnyByNode[uuid];
  const remainingValue = assetValue?.remainingValue == null
    ? "--"
    : new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "CNY",
        currencyDisplay: "symbol",
      }).format(assetValue.remainingValue);
  const expiry = resolveExpiry(node.expired_at);
  const expiryLabel = expiry.kind === "long-term"
    ? t("atlas.assets.longTerm")
    : expiry.kind === "unset"
      ? "--"
      : `${new Date(expiry.timestamp).toLocaleDateString(locale)} · ${
          expiry.kind === "scheduled"
            ? t("atlas.expiry.days", { count: expiry.daysRemaining })
            : t("atlas.expiry.expired")
        }`;
  const detailTabs = [
    ["overview", t("atlas.detail.nav.overview")],
    ["charts", t("atlas.detail.nav.charts")],
    ["ping", t("atlas.detail.nav.ping")],
    ["traffic", t("atlas.detail.nav.traffic")],
    ["settings", t("atlas.detail.nav.settings")],
  ];

  return (
    <main className="atlas-detail-shell">
      <div className="atlas-content py-5 sm:py-7">
        <div className="flex items-start gap-3">
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

      <Tabs defaultValue="overview">
        <div className="atlas-detail-nav">
          <div className="atlas-content overflow-x-auto">
            <TabsList
              className="h-auto w-max justify-start bg-transparent p-0"
              aria-label={t("atlas.detail.sectionNavigation")}
            >
              {detailTabs.map(([value, label]) => (
                <TabsTrigger key={value} value={value} className="atlas-detail-tab">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        <div className="atlas-content py-6 sm:py-8">
          <TabsContent value="overview" className="mt-0 space-y-7 sm:space-y-9">
            <section className="atlas-detail-section">
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

            <section className="atlas-detail-section">
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

            <section className="atlas-detail-section">
              <div className="atlas-section-heading"><div><span className="atlas-section-index">03</span><h2>{t("atlas.detail.assets")}</h2></div></div>
              <div
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
                title={ratesUnavailable && assetValue?.remainingValue == null
                  ? t("remainingValue.errorRatesUnavailable")
                  : undefined}
              >
                <DetailMetric icon={WalletCards} label={t("atlas.detail.price")} value={node.price > 0 ? `${node.currency} ${node.price.toFixed(2)}` : "--"} />
                <DetailMetric icon={CalendarDays} label={t("atlas.detail.expiry")} value={expiryLabel} />
                <DetailMetric icon={Gauge} label={t("atlas.detail.billingCycle")} value={node.billing_cycle === -1 ? t("atlas.assets.longTerm") : node.billing_cycle > 0 ? t("atlas.detail.days", { count: node.billing_cycle }) : "--"} />
                <DetailMetric icon={WalletCards} label={t("atlas.detail.remainingValue")} value={remainingValue} />
              </div>
            </section>
          </TabsContent>

          <TabsContent value="charts" className="mt-0">
            <section className="atlas-detail-section">
              <div className="atlas-section-heading">
                <div><span className="atlas-section-index">04</span><h2>{t("atlas.detail.historyCharts")}</h2></div>
                <span>{t("atlas.detail.range", { range })}</span>
              </div>
              <HistoryRangeToolbar
                range={range}
                label={t("atlas.detail.historyRange")}
                onChange={setRange}
              />
              <HistoricalCharts node={node} range={range} />
            </section>
          </TabsContent>

          <TabsContent value="ping" className="mt-0 space-y-7 sm:space-y-9">
            <section className="atlas-detail-section">
              <div className="atlas-section-heading"><div><span className="atlas-section-index">05</span><h2>{t("atlas.detail.pingStatus")}</h2></div></div>
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

            <section className="atlas-detail-section">
              <div className="atlas-section-heading">
                <div><span className="atlas-section-index">06</span><h2>{t("atlas.detail.latencyHistory")}</h2></div>
                <span>{t("atlas.detail.range", { range })}</span>
              </div>
              <HistoryRangeToolbar
                range={range}
                label={t("atlas.detail.historyRange")}
                onChange={setRange}
              />
              <LatencyCharts node={node} range={range} />
            </section>
          </TabsContent>

          <TabsContent value="traffic" className="mt-0">
            <section className="atlas-detail-section">
              <div className="atlas-section-heading">
                <div><span className="atlas-section-index">07</span><h2>{t("atlas.detail.billingTraffic")}</h2></div>
                {trafficResetDay && <span>{t("atlas.traffic.resetOnDay", { day: trafficResetDay })}</span>}
              </div>
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
              {traffic.status === "ready" && (
                <div className="mt-3">
                  <DailyTrafficChart days={traffic.daily} />
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <section className="atlas-detail-section">
              <div className="atlas-section-heading">
                <div><span className="atlas-section-index">08</span><h2>{t("atlas.detail.nodeSettings")}</h2></div>
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
                  <p className="mt-1 text-xs text-muted-foreground">{t("atlas.detail.pingThresholdDescription")}</p>
                  <div className="mt-4 divide-y divide-border/50">
                    {availablePingTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("atlas.detail.noPingTasks")}</p>
                    ) : availablePingTasks.map((task) => {
                      const checked = selectedPingTaskIds.includes(task.id);
                      const thresholds = resolvePingTaskThresholds(nodeSettings, task.id);
                      return (
                        <div key={task.id} className="py-4 first:pt-0 last:pb-0">
                          <label className="flex min-h-9 cursor-pointer items-center gap-3 text-sm font-medium">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(nextChecked) => updateNodeSettings(uuid, {
                                cardPingTaskIds: nextChecked
                                  ? [...selectedPingTaskIds, task.id]
                                  : selectedPingTaskIds.filter((id) => id !== task.id),
                              })}
                            />
                            <span className="min-w-0 truncate">{task.name}</span>
                          </label>
                          <div className="mt-3 grid gap-4 sm:grid-cols-2 sm:pl-7">
                            <PingThresholdRow
                              label={t("atlas.ping.latency")}
                              thresholds={thresholds.latency}
                              maximum={PING_THRESHOLD_MAXIMUMS.latency}
                              step={1}
                              unit="ms"
                              greenLabel={t("atlas.ping.greenMaximum")}
                              yellowLabel={t("atlas.ping.yellowMaximum")}
                              redLabel={t("atlas.ping.redAbove", {
                                value: thresholds.latency.yellowMax,
                                unit: "ms",
                              })}
                              onChange={(nextThresholds) => updatePingThresholds(
                                task.id,
                                "latency",
                                nextThresholds,
                              )}
                            />
                            <PingThresholdRow
                              label={t("atlas.ping.loss")}
                              thresholds={thresholds.loss}
                              maximum={PING_THRESHOLD_MAXIMUMS.loss}
                              step={0.1}
                              unit="%"
                              greenLabel={t("atlas.ping.greenMaximum")}
                              yellowLabel={t("atlas.ping.yellowMaximum")}
                              redLabel={t("atlas.ping.redAbove", {
                                value: thresholds.loss.yellowMax,
                                unit: "%",
                              })}
                              onChange={(nextThresholds) => updatePingThresholds(
                                task.id,
                                "loss",
                                nextThresholds,
                              )}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {availablePingTasks.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border/50 pt-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-[2px] bg-muted-foreground/20" />
                        {t("atlas.ping.noDataColor")}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-[2px] bg-amber-500 ring-1 ring-inset ring-amber-300/90"
                          style={{
                            backgroundImage: "repeating-linear-gradient(135deg, transparent 0 2px, rgb(252 211 77 / 0.9) 2px 3px)",
                          }}
                        />
                        {t("atlas.ping.partialDataColor")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}
