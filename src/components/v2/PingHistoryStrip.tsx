import { useTranslation } from "react-i18next";

import type { CardPingHistoryBucket } from "@/types/atlas";
import { cn } from "@/lib/utils";

const EMPTY_BUCKETS: CardPingHistoryBucket[] = Array.from({ length: 24 }, () => ({
  start: "",
  end: "",
  latency: null,
  loss: null,
}));

type PingMetric = "latency" | "loss";

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
    <div className="min-w-0 space-y-1">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div
        className="grid h-4 gap-0.5"
        style={{ gridTemplateColumns: `repeat(${displayBuckets.length}, minmax(0, 1fr))` }}
      >
        {displayBuckets.map((bucket, index) => {
          const value = bucket[metric];
          const valueLabel = value === null
            ? t("atlas.noData")
            : metric === "latency"
              ? `${Math.round(value)} ms`
              : `${value.toFixed(1)}%`;
          const timeLabel = formatBucketTime(bucket, locale);
          const title = timeLabel ? `${timeLabel} · ${valueLabel}` : valueLabel;
          return (
            <span
              key={`${bucket.start}-${index}`}
              className={cn("min-w-0 rounded-[2px]", metricTone(metric, value))}
              title={title}
              aria-label={title}
            />
          );
        })}
      </div>
    </div>
  );
}
