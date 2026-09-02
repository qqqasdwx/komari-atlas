"use client";

import { AlertTriangle, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { useAtlasSettings } from "@/contexts/AtlasSettingsContext";
import { useRPC2Call } from "@/contexts/RPC2Context";
import { metricSeriesKey, percentage } from "@/lib/atlas";
import { cn } from "@/lib/utils";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { MetricSeries, MetricsResponse } from "@/types/atlas";
import { formatBytes } from "@/utils/unitHelper";

export type HistoryRange = "1h" | "6h" | "24h" | "7d" | "30d";

const RANGE_HOURS: Record<HistoryRange, number> = {
  "1h": 1,
  "6h": 6,
  "24h": 24,
  "7d": 7 * 24,
  "30d": 30 * 24,
};

const SYSTEM_METRIC_KEYS = [
  "cpu.usage",
  "load.average",
  "memory.used",
  "swap.used",
  "disk.used",
  "net.in.rate",
  "net.out.rate",
  "process.count",
  "connections.tcp",
  "connections.udp",
  "gpu.usage",
  "gpu.device.usage",
  "gpu.memory.used",
  "gpu.memory.total",
  "gpu.temperature",
] as const;

const PING_METRIC_KEYS = ["ping.latency_ms", "ping.loss"] as const;

const CHART_COLORS = [
  "#38bdf8",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#a78bfa",
  "#22d3ee",
  "#f97316",
  "#84cc16",
];

const METRIC_TRANSLATION_KEYS: Record<string, string> = {
  "cpu.usage": "cpuUsage",
  "load.average": "loadAverage",
  "memory.used": "memoryUsed",
  "swap.used": "swapUsed",
  "disk.used": "diskUsed",
  "net.in.rate": "netInRate",
  "net.out.rate": "netOutRate",
  "process.count": "processCount",
  "connections.tcp": "connectionsTcp",
  "connections.udp": "connectionsUdp",
  "gpu.usage": "gpuUsage",
  "gpu.device.usage": "gpuDeviceUsage",
  "gpu.memory.used": "gpuMemoryUsed",
  "gpu.memory.total": "gpuMemoryTotal",
  "gpu.temperature": "gpuTemperature",
};

type ValueKind = "percent" | "bytes" | "rate" | "count" | "latency" | "loss" | "temperature";

type SeriesLine = {
  id: string;
  dataKey: string;
  label: string;
  color: string;
};

type ChartDatum = Record<string, number | string | null> & { time: string };

function metricLabel(
  series: MetricSeries,
  index: number,
  taskNames: Map<string, string>,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const taskId = series.tags?.task_id;
  if (taskId) return taskNames.get(taskId) || t("atlas.detail.pingTask", { id: taskId });
  const deviceName = series.tags?.device_name;
  if (deviceName) return deviceName;
  const deviceIndex = series.tags?.device_index;
  if (deviceIndex) return t("atlas.detail.gpuDevice", { index: Number(deviceIndex) + 1 });
  const key = METRIC_TRANSLATION_KEYS[series.metric_key];
  return key ? t(`atlas.metricNames.${key}`, { index }) : series.metric_key;
}

function transformValue(metricKey: string, value: number, node: NodeBasicInfo) {
  switch (metricKey) {
    case "memory.used":
      return percentage(value, node.mem_total);
    case "swap.used":
      return percentage(value, node.swap_total);
    case "disk.used":
      return percentage(value, node.disk_total);
    case "ping.loss":
      return value <= 1 ? value * 100 : value;
    default:
      return value;
  }
}

function buildChart(
  allSeries: MetricSeries[],
  keys: string[],
  node: NodeBasicInfo,
  taskNames: Map<string, string>,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const selected = allSeries.filter((series) => keys.includes(series.metric_key) && series.points.length > 0);
  const rows = new Map<string, ChartDatum>();
  const lines: SeriesLine[] = [];

  selected.forEach((series, index) => {
    const dataKey = `series${index}`;
    lines.push({
      id: metricSeriesKey(series, index),
      dataKey,
      label: metricLabel(series, index, taskNames, t),
      color: CHART_COLORS[index % CHART_COLORS.length],
    });
    for (const point of series.points) {
      const row = rows.get(point.time) || { time: point.time };
      row[dataKey] = typeof point.value === "number"
        ? transformValue(series.metric_key, point.value, node)
        : null;
      rows.set(point.time, row);
    }
  });

  return {
    lines,
    data: Array.from(rows.values()).sort(
      (left, right) => new Date(left.time).getTime() - new Date(right.time).getTime(),
    ),
  };
}

function formatValue(value: number, kind: ValueKind) {
  switch (kind) {
    case "percent":
    case "loss":
      return `${value.toFixed(1)}%`;
    case "bytes":
      return formatBytes(value);
    case "rate":
      return `${formatBytes(value)}/s`;
    case "latency":
      return `${value.toFixed(1)} ms`;
    case "temperature":
      return `${value.toFixed(1)} C`;
    case "count":
    default:
      return value.toFixed(value >= 100 ? 0 : 1);
  }
}

function MetricChart({
  title,
  series,
  keys,
  kind,
  node,
  taskNames,
  toggleable = false,
}: {
  title: string;
  series: MetricSeries[];
  keys: string[];
  kind: ValueKind;
  node: NodeBasicInfo;
  taskNames: Map<string, string>;
  toggleable?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const chart = useMemo(
    () => buildChart(series, keys, node, taskNames, t),
    [keys, node, series, t, taskNames],
  );
  const locale = i18n.resolvedLanguage || i18n.language;
  const [hiddenLineIds, setHiddenLineIds] = useState<Set<string>>(() => new Set());

  const toggleLine = (lineId: string) => {
    setHiddenLineIds((previous) => {
      const next = new Set(previous);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  };

  return (
    <article className="atlas-chart-panel">
      <div className="mb-4 flex min-h-8 items-start justify-between gap-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex max-w-[70%] flex-wrap justify-end gap-x-3 gap-y-1">
          {chart.lines.map((line) => (
            toggleable ? (
              <button
                key={line.id}
                type="button"
                className={cn(
                  "atlas-chart-series-toggle inline-flex max-w-40 items-center gap-1 text-[10px] text-muted-foreground transition-opacity hover:text-foreground focus-visible:text-foreground",
                  hiddenLineIds.has(line.id) && "opacity-50 line-through",
                )}
                aria-pressed={!hiddenLineIds.has(line.id)}
                title={t(hiddenLineIds.has(line.id) ? "atlas.charts.showSeries" : "atlas.charts.hideSeries", { name: line.label })}
                onClick={() => toggleLine(line.id)}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: line.color }} />
                <span className="truncate">{line.label}</span>
              </button>
            ) : (
              <span key={line.id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: line.color }} />
                {line.label}
              </span>
            )
          ))}
        </div>
      </div>
      {chart.data.length === 0 ? (
        <div className="flex h-[210px] items-center justify-center text-sm text-muted-foreground">
          {t("atlas.noData")}
        </div>
      ) : (
        <div className="h-[230px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart.data} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--atlas-chart-grid)" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                minTickGap={36}
                tickFormatter={(value) => new Date(value).toLocaleString(locale, {
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />
              <YAxis
                width={52}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                domain={kind === "percent" || kind === "loss" ? [0, 100] : ["auto", "auto"]}
                tickFormatter={(value) => formatValue(Number(value), kind)}
              />
              <Tooltip
                contentStyle={{
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
                labelFormatter={(value) => new Date(value).toLocaleString(locale)}
                formatter={(value, name) => {
                  const line = chart.lines.find((item) => item.dataKey === name);
                  return [formatValue(Number(value), kind), line?.label || String(name)];
                }}
              />
              {chart.lines.map((line) => (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  name={line.dataKey}
                  stroke={line.color}
                  strokeWidth={1.8}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                  hide={hiddenLineIds.has(line.id)}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}

function MetricHistoryCharts({
  node,
  range,
  mode,
}: {
  node: NodeBasicInfo;
  range: HistoryRange;
  mode: "system" | "ping";
}) {
  const { t } = useTranslation();
  const { pingTasks } = useAtlasSettings();
  const { callViaHTTP } = useRPC2Call();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    series: MetricSeries[];
  }>({ loading: true, error: null, series: [] });

  useEffect(() => {
    let active = true;
    const end = new Date();
    const start = new Date(end.getTime() - RANGE_HOURS[range] * 60 * 60 * 1000);
    setState((previous) => ({ ...previous, loading: true, error: null }));
    callViaHTTP<Record<string, unknown>, MetricsResponse>("public:queryMetrics", {
      metric_keys: mode === "ping" ? PING_METRIC_KEYS : SYSTEM_METRIC_KEYS,
      entity_ids: [node.uuid],
      start: start.toISOString(),
      end: end.toISOString(),
      aggregation: "avg",
      fill_empty: true,
      max_points: 360,
    })
      .then((response) => {
        if (active) setState({ loading: false, error: null, series: response.series || [] });
      })
      .catch((error) => {
        if (active) {
          setState({
            loading: false,
            error: error instanceof Error ? error.message : t("atlas.detail.historyError"),
            series: [],
          });
        }
      });
    return () => {
      active = false;
    };
  }, [attempt, callViaHTTP, mode, node.uuid, range, t]);

  const taskNames = useMemo(
    () => new Map(pingTasks.map((task) => [String(task.id), task.name])),
    [pingTasks],
  );
  const hasGpu = state.series.some(
    (series) => series.metric_key.startsWith("gpu.") && series.points.some((point) => point.value !== null),
  );

  if (state.loading && state.series.length === 0) {
    return (
      <div className="atlas-glass-panel flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        {t("atlas.detail.loadingHistory")}
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="atlas-glass-panel flex min-h-64 flex-col items-center justify-center gap-3 text-center text-sm">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <p className="max-w-lg text-muted-foreground">{state.error}</p>
        <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
          {t("atlas.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="atlas-chart-grid" aria-busy={state.loading}>
      {mode === "ping" ? (
        <>
          <MetricChart title={t("atlas.charts.pingLatency")} series={state.series} keys={["ping.latency_ms"]} kind="latency" node={node} taskNames={taskNames} toggleable />
          <MetricChart title={t("atlas.charts.pingLoss")} series={state.series} keys={["ping.loss"]} kind="loss" node={node} taskNames={taskNames} toggleable />
        </>
      ) : (
        <>
          <MetricChart title={t("atlas.charts.cpu")} series={state.series} keys={["cpu.usage"]} kind="percent" node={node} taskNames={taskNames} />
          <MetricChart title={t("atlas.charts.systemLoad")} series={state.series} keys={["load.average"]} kind="count" node={node} taskNames={taskNames} />
          <MetricChart title={t("atlas.charts.memorySwap")} series={state.series} keys={["memory.used", "swap.used"]} kind="percent" node={node} taskNames={taskNames} />
          <MetricChart title={t("atlas.charts.disk")} series={state.series} keys={["disk.used"]} kind="percent" node={node} taskNames={taskNames} />
          <MetricChart title={t("atlas.charts.network")} series={state.series} keys={["net.in.rate", "net.out.rate"]} kind="rate" node={node} taskNames={taskNames} />
          <MetricChart title={t("atlas.charts.processConnections")} series={state.series} keys={["process.count", "connections.tcp", "connections.udp"]} kind="count" node={node} taskNames={taskNames} />
          {hasGpu && (
            <>
              <MetricChart title={t("atlas.charts.gpuUsage")} series={state.series} keys={["gpu.usage", "gpu.device.usage"]} kind="percent" node={node} taskNames={taskNames} />
              <MetricChart title={t("atlas.charts.gpuMemory")} series={state.series} keys={["gpu.memory.used", "gpu.memory.total"]} kind="bytes" node={node} taskNames={taskNames} />
              <MetricChart title={t("atlas.charts.gpuTemperature")} series={state.series} keys={["gpu.temperature"]} kind="temperature" node={node} taskNames={taskNames} />
            </>
          )}
        </>
      )}
    </div>
  );
}

export function HistoricalCharts({ node, range }: { node: NodeBasicInfo; range: HistoryRange }) {
  return <MetricHistoryCharts node={node} range={range} mode="system" />;
}

export function LatencyCharts({ node, range }: { node: NodeBasicInfo; range: HistoryRange }) {
  return <MetricHistoryCharts node={node} range={range} mode="ping" />;
}
