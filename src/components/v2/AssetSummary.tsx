"use client";

import { ChevronRight, Coins, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { HeaderTooltip, HEADER_TOOL_BUTTON_CLASS } from "@/components/v2/HeaderTooltip";
import { NodeValueCalculatorDialog } from "@/components/v2/NodeValueCalculatorDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useNodeList, type NodeBasicInfo } from "@/contexts/NodeListContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { convertAmount, loadRates, type LoadedRates } from "@/lib/exchangeRates";
import { resolveExpiry } from "@/lib/expiry";
import { buildRemainingValueSnapshot } from "@/lib/remainingValue";
import { STORAGE_KEYS } from "@/lib/storageKeys";

const DISPLAY_CURRENCIES = ["CNY", "USD", "EUR", "GBP"] as const;
type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

function money(currency: string, value: number | null) {
  return value === null ? "--" : `${currency} ${value.toFixed(2)}`;
}

export function AssetSummary() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language;
  const { nodeList } = useNodeList();
  const [open, setOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<NodeBasicInfo | null>(null);
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

  const activeByUuid = useMemo(
    () => new Map(activeRows.map((item) => [item.uuid, item])),
    [activeRows],
  );
  const expiredByUuid = useMemo(
    () => new Map(snapshot.expired.map((item) => [item.uuid, item])),
    [snapshot.expired],
  );
  const skippedByUuid = useMemo(
    () => new Map(snapshot.skipped.map((item) => [item.uuid, item])),
    [snapshot.skipped],
  );

  const handleOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
  };

  const openNodeCalculator = (node: NodeBasicInfo) => {
    setOpen(false);
    setSelectedNode(node);
  };

  const returnToSummary = () => {
    setSelectedNode(null);
    setOpen(true);
  };

  useEffect(() => {
    if (open && snapshot.active.length > 0) {
      void refreshRates();
    }
  }, [displayCurrency, open, refreshRates, snapshot.active.length]);

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpen}>
        <HeaderTooltip label={t("remainingValue.title")}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={HEADER_TOOL_BUTTON_CLASS}
              aria-label={t("remainingValue.title")}
            >
              <Coins className="h-4 w-4" />
              <span className="sr-only">{t("remainingValue.title")}</span>
            </Button>
          </DialogTrigger>
        </HeaderTooltip>
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
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">{t("remainingValue.section.nodes")}</h3>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {t("remainingValue.nodeCount", { count: nodeList?.length || 0 })}
                </span>
              </div>
              {!nodeList?.length ? (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  {t("remainingValue.empty.none")}
                </p>
              ) : nodeList.map((node) => {
                const active = activeByUuid.get(node.uuid);
                const expired = expiredByUuid.get(node.uuid);
                const skipped = skippedByUuid.get(node.uuid);
                const expiryState = resolveExpiry(node.expired_at);
                const cycle = node.billing_cycle === -1
                  ? t("remainingValue.billingCycle.once")
                  : node.billing_cycle > 0
                    ? t("remainingValue.billingCycle.days", { count: node.billing_cycle })
                    : "--";
                const price = node.price > 0
                  ? `${node.currency || "--"} ${node.price.toFixed(2)} / ${cycle}`
                  : t("remainingValue.calculator.nodePriceUnset");
                const expiry = expiryState.kind === "long-term" || node.billing_cycle === -1
                  ? t("atlas.assets.longTerm")
                  : expiryState.kind === "scheduled" || expiryState.kind === "expired"
                    ? new Date(expiryState.timestamp).toLocaleDateString(locale)
                    : t("remainingValue.calculator.nodeExpiryUnset");

                return (
                  <button
                    key={node.uuid}
                    type="button"
                    onClick={() => openNodeCalculator(node)}
                    className="group grid w-full gap-2 rounded-md border bg-muted/20 p-3 text-left transition-colors hover:border-[var(--accent-7)] hover:bg-[var(--accent-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{node.name}</div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">{price}</div>
                    </div>
                    <div className="text-xs text-muted-foreground sm:text-right">{expiry}</div>
                    <div
                      className="text-sm font-semibold tabular-nums sm:min-w-24 sm:text-right"
                      title={skipped ? t(`remainingValue.skipReason.${skipped.skipReason}`) : undefined}
                    >
                      {active
                        ? money(displayCurrency, active.remaining)
                        : expired
                          ? money(displayCurrency, 0)
                          : "--"}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent-11)]" />
                  </button>
                );
              })}
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

      {selectedNode && (
        <NodeValueCalculatorDialog
          key={selectedNode.uuid}
          node={selectedNode}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) returnToSummary();
          }}
          onBack={returnToSummary}
        />
      )}
    </>
  );
}
