export function formatUptime(
  seconds: number,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "--";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return days > 0
    ? t("atlas.detail.uptimeDays", { days, hours })
    : t("atlas.detail.uptimeHours", { hours });
}
