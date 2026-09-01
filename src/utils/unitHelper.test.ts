import { describe, expect, it } from "vitest";

import { stringToBytes } from "./unitHelper";

describe("stringToBytes", () => {
  it.each([
    ["1MB", 1024 ** 2],
    ["1 MB", 1024 ** 2],
    ["5.4MB", 5_662_310],
    ["6,222,765 MB", 6_525_042_032_640],
    ["128*1024gb", 128 * 1024 ** 4],
    ["1e3kb", 1_024_000],
    [".2 GiB", 214_748_365],
    ["1024", 1024],
    ["kb", 1024],
  ])("parses %s", (input, expected) => {
    expect(stringToBytes(input)).toBe(expected);
  });

  it.each(["", "not-a-size", "1+1gb", "2/1gb", "(2*3)gb", "-1gb", "1e999gb"])(
    "rejects %s",
    (input) => {
      expect(stringToBytes(input)).toBe(0);
    }
  );

  it("does not execute input", () => {
    const marker = "__komariStringToBytesExecuted";
    const scope = globalThis as typeof globalThis & Record<string, unknown>;
    delete scope[marker];

    expect(stringToBytes(`(()=>{globalThis.${marker}=true})()b`)).toBe(0);
    expect(scope[marker]).toBeUndefined();
  });
});
