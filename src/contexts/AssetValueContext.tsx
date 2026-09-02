"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { useNodeList } from "@/contexts/NodeListContext";
import { convertAmount, loadRates, type RateMap } from "@/lib/exchangeRates";
import { buildRemainingValueSnapshot } from "@/lib/remainingValue";

type CnyAssetValue = {
  monthlyCost: number | null;
  remainingValue: number | null;
};

interface AssetValueContextValue {
  cnyByNode: Record<string, CnyAssetValue>;
  ratesUnavailable: boolean;
}

const AssetValueContext = createContext<AssetValueContextValue | null>(null);

export function AssetValueProvider({ children }: { children: React.ReactNode }) {
  const { nodeList } = useNodeList();
  const snapshot = useMemo(() => buildRemainingValueSnapshot(nodeList || []), [nodeList]);
  const pricedNodes = useMemo(
    () => [...snapshot.active, ...snapshot.expired],
    [snapshot.active, snapshot.expired],
  );
  const sourceCurrencies = useMemo(
    () => Array.from(new Set(pricedNodes.map((item) => item.currencyCode))).sort(),
    [pricedNodes],
  );
  const [rates, setRates] = useState<RateMap>({ CNY: 1 });
  const [ratesUnavailable, setRatesUnavailable] = useState(false);

  useEffect(() => {
    const externalCurrencies = sourceCurrencies.filter((currency) => currency !== "CNY");
    if (externalCurrencies.length === 0) {
      setRatesUnavailable(false);
      return;
    }

    let active = true;
    loadRates({ displayCurrency: "CNY", sourceCurrencies: externalCurrencies })
      .then((loaded) => {
        if (!active) return;
        setRates(loaded.rates);
        setRatesUnavailable(false);
      })
      .catch(() => {
        if (active) setRatesUnavailable(true);
      });

    return () => {
      active = false;
    };
  }, [sourceCurrencies]);

  const cnyByNode = useMemo(() => Object.fromEntries(pricedNodes.map((item) => [
    item.uuid,
    {
      monthlyCost: item.billingCycle > 0
        ? convertAmount(item.monthlyCostOriginal, item.currencyCode, "CNY", rates)
        : null,
      remainingValue: convertAmount(
        item.remainingValueOriginal,
        item.currencyCode,
        "CNY",
        rates,
      ),
    },
  ])), [pricedNodes, rates]);

  const value = useMemo(
    () => ({ cnyByNode, ratesUnavailable }),
    [cnyByNode, ratesUnavailable],
  );

  return (
    <AssetValueContext.Provider value={value}>
      {children}
    </AssetValueContext.Provider>
  );
}

export function useAssetValues() {
  const context = useContext(AssetValueContext);
  if (!context) {
    throw new Error("useAssetValues must be used within AssetValueProvider");
  }
  return context;
}
