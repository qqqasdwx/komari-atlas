import { useTranslation } from "react-i18next";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CardPingHistoryBucket } from "@/types/atlas";
import { cn } from "@/lib/utils";

const EMPTY_BUCKETS: CardPingHistoryBucket[] = Array.from({ length: 24 }, () => ({
  start: "",
  end: "",
  latency: null,
  loss: null,
  coverage: null,
}));

type PingMetric = "latency" | "loss";
const PARTIAL_COVERAGE_THRESHOLD = 0.95;

function metricTone(metric: PingMetric, value: number | null) {
  if (value === null) return "bg-muted-foreground/20";
  if (metric === "latency") {
    if (value <= 80) return "bg-emerald-500";
    if (value <= 180) return "bg-amber-500";
    return "bg-red-500";
  }
  if (value <= 1) return "bg-emerald-500";
  if (value <= 5) return "bg-amber-500";
  return "bg-red-500";
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
}: {
  label: string;
  buckets: CardPingHistoryBucket[] | undefined;
  metric: PingMetric;
}) {
  const { t, i18n } = useTranslation();
  const displayBuckets = buckets?.length ? buckets : EMPTY_BUCKETS;
  const locale = i18n.resolvedLanguage || "en";

  return (
    <TooltipProvider>
      <div className="min-w-0 space-y-1">
        <div className="text-[10px] text-muted-foreground">{label}</div>
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
              : metric === "latency"
                ? `${Math.round(value)} ms`
                : `${value.toFixed(1)}%`;
            const timeLabel = formatBucketTime(bucket, locale);
            const detailLabel = coverageLabel ? `${valueLabel} · ${coverageLabel}` : valueLabel;
            const title = timeLabel ? `${timeLabel} · ${detailLabel}` : detailLabel;
            const hasPartialCoverage = index > 0
              && index < displayBuckets.length - 1
              && value !== null
              && bucket.coverage !== null
              && bucket.coverage < PARTIAL_COVERAGE_THRESHOLD;
            return (
              <Tooltip key={`${bucket.start}-${index}`}>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "relative min-w-0 cursor-help rounded-[2px] outline-none transition-transform duration-150 ease-out hover:z-10 hover:scale-[1.65] hover:ring-1 hover:ring-background focus-visible:z-10 focus-visible:scale-[1.65] focus-visible:ring-2 focus-visible:ring-ring",
                      metricTone(metric, value),
                      hasPartialCoverage && "ring-1 ring-inset ring-amber-300/90",
                    )}
                    style={hasPartialCoverage ? {
                      backgroundImage: "repeating-linear-gradient(135deg, transparent 0 2px, rgb(252 211 77 / 0.9) 2px 3px)",
                    } : undefined}
                    aria-label={title}
                  />
                </TooltipTrigger>
                <TooltipContent className="w-48">
                  {timeLabel && (
                    <div className="font-medium tabular-nums">{timeLabel}</div>
                  )}
                  <div className={cn("flex items-center gap-2", timeLabel && "mt-1.5")}>
                    <span className={cn("h-2 w-2 shrink-0 rounded-[2px]", metricTone(metric, value))} />
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
