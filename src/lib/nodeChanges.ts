import type { AtlasNode } from "@/types/atlas";

export const NODE_CHANGE_FIELDS = [
  "name",
  "cpu_name",
  "cpu_cores",
  "virtualization",
  "arch",
  "os",
  "kernel_version",
  "gpu_name",
  "ipv4",
  "ipv6",
  "region",
  "mem_total",
  "swap_total",
  "disk_total",
  "version",
  "price",
  "billing_cycle",
  "currency",
  "group",
  "traffic_limit",
  "traffic_limit_type",
  "expired_at",
  "tags",
  "remark",
  "public_remark",
] as const satisfies readonly (keyof AtlasNode)[];

export type NodeChangeField = typeof NODE_CHANGE_FIELDS[number];
export type NodeSnapshotValue = string | number;
export type NodeSnapshot = Record<NodeChangeField, NodeSnapshotValue>;

export interface NodeFieldChange {
  field: NodeChangeField;
  previous: NodeSnapshotValue;
  current: NodeSnapshotValue;
}

export interface NodeChangeEvent {
  changedAt: string;
  fields: NodeFieldChange[];
}

export interface NodeChangeStore {
  snapshots: Record<string, NodeSnapshot>;
  changes: Record<string, NodeChangeEvent[]>;
}

export const EMPTY_NODE_CHANGE_STORE: NodeChangeStore = {
  snapshots: {},
  changes: {},
};

const MAX_EVENTS_PER_NODE = 50;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTrackedField(value: string): value is NodeChangeField {
  return (NODE_CHANGE_FIELDS as readonly string[]).includes(value);
}

function normalizeSnapshot(value: unknown): NodeSnapshot | null {
  if (!isRecord(value)) return null;
  const snapshot = {} as NodeSnapshot;
  for (const field of NODE_CHANGE_FIELDS) {
    const fieldValue = value[field];
    if (typeof fieldValue !== "string" && typeof fieldValue !== "number") return null;
    snapshot[field] = fieldValue;
  }
  return snapshot;
}

function normalizeChanges(value: unknown): NodeChangeEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((event) => {
      const fields = Array.isArray(event.fields)
        ? event.fields
          .filter(isRecord)
          .map((field) => {
            const name = typeof field.field === "string" ? field.field : "";
            const previous = field.previous;
            const current = field.current;
            if (!isTrackedField(name)) return null;
            if (typeof previous !== "string" && typeof previous !== "number") return null;
            if (typeof current !== "string" && typeof current !== "number") return null;
            return { field: name, previous, current };
          })
          .filter((field): field is NodeFieldChange => field !== null)
        : [];
      return {
        changedAt: typeof event.changedAt === "string" ? event.changedAt : "",
        fields,
      };
    })
    .filter((event) => event.changedAt && event.fields.length > 0)
    .slice(0, MAX_EVENTS_PER_NODE);
}

export function normalizeNodeChangeStore(value: unknown): NodeChangeStore {
  if (!isRecord(value)) return EMPTY_NODE_CHANGE_STORE;
  const snapshots: Record<string, NodeSnapshot> = {};
  if (isRecord(value.snapshots)) {
    for (const [uuid, snapshot] of Object.entries(value.snapshots)) {
      const normalized = normalizeSnapshot(snapshot);
      if (uuid.trim() && normalized) snapshots[uuid] = normalized;
    }
  }
  const changes: Record<string, NodeChangeEvent[]> = {};
  if (isRecord(value.changes)) {
    for (const [uuid, events] of Object.entries(value.changes)) {
      const normalized = normalizeChanges(events);
      if (uuid.trim() && normalized.length > 0) changes[uuid] = normalized;
    }
  }
  return { snapshots, changes };
}

export function createNodeSnapshot(node: AtlasNode): NodeSnapshot {
  const snapshot = {} as NodeSnapshot;
  for (const field of NODE_CHANGE_FIELDS) {
    snapshot[field] = node[field] as NodeSnapshotValue;
  }
  return snapshot;
}

export function recordNodeListChanges(
  store: NodeChangeStore,
  nodes: AtlasNode[],
  changedAt = new Date().toISOString(),
): NodeChangeStore {
  const snapshots = { ...store.snapshots };
  const changes = { ...store.changes };

  for (const node of nodes) {
    if (!node.uuid.trim()) continue;
    const nextSnapshot = createNodeSnapshot(node);
    const previousSnapshot = snapshots[node.uuid];
    snapshots[node.uuid] = nextSnapshot;
    if (!previousSnapshot) continue;

    const fields = NODE_CHANGE_FIELDS
      .filter((field) => !Object.is(previousSnapshot[field], nextSnapshot[field]))
      .map((field) => ({
        field,
        previous: previousSnapshot[field],
        current: nextSnapshot[field],
      }));
    if (fields.length === 0) continue;

    changes[node.uuid] = [
      { changedAt, fields },
      ...(changes[node.uuid] || []),
    ].slice(0, MAX_EVENTS_PER_NODE);
  }

  return { snapshots, changes };
}

export function clearNodeChangeHistory(
  store: NodeChangeStore,
  uuid: string,
): NodeChangeStore {
  if (!uuid.trim() || !store.changes[uuid]) return store;
  const changes = { ...store.changes };
  delete changes[uuid];
  return { snapshots: store.snapshots, changes };
}
