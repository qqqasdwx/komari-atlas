"use client";

import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { BillingTrafficDay } from "@/types/atlas";
import { formatBytes } from "@/utils/unitHelper";

function parseBillingDate(value: string) {
  return new Date(`${value}T00:00:00+08:00`);
}

export function DailyTrafficChart({ days }: { days: BillingTrafficDay[] }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language;

  return (
    <article className="atlas-chart-panel">
      <div className="mb-4 flex min-h-8 flex-wrap items-start justify-between gap-3">
        <h3 className="text-sm font-semibold">{t("atlas.charts.dailyTraffic")}</h3>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            {t("atlas.metrics.upload")}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {t("atlas.metrics.download")}
          </span>
        </div>
      </div>
      {days.length === 0 ? (
        <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
          {t("atlas.noData")}
        </div>
      ) : (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days} margin={{ top: 8, right: 10, bottom: 0, left: 0 }} barGap={2}>
              <CartesianGrid stroke="var(--atlas-chart-grid)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
                tickFormatter={(value) => parseBillingDate(String(value)).toLocaleDateString(locale, {
                  month: "2-digit",
                  day: "2-digit",
                  timeZone: "Asia/Shanghai",
                })}
              />
              <YAxis
                width={58}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatBytes(Number(value))}
              />
              <Tooltip
                cursor={{ fill: "var(--accent)" }}
                contentStyle={{
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
                labelFormatter={(value) => parseBillingDate(String(value)).toLocaleDateString(locale, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  timeZone: "Asia/Shanghai",
                })}
                formatter={(value, name) => [
                  formatBytes(Number(value)),
                  name === "up" ? t("atlas.metrics.upload") : t("atlas.metrics.download"),
                ]}
              />
              <Bar dataKey="up" name="up" fill="#38bdf8" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="down" name="down" fill="#34d399" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}
