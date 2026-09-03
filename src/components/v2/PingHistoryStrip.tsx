import { useTranslation } from "react-i18next";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { pingMetricTone, type PingTone } from "@/lib/pingThresholds";
import type {
  CardPingHistoryBucket,
  PingMetric,
  PingTaskThresholds,
} from "@/types/atlas";
import { cn } from "@/lib/utils";

const EMPTY_BUCKETS: CardPingHistoryBucket[] = Array.from({ length: 24 }, () => ({
  start: "",
  end: "",
  latency: null,
  loss: null,
  coverage: null,
}));

const PARTIAL_COVERAGE_THRESHOLD = 0.95;

const backgroundTone: Record<PingTone, string> = {
  neutral: "bg-muted-foreground/20",
  good: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

const textTone: Record<PingTone, string> = {
  neutral: "text-muted-foreground",
  good: "text-emerald-500",
  warning: "text-amber-500",
  danger: "text-red-500",
};

function formatMetricValue(metric: PingMetric, value: number | null, noData: string) {
  if (value === null) return noData;
  return metric === "latency" ? `${Math.round(value)} ms` : `${value.toFixed(1)}%`;
}

function formatBucketTime(bucket: CardPingHistoryBucket, locale: string) {
  if (!bucket.start || !bucket.end) return "";
  const start = new Date(bucket.start);
  const end = new Date(bucket.end);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return "";
  const formatter = new Intl.DateTimeFormat(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export function PingHistoryStrip({
  label,
  buckets,
  metric,
  thresholds,
}: {
  label: string;
  buckets: CardPingHistoryBucket[] | undefined;
  metric: PingMetric;
  thresholds: PingTaskThresholds;
}) {
  const { t, i18n } = useTranslation();
  const displayBuckets = buckets?.length ? buckets : EMPTY_BUCKETS;
  const locale = i18n.resolvedLanguage || "en";
  const latestValue = displayBuckets.at(-1)?.[metric] ?? null;
  const latestTone = pingMetricTone(metric, latestValue, thresholds);
  const latestLabel = formatMetricValue(metric, latestValue, "--");

  return (
    <TooltipProvider>
      <div className="min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2 text-[10px]">
          <span className="text-muted-foreground">{label}</span>
          <span className={cn("shrink-0 font-semibold tabular-nums", textTone[latestTone])}>
            {latestLabel}
          </span>
        </div>
        <div
          className="relative z-30 grid h-4 gap-0.5"
          style={{ gridTemplateColumns: `repeat(${displayBuckets.length}, minmax(0, 1fr))` }}
        >
          {displayBuckets.map((bucket, index) => {
            const value = bucket[metric];
            const coverageLabel = bucket.coverage === null
              ? null
              : t("atlas.ping.dataCoverage", { percent: Math.round(bucket.coverage * 100) });
            const valueLabel = value === null
              ? t("atlas.noData")
              : formatMetricValue(metric, value, t("atlas.noData"));
            const timeLabel = formatBucketTime(bucket, locale);
            const detailLabel = coverageLabel ? `${valueLabel} · ${coverageLabel}` : valueLabel;
            const title = timeLabel ? `${timeLabel} · ${detailLabel}` : detailLabel;
            const hasPartialCoverage = index > 0
              && index < displayBuckets.length - 1
              && value !== null
              && bucket.coverage !== null
              && bucket.coverage < PARTIAL_COVERAGE_THRESHOLD;
            const tone = pingMetricTone(metric, value, thresholds);
            return (
              <Tooltip key={`${bucket.start}-${index}`}>
                <TooltipTrigger asChild>
                  <span
                    className="group/ping-bucket relative min-w-0 cursor-help outline-none hover:z-10"
                    aria-label={title}
                  >
                    <span
                      className={cn(
                        "pointer-events-none absolute inset-0 rounded-[2px] transition-transform duration-150 ease-out group-hover/ping-bucket:scale-[1.65] group-hover/ping-bucket:outline group-hover/ping-bucket:outline-2 group-hover/ping-bucket:outline-background",
                        backgroundTone[tone],
                        hasPartialCoverage && "ring-1 ring-inset ring-amber-300/90",
                      )}
                      style={hasPartialCoverage ? {
                        backgroundImage: "repeating-linear-gradient(135deg, transparent 0 2px, rgb(252 211 77 / 0.9) 2px 3px)",
                      } : undefined}
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="w-48">
                  {timeLabel && (
                    <div className="font-medium tabular-nums">{timeLabel}</div>
                  )}
                  <div className={cn("flex items-center gap-2", timeLabel && "mt-1.5")}>
                    <span className={cn("h-2 w-2 shrink-0 rounded-[2px]", backgroundTone[tone])} />
                    <span className="text-muted-foreground">{label}</span>
                    <span className="ml-auto font-semibold tabular-nums">{valueLabel}</span>
                  </div>
                  {coverageLabel && (
                    <div className="mt-1.5 border-t border-border/60 pt-1.5 text-[11px] text-muted-foreground">
                      {coverageLabel}
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
