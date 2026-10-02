"use client";

import { History, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useNodeChanges } from "@/contexts/NodeChangeContext";
import { resolveExpiry } from "@/lib/expiry";
import type { NodeChangeField, NodeChangeEvent, NodeSnapshotValue } from "@/lib/nodeChanges";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/utils/unitHelper";

const BYTE_FIELDS = new Set<NodeChangeField>([
  "mem_total",
  "swap_total",
  "disk_total",
  "traffic_limit",
]);

const SENSITIVE_FIELDS = new Set<NodeChangeField>([
  "ipv4",
  "ipv6",
  "price",
  "expired_at",
  "tags",
  "remark",
  "public_remark",
]);

function formatValue(
  field: NodeChangeField,
  value: NodeSnapshotValue,
  locale: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (value === "") return t("atlas.noData");
  if (BYTE_FIELDS.has(field) && typeof value === "number") return formatBytes(value);
  if (field === "expired_at") {
    const expiry = resolveExpiry(String(value));
    if (expiry.kind === "long-term") return t("atlas.assets.longTerm");
    if (expiry.kind === "scheduled" || expiry.kind === "expired") {
      return new Date(expiry.timestamp).toLocaleString(locale);
    }
  }
  return String(value);
}

function ChangeEventRow({
  event,
  locale,
  privacyMode,
}: {
  event: NodeChangeEvent;
  locale: string;
  privacyMode: boolean;
}) {
  const { t } = useTranslation();
  return (
    <article className="border-t border-border/50 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="text-[10px] text-muted-foreground">
        {new Date(event.changedAt).toLocaleString(locale)}
      </div>
      <div className="mt-2 space-y-1.5">
        {event.fields.map((change) => {
          const concealed = privacyMode && SENSITIVE_FIELDS.has(change.field);
          return (
            <div key={change.field} className="grid gap-1 text-xs sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-baseline">
              <span className="font-medium text-muted-foreground">
                {t(`atlas.change.fields.${change.field}`)}
              </span>
              <div className="flex min-w-0 items-baseline gap-2">
                <span className={cn(
                  "min-w-0 truncate text-muted-foreground line-through decoration-border",
                  concealed && "select-none blur-[5px]",
                )}>
                  {formatValue(change.field, change.previous, locale, t)}
                </span>
                <span className="shrink-0 text-muted-foreground">→</span>
                <span className={cn(
                  "min-w-0 truncate font-medium",
                  concealed && "select-none blur-[5px]",
                )}>
                  {formatValue(change.field, change.current, locale, t)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function NodeChangeHistory({
  uuid,
  privacyMode,
}: {
  uuid: string;
  privacyMode: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { changesByNode, clearNodeChanges } = useNodeChanges();
  const events = changesByNode[uuid] || [];
  const locale = i18n.resolvedLanguage || i18n.language;

  return (
    <section className="atlas-detail-section">
      <div className="atlas-section-heading">
        <div>
          <span className="atlas-section-index">04</span>
          <h2>{t("atlas.change.title")}</h2>
        </div>
        {events.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground"
            onClick={() => clearNodeChanges(uuid)}
          >
            <Trash2 className="h-3 w-3" />
            {t("atlas.change.clear")}
          </Button>
        )}
      </div>
      <div className="atlas-glass-panel p-4">
        {events.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <History className="h-4 w-4" />
            {t("atlas.change.empty")}
          </div>
        ) : (
          <div className="max-h-[28rem] overflow-y-auto pr-1">
            {events.map((event) => (
              <ChangeEventRow
                key={event.changedAt + event.fields.map((field) => field.field).join(",")}
                event={event}
                locale={locale}
                privacyMode={privacyMode}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
