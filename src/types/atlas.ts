export type TrafficLimitType = "sum" | "max" | "min" | "up" | "down";

export interface AtlasNode {
  uuid: string;
  name: string;
  cpu_name: string;
  cpu_cores: number;
  virtualization: string;
  arch: string;
  os: string;
  kernel_version: string;
  gpu_name: string;
  ipv4: string;
  ipv6: string;
  region: string;
  tags: string;
  remark: string;
  public_remark: string;
  mem_total: number;
  swap_total: number;
  disk_total: number;
  version: string;
  weight: number;
  price: number;
  billing_cycle: number;
  currency: string;
  expired_at: string;
  group: string;
  traffic_limit: number;
  traffic_limit_type: TrafficLimitType;
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
  coverage: number | null;
}

export interface CardPingHistory {
  buckets: CardPingHistoryBucket[];
}

export type PingMetric = "latency" | "loss";

export interface PingMetricThresholds {
  greenMax: number;
  yellowMax: number;
}

export interface PingTaskThresholds {
  latency: PingMetricThresholds;
  loss: PingMetricThresholds;
}

export interface AtlasNodeSettings {
  trafficResetDay?: number;
  cardPingTaskIds: number[];
  pingThresholds?: Record<string, PingTaskThresholds>;
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

export interface BillingTrafficDay {
  date: string;
  up: number;
  down: number;
}

export type BillingTrafficState =
  | { status: "loading"; resetDay?: number }
  | { status: "unconfigured" }
  | { status: "error"; message: string; resetDay?: number }
  | {
      status: "ready";
      up: number;
      down: number;
      used: number;
      resetDay: number;
      start: string;
      end: string;
      daily: BillingTrafficDay[];
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
