"use client";

import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useNodeList, type NodeBasicInfo } from "@/contexts/NodeListContext";
import { useRPC2Call } from "@/contexts/RPC2Context";
import {
  calculateRenewedExpiry,
  dateInputToTimestamp,
  toDateInputValue,
} from "@/lib/renewal";
import { cn } from "@/lib/utils";

function formatDateTime(timestamp: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function NodeRenewalDialog({
  node,
  compact = false,
}: {
  node: NodeBasicInfo;
  compact?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { refresh } = useNodeList();
  const { call } = useRPC2Call();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState(false);
  const locale = i18n.resolvedLanguage || i18n.language;
  const calculation = useMemo(
    () => calculateRenewedExpiry(node.expired_at, node.billing_cycle),
    [node.billing_cycle, node.expired_at],
  );
  const [nextExpiryDate, setNextExpiryDate] = useState(
    calculation.ok ? toDateInputValue(calculation.result.nextTimestamp) : "",
  );

  if (!calculation.ok) return null;

  const { result } = calculation;
  const handleConfirm = async () => {
    const nextTimestamp = dateInputToTimestamp(nextExpiryDate, result.nextTimestamp);
    if (nextTimestamp === null || nextTimestamp <= Date.now()) {
      setDateError(true);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await call("admin:editClient", {
        uuid: node.uuid,
        expired_at: new Date(nextTimestamp).toISOString(),
      });
      refresh();
      setOpen(false);
    } catch (renewalError) {
      setError(renewalError instanceof Error
        ? renewalError.message
        : t("atlas.renewal.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setNextExpiryDate(toDateInputValue(result.nextTimestamp));
          setDateError(false);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={compact ? "outline" : "default"}
          size="sm"
          className={cn(
            compact
              ? "relative z-30 h-7 gap-1.5 px-2 text-[11px]"
              : "gap-1.5",
          )}
          aria-label={t("atlas.renewal.action")}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("atlas.renewal.action")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-border/70 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>{t("atlas.renewal.title", { name: node.name })}</DialogTitle>
          <DialogDescription>{t("atlas.renewal.description")}</DialogDescription>
        </DialogHeader>

        <dl className="divide-y divide-border/60 rounded-md border border-border/60 bg-background/30 px-4">
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-sm text-muted-foreground">{t("atlas.renewal.currentExpiry")}</dt>
            <dd className="text-right text-sm font-medium tabular-nums">
              {formatDateTime(result.currentTimestamp, locale)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-sm text-muted-foreground">{t("atlas.renewal.cycle")}</dt>
            <dd className="text-right text-sm font-medium tabular-nums">
              {t("atlas.detail.days", { count: result.billingCycle })}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-sm text-muted-foreground">{t("atlas.renewal.newExpiry")}</dt>
            <dd className="flex min-w-0 flex-col items-end gap-1.5">
              <Input
                type="date"
                value={nextExpiryDate}
                min={toDateInputValue(Date.now())}
                onChange={(event) => {
                  setNextExpiryDate(event.target.value);
                  setDateError(false);
                }}
                aria-label={t("atlas.renewal.newExpiry")}
                aria-invalid={dateError}
                className={cn(
                  "h-9 w-44 text-right text-sm font-semibold tabular-nums text-primary",
                  dateError && "border-red-500 focus-visible:ring-red-500",
                )}
              />
              <span className="text-[11px] text-muted-foreground">
                {nextExpiryDate
                  ? formatDateTime(
                      dateInputToTimestamp(nextExpiryDate, result.nextTimestamp) || result.nextTimestamp,
                      locale,
                    )
                  : t("atlas.renewal.dateRequired")}
              </span>
            </dd>
          </div>
        </dl>

        <p className="text-xs text-muted-foreground">{t("atlas.renewal.dateHint")}</p>

        {result.startsFromNow && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            {t("atlas.renewal.expiredNotice")}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300">
            {error}
          </p>
        )}
        {dateError && (
          <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300">
            {t("atlas.renewal.invalidDate")}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={() => void handleConfirm()}>
            <RefreshCw className={cn("h-4 w-4", isSubmitting && "animate-spin")} />
            {isSubmitting ? t("atlas.renewal.submitting") : t("atlas.renewal.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
