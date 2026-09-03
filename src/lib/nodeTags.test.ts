import { describe, expect, it } from "vitest";

import { NODE_TAG_COLOR_HEX, parseNodeTags } from "./nodeTags";

describe("parseNodeTags", () => {
  it("parses Komari color suffixes and removes trailing separators", () => {
    expect(parseNodeTags("10999<green>; 2000Mbps<green>; ")).toEqual([
      { text: "10999", color: "green", hex: NODE_TAG_COLOR_HEX.green },
      { text: "2000Mbps", color: "green", hex: NODE_TAG_COLOR_HEX.green },
    ]);
  });

  it("matches supported colors case-insensitively", () => {
    expect(parseNodeTags("Premium<ReD>; IPv6<SKY>")).toEqual([
      { text: "Premium", color: "red", hex: NODE_TAG_COLOR_HEX.red },
      { text: "IPv6", color: "sky", hex: NODE_TAG_COLOR_HEX.sky },
    ]);
  });

  it("uses the default color for plain tags", () => {
    expect(parseNodeTags("CN2 GIA")).toEqual([
      { text: "CN2 GIA", color: "blue", hex: NODE_TAG_COLOR_HEX.blue },
    ]);
  });

  it("preserves unknown suffixes as visible text", () => {
    expect(parseNodeTags("Custom<chartreuse>")).toEqual([
      { text: "Custom<chartreuse>", color: "blue", hex: NODE_TAG_COLOR_HEX.blue },
    ]);
  });

  it("ignores empty entries and tags containing only a known color suffix", () => {
    expect(parseNodeTags(" ; <green>; ;")).toEqual([]);
    expect(parseNodeTags(undefined)).toEqual([]);
  });

  it("keeps the configured color for each tag", () => {
    expect(parseNodeTags("A<ruby>; B<amber>; C<teal>").map(({ text, color }) => ({ text, color }))).toEqual([
      { text: "A", color: "ruby" },
      { text: "B", color: "amber" },
      { text: "C", color: "teal" },
    ]);
  });
});
