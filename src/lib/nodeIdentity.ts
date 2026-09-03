const REGIONAL_INDICATOR_START = 0x1f1e6;
const ASCII_ALPHA_START = 0x41;
const FLAG_EMOJI_PATTERN = /[\u{1F1E6}-\u{1F1FF}]{2}/u;

const ISO_COUNTRY_CODES = new Set(
  (
    "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
    "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET EU FI FJ FK FM " +
    "FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT " +
    "JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN " +
    "MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT " +
    "PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL " +
    "TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
  ).split(" "),
);

const REGION_ALIASES: Record<string, string> = {
  america: "US",
  australia: "AU",
  britain: "GB",
  canada: "CA",
  china: "CN",
  france: "FR",
  germany: "DE",
  hongkong: "HK",
  "hong kong": "HK",
  japan: "JP",
  korea: "KR",
  russia: "RU",
  singapore: "SG",
  taiwan: "TW",
  uk: "GB",
  usa: "US",
  "united kingdom": "GB",
  "united states": "US",
  中国: "CN",
  中國: "CN",
  台湾: "TW",
  台灣: "TW",
  香港: "HK",
  日本: "JP",
  韩国: "KR",
  韓國: "KR",
  新加坡: "SG",
  美国: "US",
  美國: "US",
  英国: "GB",
  英國: "GB",
  德国: "DE",
  德國: "DE",
  法国: "FR",
  法國: "FR",
  加拿大: "CA",
  澳大利亚: "AU",
  澳大利亞: "AU",
  俄罗斯: "RU",
  俄羅斯: "RU",
};

function countryCodeFromEmoji(emoji: string): string | null {
  const characters = Array.from(emoji);
  if (characters.length !== 2) return null;

  const codePoints = characters.map((character) => character.codePointAt(0) ?? 0);
  if (codePoints.some((point) => point < REGIONAL_INDICATOR_START || point > 0x1f1ff)) {
    return null;
  }

  return String.fromCodePoint(
    ...codePoints.map((point) => point - REGIONAL_INDICATOR_START + ASCII_ALPHA_START),
  );
}

export function countryCodeFromRegion(region: string | null | undefined): string | null {
  const raw = region?.trim();
  if (!raw) return null;

  const emoji = raw.match(FLAG_EMOJI_PATTERN)?.[0];
  if (emoji) return countryCodeFromEmoji(emoji);

  const normalized = raw.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const alias = REGION_ALIASES[normalized] ?? REGION_ALIASES[normalized.replaceAll(" ", "")];
  if (alias) return alias;

  const embeddedAlias = Object.entries(REGION_ALIASES).find(([name]) => {
    if (/^[a-z]{1,2}$/.test(name)) return false;
    return /[\u3400-\u9fff]/u.test(name)
      ? normalized.includes(name)
      : ` ${normalized} `.includes(` ${name} `);
  });
  if (embeddedAlias) return embeddedAlias[1];

  const countryCode = normalized
    .split(" ")
    .map((token) => token.toUpperCase())
    .find((token) => ISO_COUNTRY_CODES.has(token));
  return countryCode ?? null;
}

type OperatingSystemLogo =
  | "almalinux"
  | "alpine"
  | "arch"
  | "centos"
  | "debian"
  | "fedora"
  | "freebsd"
  | "gentoo"
  | "linux"
  | "linuxmint"
  | "macos"
  | "manjaro"
  | "nixos"
  | "opensuse"
  | "openwrt"
  | "proxmox"
  | "redhat"
  | "rocky"
  | "server"
  | "ubuntu"
  | "windows";

export function operatingSystemLogo(os: string | null | undefined): OperatingSystemLogo {
  const normalized = os?.trim().toLowerCase() ?? "";

  if (/proxmox/.test(normalized)) return "proxmox";
  if (/openwrt|immortalwrt/.test(normalized)) return "openwrt";
  if (/ubuntu|elementary/.test(normalized)) return "ubuntu";
  if (/debian|\bdeb\b/.test(normalized)) return "debian";
  if (/alpine/.test(normalized)) return "alpine";
  if (/almalinux|alma linux|\balma\b/.test(normalized)) return "almalinux";
  if (/rocky/.test(normalized)) return "rocky";
  if (/centos|cent os/.test(normalized)) return "centos";
  if (/fedora/.test(normalized)) return "fedora";
  if (/red\s?hat|rhel/.test(normalized)) return "redhat";
  if (/opensuse|open suse|\bsuse\b/.test(normalized)) return "opensuse";
  if (/archlinux|arch linux|\barch\b/.test(normalized)) return "arch";
  if (/manjaro/.test(normalized)) return "manjaro";
  if (/linux\s?mint|\bmint\b/.test(normalized)) return "linuxmint";
  if (/gentoo/.test(normalized)) return "gentoo";
  if (/nixos|nix os/.test(normalized)) return "nixos";
  if (/freebsd|free bsd/.test(normalized)) return "freebsd";
  if (/mac\s?os|darwin/.test(normalized)) return "macos";
  if (/windows|microsoft/.test(normalized)) return "windows";
  if (/linux|armbian|astra|opencloud|euler|aliyun/.test(normalized)) return "linux";

  return "server";
}
