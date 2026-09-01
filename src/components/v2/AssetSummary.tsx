"use client";

import { Coins, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useNodeList } from "@/contexts/NodeListContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { convertAmount, loadRates, type LoadedRates } from "@/lib/exchangeRates";
import { buildRemainingValueSnapshot } from "@/lib/remainingValue";
import { STORAGE_KEYS } from "@/lib/storageKeys";

const DISPLAY_CURRENCIES = ["CNY", "USD", "EUR", "GBP"] as const;
type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

function money(currency: string, value: number | null) {
  return value === null ? "--" : `${currency} ${value.toFixed(2)}`;
}

export function AssetSummary() {
  const { t } = useTranslation();
  const { nodeList } = useNodeList();
  const [open, setOpen] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useLocalStorage<DisplayCurrency>(
    STORAGE_KEYS.remainingValueDisplayCurrency,
    "CNY",
  );
  const [rates, setRates] = useState<LoadedRates | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const snapshot = useMemo(() => buildRemainingValueSnapshot(nodeList || []), [nodeList]);

  const refreshRates = useCallback(async (forceRefresh = false) => {
    const sourceCurrencies = Array.from(new Set(snapshot.active.map((item) => item.currencyCode)));
    if (sourceCurrencies.length === 0) return;
    setIsLoadingRates(true);
    setRatesError(null);
    try {
      setRates(await loadRates({ displayCurrency, sourceCurrencies, forceRefresh }));
    } catch {
      setRatesError(t("remainingValue.errorRatesUnavailable"));
    } finally {
      setIsLoadingRates(false);
    }
  }, [displayCurrency, snapshot.active, t]);

  const activeRows = useMemo(() => snapshot.active.map((item) => ({
    ...item,
    remaining: rates
      ? convertAmount(item.remainingValueOriginal, item.currencyCode, displayCurrency, rates.rates)
      : null,
    total: rates
      ? convertAmount(item.totalValueOriginal, item.currencyCode, displayCurrency, rates.rates)
      : null,
    monthly: rates
      ? convertAmount(item.monthlyCostOriginal, item.currencyCode, displayCurrency, rates.rates)
      : null,
  })), [displayCurrency, rates, snapshot.active]);

  const totals = useMemo(() => activeRows.reduce(
    (sum, item) => ({
      remaining: sum.remaining + (item.remaining || 0),
      total: sum.total + (item.total || 0),
      monthly: sum.monthly + (item.monthly || 0),
    }),
    { remaining: 0, total: 0, monthly: 0 },
  ), [activeRows]);

  const handleOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
  };

  useEffect(() => {
    if (open && snapshot.active.length > 0) {
      void refreshRates();
    }
  }, [displayCurrency, open, refreshRates, snapshot.active.length]);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" title={t("remainingValue.title")}>
          <Coins className="h-4 w-4" />
          <span className="sr-only">{t("remainingValue.title")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-hidden border-border/70 bg-card/95 p-0 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4 pr-12">
          <div>
            <DialogTitle>{t("remainingValue.title")}</DialogTitle>
            <DialogDescription className="mt-1">{t("remainingValue.description")}</DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={displayCurrency}
              onChange={(event) => {
                setDisplayCurrency(event.target.value as DisplayCurrency);
                setRates(null);
              }}
              className="h-9 rounded-md border bg-background px-2 text-sm"
              aria-label={t("atlas.assets.displayCurrency")}
            >
              {DISPLAY_CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}
            </select>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => void refreshRates(true)}
              title={t("remainingValue.refreshRates")}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingRates ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="max-h-[calc(88vh-5rem)] space-y-5 overflow-y-auto p-5">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              [t("remainingValue.total"), money(displayCurrency, rates ? totals.remaining : null)],
              [t("remainingValue.totalValue"), money(displayCurrency, rates ? totals.total : null)],
              [t("remainingValue.monthlyCost"), money(displayCurrency, rates ? totals.monthly : null)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border bg-muted/35 p-3">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
              </div>
            ))}
          </section>

          {(ratesError || rates?.isStale) && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {ratesError || t("remainingValue.rateStatus.stale")}
            </p>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t("remainingValue.section.active")}</h3>
            {activeRows.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                {t("remainingValue.empty.active")}
              </p>
            ) : activeRows.map((item) => (
              <div key={item.uuid} className="grid gap-2 rounded-md border bg-muted/20 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{item.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {item.currencyCode} {item.price.toFixed(2)} / {item.billingCycle}d
                  </div>
                </div>
                <div className="text-xs text-muted-foreground sm:text-right">
                  {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : t("atlas.assets.longTerm")}
                </div>
                <div className="text-sm font-semibold tabular-nums sm:text-right">
                  {money(displayCurrency, item.remaining)}
                </div>
              </div>
            ))}
          </section>

          {(snapshot.expired.length > 0 || snapshot.skipped.length > 0) && (
            <section className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-dashed p-3">
                <div className="text-xs text-muted-foreground">{t("remainingValue.filter.expired", { count: snapshot.expired.length })}</div>
                <div className="mt-1 text-lg font-semibold">{snapshot.expired.length}</div>
              </div>
              <div className="rounded-md border border-dashed p-3">
                <div className="text-xs text-muted-foreground">{t("remainingValue.filter.skipped", { count: snapshot.skipped.length })}</div>
                <div className="mt-1 text-lg font-semibold">{snapshot.skipped.length}</div>
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
