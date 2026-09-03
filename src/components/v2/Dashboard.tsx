"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  Search,
  Server,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { NodeCard } from "@/components/v2/NodeCard";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAssetValues } from "@/contexts/AssetValueContext";
import { useLiveData } from "@/contexts/LiveDataContext";
import { useNodeList } from "@/contexts/NodeListContext";
import {
  sortDashboardNodeIds,
  type DashboardSortDirection,
  type DashboardSortKey,
} from "@/lib/dashboardSort";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/utils/unitHelper";

function isExpiring(expiredAt: string) {
  const value = new Date(expiredAt).getTime();
  if (!Number.isFinite(value)) return false;
  const days = (value - Date.now()) / (24 * 60 * 60 * 1000);
  return days >= 0 && days <= 30;
}

export function Dashboard({ privacyMode }: { privacyMode: boolean }) {
  const { t } = useTranslation();
  const { nodeList, isLoading, error, refresh } = useNodeList();
  const { live_data, showCallout } = useLiveData();
  const { cnyByNode } = useAssetValues();
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");
  const [sortKey, setSortKey] = useState<DashboardSortKey>("default");
  const [sortDirection, setSortDirection] = useState<DashboardSortDirection>("asc");
  const [sortedNodeIds, setSortedNodeIds] = useState<string[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nodes = useMemo(() => nodeList || [], [nodeList]);
  const live = useMemo(() => live_data?.data.data || {}, [live_data]);
  const groups = useMemo(
    () => Array.from(new Set(nodes.map((node) => node.group).filter(Boolean))).sort(),
    [nodes],
  );

  const filteredNodes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return nodes.filter((node) => {
      if (group !== "all" && node.group !== group) return false;
      if (!term) return true;
      return [node.name, node.region, node.os, node.arch, node.group]
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [group, nodes, search]);

  const displayedNodes = useMemo(() => {
    if (!sortedNodeIds) return filteredNodes;

    const rankById = new Map(sortedNodeIds.map((uuid, index) => [uuid, index]));
    return filteredNodes
      .map((node, index) => ({ node, index, rank: rankById.get(node.uuid) }))
      .sort((left, right) => {
        if (left.rank === undefined && right.rank === undefined) return left.index - right.index;
        if (left.rank === undefined) return 1;
        if (right.rank === undefined) return -1;
        return left.rank - right.rank;
      })
      .map((item) => item.node);
  }, [filteredNodes, sortedNodeIds]);

  const totals = useMemo(() => {
    const online = nodes.filter((node) => live[node.uuid]?.online);
    return {
      online: online.length,
      offline: Math.max(0, nodes.length - online.length),
      expiring: nodes.filter((node) => isExpiring(node.expired_at)).length,
      up: online.reduce((sum, node) => sum + (live[node.uuid]?.network.up || 0), 0),
      down: online.reduce((sum, node) => sum + (live[node.uuid]?.network.down || 0), 0),
    };
  }, [live, nodes]);

  if (isLoading) {
    return <div className="atlas-content py-24 text-center text-sm text-muted-foreground">{t("atlas.loading")}</div>;
  }

  if (error) {
    return (
      <div className="atlas-content py-24 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-red-500" />
        <p className="mt-3 text-sm">{error}</p>
        <Button className="mt-4" onClick={refresh}>{t("atlas.retry")}</Button>
      </div>
    );
  }

  const summary = [
    { label: t("atlas.summary.total"), value: nodes.length, icon: Server },
    { label: t("atlas.summary.online"), value: totals.online, icon: Activity, tone: "text-emerald-500" },
    { label: t("atlas.summary.offline"), value: totals.offline, icon: AlertTriangle, tone: totals.offline ? "text-red-500" : "text-muted-foreground" },
    { label: t("atlas.summary.expiring"), value: totals.expiring, icon: AlertTriangle, tone: totals.expiring ? "text-amber-500" : "text-muted-foreground" },
    { label: t("atlas.summary.speed"), value: `↑ ${formatBytes(totals.up)}/s  ↓ ${formatBytes(totals.down)}/s`, icon: ArrowUp },
  ];
  const sortOptions: Array<{ value: DashboardSortKey; label: string }> = [
    { value: "default", label: t("atlas.sort.default") },
    { value: "cpu", label: t("atlas.sort.cpu") },
    { value: "memory", label: t("atlas.sort.memory") },
    { value: "disk", label: t("atlas.sort.disk") },
    { value: "tcp", label: t("atlas.sort.tcp") },
    { value: "upload", label: t("atlas.sort.upload") },
    { value: "download", label: t("atlas.sort.download") },
    { value: "monthlyCost", label: t("atlas.sort.monthlyCost") },
    { value: "expiry", label: t("atlas.sort.expiry") },
  ];
  const activeSortLabel = sortOptions.find((option) => option.value === sortKey)?.label
    || t("atlas.sort.default");
  const applySort = (nextKey: DashboardSortKey, nextDirection: DashboardSortDirection) => {
    setSortKey(nextKey);
    setSortDirection(nextDirection);
    setSortedNodeIds(
      nextKey === "default"
        ? null
        : sortDashboardNodeIds(nodes, live, cnyByNode, nextKey, nextDirection),
    );
  };
  const toggleSortDirection = () => {
    const nextDirection = sortDirection === "asc" ? "desc" : "asc";
    applySort(sortKey, nextDirection);
  };

  return (
    <main className="atlas-content space-y-5 py-5 sm:py-7">
      {!showCallout && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t("atlas.connection.degraded")}
        </div>
      )}

      <section className="atlas-summary-strip" aria-label={t("atlas.summary.title")}>
        {summary.map((item) => (
          <div key={item.label} className="min-w-0 px-3 py-2 sm:px-4">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <item.icon className="h-3.5 w-3.5" />
              <span className="truncate">{item.label}</span>
            </div>
            <div className={cn("mt-1 truncate text-sm font-semibold tabular-nums sm:text-base", item.tone)}>
              {item.value}
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("atlas.search")}
            className="h-10 bg-card/70 pl-9 pr-9 backdrop-blur-md"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
              onClick={() => {
                setSearch("");
                inputRef.current?.focus();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex w-full min-w-0 items-center justify-end gap-2 lg:w-auto">
          {groups.length > 0 && (
            <div className="min-w-0 flex-1 overflow-x-auto pb-1 lg:flex-none">
              <Tabs value={group} onValueChange={setGroup}>
                <TabsList className="h-10 w-max border bg-card/65 p-1 backdrop-blur-md">
                  <TabsTrigger value="all">{t("common.all")}</TabsTrigger>
                  {groups.map((item) => <TabsTrigger key={item} value={item}>{item}</TabsTrigger>)}
                </TabsList>
              </Tabs>
            </div>
          )}

          <div className="flex shrink-0 items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 max-w-44 justify-between gap-2 bg-card/70 px-3 backdrop-blur-md sm:max-w-48"
                  aria-label={t("atlas.sort.label")}
                >
                  <ArrowUpDown className="h-4 w-4" />
                  <span className="truncate">{activeSortLabel}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuRadioGroup value={sortKey}>
                  {sortOptions.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => applySort(option.value, sortDirection)}
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              className="h-10 w-10 gap-1.5 bg-card/70 px-0 backdrop-blur-md sm:w-auto sm:px-3"
              disabled={sortKey === "default"}
              onClick={toggleSortDirection}
              aria-label={sortDirection === "asc" ? t("atlas.sort.ascending") : t("atlas.sort.descending")}
              title={sortDirection === "asc" ? t("atlas.sort.ascending") : t("atlas.sort.descending")}
            >
              {sortDirection === "asc"
                ? <ArrowUp className="h-4 w-4" />
                : <ArrowDown className="h-4 w-4" />}
              <span className="hidden sm:inline">
                {sortDirection === "asc" ? t("atlas.sort.ascending") : t("atlas.sort.descending")}
              </span>
            </Button>
          </div>
        </div>
      </section>

      {displayedNodes.length === 0 ? (
        <section className="atlas-glass-panel py-16 text-center text-sm text-muted-foreground">
          {t("atlas.noMatchingNodes")}
        </section>
      ) : (
        <section className="atlas-node-grid">
          {displayedNodes.map((node) => (
            <NodeCard
              key={node.uuid}
              node={node}
              live={live[node.uuid]}
              privacyMode={privacyMode}
            />
          ))}
        </section>
      )}
    </main>
  );
}
