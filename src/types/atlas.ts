export type TrafficLimitType = "sum" | "max" | "min" | "up" | "down";

export interface AtlasNode {
  uuid: string;
  name: string;
  cpu_name: string;
  cpu_cores: number;
  cpu_physical_cores: number;
  virtualization: string;
  arch: string;
  os: string;
  kernel_version: string;
  gpu_name: string;
  ipv4: string;
  ipv6: string;
  region: string;
  remark: string;
  public_remark: string;
  mem_total: number;
  swap_total: number;
  disk_total: number;
  version: string;
  weight: number;
  price: number;
  billing_cycle: number;
  auto_renewal: boolean;
  currency: string;
  expired_at: string;
  group: string;
  tags: string;
  traffic_limit: number;
  traffic_limit_type: TrafficLimitType;
  created_at: string;
  updated_at: string;
}

export interface PingSnapshot {
  name: string;
  latest: number;
  avg: number;
  tail: number;
  loss: number;
  min: number;
  max: number;
}

export interface LiveNodeSnapshot {
  client: string;
  time: string;
  online: boolean;
  cpu: number;
  gpu: number;
  ram: number;
  ram_total: number;
  swap: number;
  swap_total: number;
  load: number;
  load5: number;
  load15: number;
  disk: number;
  disk_total: number;
  net_in: number;
  net_out: number;
  net_total_up: number;
  net_total_down: number;
  process: number;
  connections: number;
  connections_udp: number;
  uptime: number;
  ping: Record<string, PingSnapshot>;
}

export interface PingTask {
  id: number;
  weight: number;
  name: string;
  clients: string[];
  default_on: boolean;
  type: string;
  interval: number;
}

export interface CardPingHistoryBucket {
  start: string;
  end: string;
  latency: number | null;
  loss: number | null;
}

export interface CardPingHistory {
  buckets: CardPingHistoryBucket[];
}

export interface AtlasNodeSettings {
  trafficResetDay?: number;
  cardPingTaskIds: number[];
}

export interface AtlasSettingsV2 {
  schema: 2;
  nodes: Record<string, AtlasNodeSettings>;
}

export type SettingsSaveState = "idle" | "saving" | "saved" | "error";

export interface BillingWindow {
  resetDay: number;
  source: "configured" | "expiry";
  start: Date;
  end: Date;
}

export type BillingTrafficState =
  | { status: "loading" }
  | { status: "unconfigured" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      up: number;
      down: number;
      used: number;
      start: string;
      end: string;
    };

export interface MetricPoint {
  time: string;
  value: number | null;
  count?: number;
  tags?: Record<string, string>;
  labels?: Record<string, string>;
}

export interface MetricSeries {
  metric_key: string;
  entity_id: string;
  type?: string;
  unit?: string;
  tags?: Record<string, string>;
  retention_days?: number;
  downsampled?: boolean;
  downsample_algorithm?: string;
  interval_seconds?: number;
  count: number;
  points: MetricPoint[];
}

export interface MetricsResponse {
  start: string;
  end: string;
  series: MetricSeries[];
  count: number;
}
