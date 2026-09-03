export const NODE_TAG_COLORS = [
  "ruby",
  "gray",
  "gold",
  "bronze",
  "brown",
  "yellow",
  "amber",
  "orange",
  "tomato",
  "red",
  "crimson",
  "pink",
  "plum",
  "purple",
  "violet",
  "iris",
  "indigo",
  "blue",
  "cyan",
  "teal",
  "jade",
  "green",
  "grass",
  "lime",
  "mint",
  "sky",
] as const;

export type NodeTagColor = (typeof NODE_TAG_COLORS)[number];

export interface NodeTag {
  text: string;
  color: NodeTagColor;
  hex: string;
}

export const NODE_TAG_COLOR_HEX: Record<NodeTagColor, string> = {
  ruby: "#e5484d",
  gray: "#8d8d8d",
  gold: "#e5c00d",
  bronze: "#c2853c",
  brown: "#aa6a38",
  yellow: "#f9d400",
  amber: "#f5b21a",
  orange: "#f97316",
  tomato: "#e54d2e",
  red: "#e5484d",
  crimson: "#e93d82",
  pink: "#e24d8c",
  plum: "#a855c2",
  purple: "#8e4ec6",
  violet: "#7c5dfa",
  iris: "#5b5bd6",
  indigo: "#6366f1",
  blue: "#0090ff",
  cyan: "#00a2c7",
  teal: "#12a594",
  jade: "#29a383",
  green: "#30a46c",
  grass: "#46a358",
  lime: "#84cc16",
  mint: "#4fd1c5",
  sky: "#00a6ed",
};

const DEFAULT_TAG_COLOR: NodeTagColor = "blue";
const COLOR_SUFFIX_PATTERN = /<([a-z]+)>$/i;
const NODE_TAG_COLOR_SET = new Set<string>(NODE_TAG_COLORS);

export function parseNodeTags(value: string | null | undefined): NodeTag[] {
  if (!value?.trim()) return [];

  return value
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry): NodeTag | null => {
      const match = entry.match(COLOR_SUFFIX_PATTERN);
      const candidate = match?.[1]?.toLowerCase();
      const hasKnownColor = Boolean(candidate && NODE_TAG_COLOR_SET.has(candidate));
      const color = hasKnownColor ? candidate as NodeTagColor : DEFAULT_TAG_COLOR;
      const text = hasKnownColor ? entry.slice(0, match?.index).trim() : entry;

      if (!text) return null;
      return { text, color, hex: NODE_TAG_COLOR_HEX[color] };
    })
    .filter((tag): tag is NodeTag => tag !== null);
}
