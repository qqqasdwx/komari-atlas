import { describe, expect, it } from "vitest";

import { countryCodeFromRegion, operatingSystemKind } from "./nodeIdentity";

describe("countryCodeFromRegion", () => {
  it("resolves ISO codes, flag emoji, and common region names", () => {
    expect(countryCodeFromRegion("jp")).toBe("JP");
    expect(countryCodeFromRegion("node 🇸🇬")).toBe("SG");
    expect(countryCodeFromRegion("香港")).toBe("HK");
    expect(countryCodeFromRegion("日本 东京")).toBe("JP");
    expect(countryCodeFromRegion("DE Frankfurt")).toBe("DE");
    expect(countryCodeFromRegion("United States")).toBe("US");
  });

  it("does not turn arbitrary two-letter text into a country", () => {
    expect(countryCodeFromRegion("GO")).toBeNull();
    expect(countryCodeFromRegion("unknown place")).toBeNull();
    expect(countryCodeFromRegion("")).toBeNull();
  });
});

describe("operatingSystemKind", () => {
  it("maps common server systems to a stable icon family", () => {
    expect(operatingSystemKind("Debian GNU/Linux 12")).toBe("linux");
    expect(operatingSystemKind("Windows Server 2025")).toBe("windows");
    expect(operatingSystemKind("macOS 15")).toBe("macos");
    expect(operatingSystemKind("OpenWrt 24")).toBe("router");
    expect(operatingSystemKind("Custom OS")).toBe("server");
  });
});
