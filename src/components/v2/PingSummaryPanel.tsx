"use client";

import { Activity, Clock3, Gauge, Signal, Timer } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { pingMetricTone } from "@/lib/pingThresholds";
import {
  buildPingTaskSummaries,
  type PingSummaryTaskInput,
} from "@/lib/pingSummary";
import type { MetricSeries } from "@/types/atlas";
import { cn } from "@/lib/utils";

function valueToneClass(tone: "neutral" | "good" | "warning" | "danger") {
  return tone === "danger"
    ? "text-red-500"
    : tone === "warning"
      ? "text-amber-500"
      : tone === "good"
        ? "text-emerald-500"
        : "text-muted-foreground";
}

function formatDuration(
  milliseconds: number | null,
  noData: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (milliseconds === null) return noData;
  const minutes = Math.max(1, Math.round(milliseconds / 60_000));
  if (minutes < 60) return t("atlas.detail.durationMinutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? t("atlas.detail.durationHoursMinutes", { hours, minutes: remainingMinutes })
    : t("atlas.detail.durationHours", { count: hours });
}

function SummaryMetric({
  icon,
  label,
  value,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border/50 bg-background/20 p-2.5">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={cn("mt-1 text-sm font-semibold tabular-nums", className)}>{value}</div>
    </div>
  );
}

export function PingSummaryPanel({
  series,
  tasks,
  timeDomain,
}: {
  series: MetricSeries[];
  tasks: PingSummaryTaskInput[];
  timeDomain: [number, number] | null;
}) {
  const { t } = useTranslation();
  const summaries = buildPingTaskSummaries(series, tasks, timeDomain);

  if (summaries.length === 0) return null;

  return (
    <section className="atlas-glass-panel col-span-1 p-4 sm:col-span-2">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{t("atlas.detail.pingSummary")}</h3>
      </div>
      <div className="mt-3 space-y-3">
        {summaries.map((summary) => {
          const task = tasks.find((item) => item.taskId === summary.taskId);
          const latencyTone = task && summary.maxLatency !== null
            ? pingMetricTone("latency", summary.maxLatency, task.thresholds)
            : "neutral";
          const lossTone = task && summary.maxLoss !== null
            ? pingMetricTone("loss", summary.maxLoss, task.thresholds)
            : "neutral";
          return (
            <article key={summary.taskId} className="rounded-lg border border-border/50 bg-background/20 p-3">
              <div className="flex min-w-0 items-center gap-2 text-xs font-medium">
                <Signal className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{summary.label}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <SummaryMetric
                  icon={<Gauge className="h-3 w-3" />}
                  label={t("atlas.detail.maxLatency")}
                  value={summary.maxLatency === null ? t("atlas.noData") : `${summary.maxLatency.toFixed(1)} ms`}
                  className={valueToneClass(latencyTone)}
                />
                <SummaryMetric
                  icon={<Signal className="h-3 w-3" />}
                  label={t("atlas.detail.maxLoss")}
                  value={summary.maxLoss === null ? t("atlas.noData") : `${summary.maxLoss.toFixed(1)}%`}
                  className={valueToneClass(lossTone)}
                />
                <SummaryMetric
                  icon={<Activity className="h-3 w-3" />}
                  label={t("atlas.detail.coverage")}
                  value={summary.coverage === null ? t("atlas.noData") : `${Math.round(summary.coverage * 100)}%`}
                />
                <SummaryMetric
                  icon={<Timer className="h-3 w-3" />}
                  label={t("atlas.detail.longestAnomaly")}
                  value={formatDuration(summary.longestAnomalyMs, t("atlas.noData"), t)}
                  className={summary.longestAnomalyMs === null ? undefined : "text-amber-500"}
                />
                <SummaryMetric
                  icon={<Clock3 className="h-3 w-3" />}
                  label={t("atlas.detail.longestNoData")}
                  value={formatDuration(summary.longestNoDataMs, t("atlas.noData"), t)}
                  className={summary.longestNoDataMs === null ? undefined : "text-red-500"}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
