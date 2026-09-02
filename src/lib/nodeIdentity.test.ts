import { describe, expect, it } from "vitest";

import { countryCodeFromRegion, operatingSystemLogo } from "./nodeIdentity";

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

describe("operatingSystemLogo", () => {
  it("identifies Linux distributions instead of only their platform", () => {
    expect(operatingSystemLogo("Debian GNU/Linux 12")).toBe("debian");
    expect(operatingSystemLogo("Ubuntu 24.04 LTS")).toBe("ubuntu");
    expect(operatingSystemLogo("Alpine Linux 3.21")).toBe("alpine");
    expect(operatingSystemLogo("Rocky Linux 9")).toBe("rocky");
    expect(operatingSystemLogo("OpenWrt 24")).toBe("openwrt");
    expect(operatingSystemLogo("Custom Linux")).toBe("linux");
    expect(operatingSystemLogo("Custom OS")).toBe("server");
  });
});
