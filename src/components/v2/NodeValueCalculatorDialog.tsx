"use client";

import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  CalendarDays,
  Coins,
  Cpu,
  Gauge,
  HardDrive,
  MapPin,
  MemoryStick,
  Network,
  RefreshCw,
  Server,
  Tag,
  WalletCards,
} from "lucide-react";
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CountryFlag, OperatingSystemIcon } from "@/components/v2/NodeIdentity";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import { convertAmount, loadRates } from "@/lib/exchangeRates";
import { resolveExpiry, resolveExpiryTimestamp } from "@/lib/expiry";
import {
  calculateNodeRemainingValue,
  normalizeCurrencyCode,
  type NodeValueCalculationError,
  type NodeValueCalculationResult,
} from "@/lib/remainingValue";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/utils/unitHelper";

const CURRENCIES = [
  "CNY",
  "USD",
  "EUR",
  "GBP",
  "HKD",
  "JPY",
  "KRW",
  "SGD",
  "AUD",
  "CAD",
  "CHF",
] as const;

const BILLING_CYCLES = [1, 3, 6, 12, 24, 36, 48, 60] as const;

type CalculatorForm = {
  renewalAmount: string;
  currency: string;
  customRate: string;
  billingMonths: string;
  expiryDate: string;
  transactionDate: string;
  salePrice: string;
  vendor: string;
  productName: string;
  features: string;
  cpu: string;
  memory: string;
  storage: string;
  bandwidth: string;
  trafficLimit: string;
  location: string;
};

function localCalendarDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function expiryDateForInput(node: NodeBasicInfo) {
  const expiry = resolveExpiry(node.expired_at);
  if (expiry.kind === "unset" || expiry.kind === "long-term") return "";

  const timestamp = resolveExpiryTimestamp(node.expired_at);
  if (timestamp === null) return "";

  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nearestBillingMonths(billingDays: number) {
  if (!Number.isFinite(billingDays) || billingDays <= 0) return "12";

  const approximateMonths = billingDays / 30;
  return String(BILLING_CYCLES.reduce((closest, candidate) => (
    Math.abs(candidate - approximateMonths) < Math.abs(closest - approximateMonths)
      ? candidate
      : closest
  )));
}

function createForm(node: NodeBasicInfo): CalculatorForm {
  const currency = normalizeCurrencyCode(node.currency) || "CNY";
  const cpuDetails = [
    node.cpu_cores > 0 ? `${node.cpu_cores} vCPU` : "",
    node.cpu_name.trim(),
  ].filter(Boolean).join(" · ");

  return {
    renewalAmount: node.price > 0 ? String(node.price) : "",
    currency,
    customRate: currency === "CNY" ? "1" : "",
    billingMonths: nearestBillingMonths(node.billing_cycle),
    expiryDate: expiryDateForInput(node),
    transactionDate: localCalendarDate(),
    salePrice: "",
    vendor: "",
    productName: node.name,
    features: (node.public_remark || node.remark).trim(),
    cpu: cpuDetails,
    memory: node.mem_total > 0 ? formatBytes(node.mem_total) : "",
    storage: node.disk_total > 0 ? formatBytes(node.disk_total) : "",
    bandwidth: "",
    trafficLimit: node.traffic_limit > 0 ? formatBytes(node.traffic_limit) : "",
    location: node.region.trim(),
  };
}

function FormField({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid min-w-0 gap-1.5", className)}>
      <span className="flex min-h-5 items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        {hint && <span className="truncate font-normal tabular-nums">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function ResultRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 border-t border-border/60 py-3 first:border-t-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("max-w-[62%] break-words text-right text-sm font-medium tabular-nums text-foreground", valueClassName)}>
        {value || "--"}
      </dd>
    </div>
  );
}

function ResultSpec({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 border-t border-border/60 py-3 first:border-t-0 even:border-l even:pl-4 odd:pr-4 [&:nth-child(2)]:border-t-0">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </dt>
      <dd className="mt-1.5 break-words text-sm font-medium text-foreground">{value || "--"}</dd>
    </div>
  );
}

function formatMoney(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRate(value: number) {
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

export function NodeValueCalculatorDialog({
  node,
  open,
  onOpenChange,
  onBack,
}: {
  node: NodeBasicInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language;
  const [form, setForm] = useState<CalculatorForm>(() => createForm(node));
  const [calculation, setCalculation] = useState<NodeValueCalculationResult | null>(null);
  const [validationError, setValidationError] = useState<NodeValueCalculationError | null>(null);
  const [referenceRate, setReferenceRate] = useState<number | null>(form.currency === "CNY" ? 1 : null);
  const [rateFetchedAt, setRateFetchedAt] = useState<string | null>(null);
  const [rateIsStale, setRateIsStale] = useState(false);
  const [rateError, setRateError] = useState(false);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const rateRequestId = useRef(0);

  const setField = <Key extends keyof CalculatorForm>(key: Key, value: CalculatorForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setValidationError(null);
  };

  const refreshReferenceRate = useCallback(async (currency: string, forceRefresh = false) => {
    const requestId = ++rateRequestId.current;
    setRateError(false);

    if (currency === "CNY") {
      setReferenceRate(1);
      setRateFetchedAt(null);
      setRateIsStale(false);
      setIsLoadingRate(false);
      setForm((current) => current.currency === currency && !current.customRate.trim()
        ? { ...current, customRate: "1" }
        : current);
      return;
    }

    setIsLoadingRate(true);
    try {
      const loaded = await loadRates({
        displayCurrency: "CNY",
        sourceCurrencies: [currency],
        forceRefresh,
      });
      const nextRate = convertAmount(1, currency, "CNY", loaded.rates);
      if (nextRate === null) throw new Error("missing exchange rate");
      if (requestId !== rateRequestId.current) return;

      setReferenceRate(nextRate);
      setRateFetchedAt(loaded.fetchedAt);
      setRateIsStale(loaded.isStale);
      setForm((current) => current.currency === currency && !current.customRate.trim()
        ? { ...current, customRate: formatRate(nextRate) }
        : current);
    } catch {
      if (requestId !== rateRequestId.current) return;
      setReferenceRate(null);
      setRateFetchedAt(null);
      setRateIsStale(false);
      setRateError(true);
    } finally {
      if (requestId === rateRequestId.current) setIsLoadingRate(false);
    }
  }, []);

  useEffect(() => {
    void refreshReferenceRate(form.currency);
  }, [form.currency, refreshReferenceRate]);

  const rateHint = useMemo(() => {
    if (isLoadingRate) return t("remainingValue.calculator.rate.loading");
    if (rateError) return t("remainingValue.calculator.rate.unavailable");
    if (rateIsStale) return t("remainingValue.calculator.rate.stale");
    if (rateFetchedAt) {
      return t("remainingValue.calculator.rate.updatedAt", {
        value: new Date(rateFetchedAt).toLocaleDateString(locale),
      });
    }
    return undefined;
  }, [isLoadingRate, locale, rateError, rateFetchedAt, rateIsStale, t]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = calculateNodeRemainingValue({
      renewalAmount: Number(form.renewalAmount),
      exchangeRate: Number(form.customRate),
      billingMonths: Number(form.billingMonths),
      expiryDate: form.expiryDate,
      transactionDate: form.transactionDate,
      salePrice: form.salePrice.trim() ? Number(form.salePrice) : undefined,
    });

    if (!result.ok) {
      setValidationError(result.error);
      return;
    }

    setValidationError(null);
    setCalculation(result.result);
  };

  const premiumTone = calculation?.premiumAmountCny == null
    ? "text-muted-foreground"
    : calculation.premiumAmountCny > 0
      ? "text-destructive"
      : "text-[var(--chart-2)]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-hidden border-border/70 bg-card/95 p-0 backdrop-blur-xl">
        <div className="flex items-start gap-3 border-b px-5 py-4 pr-12">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onBack}
            title={t("remainingValue.calculator.backToNodes")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">{t("remainingValue.calculator.backToNodes")}</span>
          </Button>
          <div className="min-w-0">
            <DialogTitle className="truncate">
              {calculation
                ? t("remainingValue.calculator.posterTitle")
                : form.productName || node.name}
            </DialogTitle>
            <DialogDescription className="mt-1">
              {calculation
                ? form.productName || node.name
                : t("remainingValue.calculator.formDescription")}
            </DialogDescription>
          </div>
        </div>

        {calculation ? (
          <div className="max-h-[calc(92vh-4.75rem)] overflow-y-auto">
            <div className="bg-muted/20 p-3 sm:p-6">
              <article className="mx-auto max-w-3xl overflow-hidden rounded-md border border-border/80 bg-[var(--atlas-panel-strong)] text-foreground shadow-lg">
                <header className="border-b border-border/70 bg-muted/20 px-5 py-5 sm:px-7 sm:py-6">
                  <div className="flex items-start justify-between gap-5">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-primary">
                        {t("remainingValue.calculator.posterKicker")}
                      </div>
                      <h2 className="mt-1.5 break-words text-2xl font-semibold sm:text-3xl">
                        {form.productName || node.name}
                      </h2>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Server className="h-3.5 w-3.5" />
                          {form.vendor || t("remainingValue.calculator.result.vendorUnset")}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CountryFlag region={form.location} className="h-3.5" />
                          {form.location || t("remainingValue.calculator.result.locationUnset")}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <OperatingSystemIcon os={node.os} className="h-3.5 w-3.5 opacity-100" />
                          {node.os || "--"}
                        </span>
                      </div>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
                      <WalletCards className="h-5 w-5" />
                    </div>
                  </div>
                </header>

                <section className="grid border-b border-border/70 sm:grid-cols-[minmax(0,3fr)_minmax(15rem,2fr)]">
                  <div className="bg-primary/10 px-5 py-6 sm:px-7 sm:py-8">
                    <div className="flex items-center gap-2 text-xs font-medium text-primary">
                      <Coins className="h-4 w-4" />
                      {t("remainingValue.calculator.result.remainingValue")}
                    </div>
                    <div className="mt-3 break-words text-4xl font-semibold tabular-nums text-foreground sm:text-5xl">
                      {formatMoney(calculation.remainingValueCny, locale)}
                    </div>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-primary/20 bg-background/45 px-2.5 py-1.5 text-xs font-medium text-foreground">
                      <Gauge className="h-3.5 w-3.5" />
                      {t("remainingValue.calculator.result.days", { count: calculation.remainingDays })}
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 border-t border-border/70 bg-card/35 sm:grid-cols-1 sm:border-l sm:border-t-0">
                    <div className="min-w-0 px-4 py-4 sm:border-b sm:border-border/70 sm:px-5 sm:py-5">
                      <dt className="text-xs text-muted-foreground">
                        {t("remainingValue.calculator.result.salePrice")}
                      </dt>
                      <dd className="mt-1.5 break-words text-lg font-semibold tabular-nums text-foreground">
                        {calculation.salePriceCny === null ? "--" : formatMoney(calculation.salePriceCny, locale)}
                      </dd>
                    </div>
                    <div className="min-w-0 border-l border-border/70 px-4 py-4 sm:border-l-0 sm:px-5 sm:py-5">
                      <dt className="text-xs text-muted-foreground">
                        {t("remainingValue.calculator.result.premium")}
                      </dt>
                      <dd className={cn("mt-1.5 break-words text-lg font-semibold tabular-nums", premiumTone)}>
                        {calculation.premiumAmountCny === null || calculation.premiumRate === null
                          ? "--"
                          : `${formatMoney(calculation.premiumAmountCny, locale)} · ${new Intl.NumberFormat(locale, {
                            style: "percent",
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          }).format(calculation.premiumRate)}`}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-border/70 bg-muted/15 px-5 py-4 sm:px-7">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">
                      {t("remainingValue.calculator.result.transactionDate")}
                    </div>
                    <div className="mt-1 text-sm font-semibold tabular-nums">{form.transactionDate}</div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="hidden h-px w-5 bg-border sm:block" />
                    <ArrowRight className="h-4 w-4" />
                    <span className="hidden h-px w-5 bg-border sm:block" />
                  </div>
                  <div className="min-w-0 text-right">
                    <div className="text-xs text-muted-foreground">
                      {t("remainingValue.calculator.result.expiryDate")}
                    </div>
                    <div className="mt-1 text-sm font-semibold tabular-nums">{form.expiryDate}</div>
                  </div>
                </section>

                <section className="grid md:grid-cols-2">
                  <div className="border-b border-border/70 px-5 py-5 md:border-b-0 md:border-r sm:px-7">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {t("remainingValue.calculator.sections.calculation")}
                    </h3>
                    <dl className="mt-3">
                      <ResultRow
                        label={t("remainingValue.calculator.result.renewalPlan")}
                        value={`${form.currency} ${Number(form.renewalAmount).toFixed(2)} · ${t(`remainingValue.calculator.cycles.${form.billingMonths}`)}`}
                      />
                      <ResultRow
                        label={t("remainingValue.calculator.result.renewalPrice")}
                        value={formatMoney(calculation.renewalPriceCny, locale)}
                      />
                      <ResultRow
                        label={t("remainingValue.calculator.result.annualPrice")}
                        value={formatMoney(calculation.annualPriceCny, locale)}
                      />
                      <ResultRow
                        label={t("remainingValue.calculator.result.exchangeRate")}
                        value={`1 ${form.currency} = ${formatRate(Number(form.customRate))} CNY`}
                      />
                    </dl>
                  </div>

                  <div className="px-5 py-5 sm:px-7">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <Server className="h-4 w-4 text-primary" />
                      {t("remainingValue.calculator.sections.specifications")}
                    </h3>
                    <dl className="mt-3 grid grid-cols-2">
                      <ResultSpec icon={<Cpu className="h-3.5 w-3.5" />} label={t("remainingValue.calculator.fields.cpu")} value={form.cpu} />
                      <ResultSpec icon={<MemoryStick className="h-3.5 w-3.5" />} label={t("remainingValue.calculator.fields.memory")} value={form.memory} />
                      <ResultSpec icon={<HardDrive className="h-3.5 w-3.5" />} label={t("remainingValue.calculator.fields.storage")} value={form.storage} />
                      <ResultSpec icon={<Network className="h-3.5 w-3.5" />} label={t("remainingValue.calculator.fields.bandwidth")} value={form.bandwidth} />
                      <ResultSpec icon={<Gauge className="h-3.5 w-3.5" />} label={t("remainingValue.calculator.fields.trafficLimit")} value={form.trafficLimit} />
                      <ResultSpec icon={<MapPin className="h-3.5 w-3.5" />} label={t("remainingValue.calculator.fields.location")} value={form.location} />
                    </dl>
                  </div>
                </section>

                {form.features && (
                  <section className="border-t border-border/70 bg-muted/20 px-5 py-4 sm:px-7">
                    <div className="flex gap-3">
                      <Tag className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">
                          {t("remainingValue.calculator.fields.features")}
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-foreground">
                          {form.features}
                        </p>
                      </div>
                    </div>
                  </section>
                )}

                <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-muted/25 px-5 py-3 text-[10px] text-muted-foreground sm:px-7">
                  <span>Komari Atlas</span>
                  <span>{t("remainingValue.calculator.result.basis")}</span>
                </footer>
              </article>
            </div>

            <DialogFooter className="sticky bottom-0 gap-2 border-t bg-card/95 px-5 py-4 backdrop-blur-xl sm:px-6">
              <DialogClose asChild>
                <Button type="button" variant="outline">{t("remainingValue.calculator.backToNodes")}</Button>
              </DialogClose>
              <Button type="button" onClick={() => setCalculation(null)}>
                <ArrowLeft className="h-4 w-4" />
                {t("remainingValue.calculator.editAgain")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form className="max-h-[calc(92vh-4.75rem)] overflow-y-auto" onSubmit={handleSubmit}>
            <div className="divide-y divide-border/70 px-5 sm:px-6">
              <section className="space-y-3 py-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                  {t("remainingValue.calculator.sections.pricing")}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField
                    label={t("remainingValue.calculator.fields.referenceRate")}
                    hint={rateHint}
                  >
                    <div className="flex gap-2">
                      <Input
                        value={referenceRate === null ? "" : formatRate(referenceRate)}
                        readOnly
                        placeholder="--"
                        className="tabular-nums"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => void refreshReferenceRate(form.currency, true)}
                        disabled={isLoadingRate}
                        title={t("remainingValue.refreshRates")}
                      >
                        <RefreshCw className={cn("h-4 w-4", isLoadingRate && "animate-spin")} />
                        <span className="sr-only">{t("remainingValue.refreshRates")}</span>
                      </Button>
                    </div>
                  </FormField>
                  <FormField label={t("remainingValue.calculator.fields.customRate")}>
                    <Input
                      type="number"
                      min="0"
                      step="0.0001"
                      inputMode="decimal"
                      value={form.customRate}
                      onChange={(event) => setField("customRate", event.target.value)}
                      required
                    />
                  </FormField>
                  <FormField label={t("remainingValue.calculator.fields.currency")}>
                    <select
                      value={form.currency}
                      onChange={(event) => {
                        setField("currency", event.target.value);
                        setField("customRate", event.target.value === "CNY" ? "1" : "");
                      }}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {CURRENCIES.map((currency) => (
                        <option key={currency} value={currency}>
                          {t(`remainingValue.calculator.currencies.${currency}`)} ({currency})
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label={t("remainingValue.calculator.fields.renewalAmount")}>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={form.renewalAmount}
                      onChange={(event) => setField("renewalAmount", event.target.value)}
                      required
                    />
                  </FormField>
                  <FormField label={t("remainingValue.calculator.fields.billingCycle")}>
                    <select
                      value={form.billingMonths}
                      onChange={(event) => setField("billingMonths", event.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {BILLING_CYCLES.map((months) => (
                        <option key={months} value={months}>
                          {t(`remainingValue.calculator.cycles.${months}`)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label={t("remainingValue.calculator.fields.salePrice")}>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={form.salePrice}
                      onChange={(event) => setField("salePrice", event.target.value)}
                    />
                  </FormField>
                  <FormField label={t("remainingValue.calculator.fields.expiryDate")}>
                    <Input
                      type="date"
                      value={form.expiryDate}
                      min={form.transactionDate || undefined}
                      onChange={(event) => setField("expiryDate", event.target.value)}
                      required
                    />
                  </FormField>
                  <FormField label={t("remainingValue.calculator.fields.transactionDate")}>
                    <Input
                      type="date"
                      value={form.transactionDate}
                      max={form.expiryDate || undefined}
                      onChange={(event) => setField("transactionDate", event.target.value)}
                      required
                    />
                  </FormField>
                </div>
              </section>

              <section className="space-y-3 py-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  {t("remainingValue.calculator.sections.product")}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label={t("remainingValue.calculator.fields.vendor")}>
                    <Input value={form.vendor} onChange={(event) => setField("vendor", event.target.value)} />
                  </FormField>
                  <FormField label={t("remainingValue.calculator.fields.productName")}>
                    <Input value={form.productName} onChange={(event) => setField("productName", event.target.value)} />
                  </FormField>
                  <FormField label={t("remainingValue.calculator.fields.features")} className="sm:col-span-2">
                    <textarea
                      value={form.features}
                      onChange={(event) => setField("features", event.target.value)}
                      rows={2}
                      className="min-h-20 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </FormField>
                </div>
              </section>

              <section className="space-y-3 py-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  {t("remainingValue.calculator.sections.specifications")}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label={t("remainingValue.calculator.fields.cpu")}>
                    <Input value={form.cpu} onChange={(event) => setField("cpu", event.target.value)} />
                  </FormField>
                  <FormField label={t("remainingValue.calculator.fields.memory")}>
                    <Input value={form.memory} onChange={(event) => setField("memory", event.target.value)} />
                  </FormField>
                  <FormField label={t("remainingValue.calculator.fields.storage")}>
                    <Input value={form.storage} onChange={(event) => setField("storage", event.target.value)} />
                  </FormField>
                  <FormField label={t("remainingValue.calculator.fields.bandwidth")}>
                    <Input value={form.bandwidth} onChange={(event) => setField("bandwidth", event.target.value)} />
                  </FormField>
                  <FormField label={t("remainingValue.calculator.fields.trafficLimit")}>
                    <Input value={form.trafficLimit} onChange={(event) => setField("trafficLimit", event.target.value)} />
                  </FormField>
                  <FormField label={t("remainingValue.calculator.fields.location")}>
                    <Input value={form.location} onChange={(event) => setField("location", event.target.value)} />
                  </FormField>
                </div>
              </section>
            </div>

            {validationError && (
              <p className="mx-5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:mx-6">
                {t(`remainingValue.calculator.errors.${validationError}`)}
              </p>
            )}

            <DialogFooter className="sticky bottom-0 mt-5 gap-2 border-t bg-card/95 px-5 py-4 backdrop-blur-xl sm:px-6">
              <Button type="button" variant="outline" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
                {t("remainingValue.calculator.backToNodes")}
              </Button>
              <Button type="submit">
                <Calculator className="h-4 w-4" />
                {t("remainingValue.calculator.calculate")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
