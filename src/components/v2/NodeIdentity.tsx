import SiAlmalinux from "@icons-pack/react-simple-icons/icons/SiAlmalinux";
import SiAlpinelinux from "@icons-pack/react-simple-icons/icons/SiAlpinelinux";
import SiApple from "@icons-pack/react-simple-icons/icons/SiApple";
import SiArchlinux from "@icons-pack/react-simple-icons/icons/SiArchlinux";
import SiCentos from "@icons-pack/react-simple-icons/icons/SiCentos";
import SiDebian from "@icons-pack/react-simple-icons/icons/SiDebian";
import SiFedora from "@icons-pack/react-simple-icons/icons/SiFedora";
import SiFreebsd from "@icons-pack/react-simple-icons/icons/SiFreebsd";
import SiGentoo from "@icons-pack/react-simple-icons/icons/SiGentoo";
import SiLinux from "@icons-pack/react-simple-icons/icons/SiLinux";
import SiLinuxmint from "@icons-pack/react-simple-icons/icons/SiLinuxmint";
import SiManjaro from "@icons-pack/react-simple-icons/icons/SiManjaro";
import SiNixos from "@icons-pack/react-simple-icons/icons/SiNixos";
import SiOpensuse from "@icons-pack/react-simple-icons/icons/SiOpensuse";
import SiOpenwrt from "@icons-pack/react-simple-icons/icons/SiOpenwrt";
import SiProxmox from "@icons-pack/react-simple-icons/icons/SiProxmox";
import SiRedhat from "@icons-pack/react-simple-icons/icons/SiRedhat";
import SiRockylinux from "@icons-pack/react-simple-icons/icons/SiRockylinux";
import SiUbuntu from "@icons-pack/react-simple-icons/icons/SiUbuntu";
import { Globe2, PanelsTopLeft, Server } from "lucide-react";
import type { ElementType } from "react";

import { countryCodeFromRegion, operatingSystemLogo } from "@/lib/nodeIdentity";
import { cn } from "@/lib/utils";

export function CountryFlag({ region, className }: { region: string; className?: string }) {
  const countryCode = countryCodeFromRegion(region);

  if (!countryCode) {
    return (
      <span
        className="inline-flex shrink-0"
        aria-label={region}
        role="img"
        title={region}
      >
        <Globe2 className={cn("h-3.5 w-3.5", className)} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        `fi fi-${countryCode.toLowerCase()}`,
        "h-3.5 w-[19px] shrink-0 overflow-hidden rounded-[2px] border border-black/10 shadow-sm",
        className,
      )}
      aria-label={region}
      role="img"
      style={{ width: 19 }}
      title={region}
    />
  );
}

const operatingSystemIcons: Record<ReturnType<typeof operatingSystemLogo>, ElementType> = {
  almalinux: SiAlmalinux,
  alpine: SiAlpinelinux,
  arch: SiArchlinux,
  centos: SiCentos,
  debian: SiDebian,
  fedora: SiFedora,
  freebsd: SiFreebsd,
  gentoo: SiGentoo,
  linux: SiLinux,
  linuxmint: SiLinuxmint,
  macos: SiApple,
  manjaro: SiManjaro,
  nixos: SiNixos,
  opensuse: SiOpensuse,
  openwrt: SiOpenwrt,
  proxmox: SiProxmox,
  redhat: SiRedhat,
  rocky: SiRockylinux,
  server: Server,
  ubuntu: SiUbuntu,
  windows: PanelsTopLeft,
};

export function OperatingSystemIcon({ os, className }: { os: string; className?: string }) {
  const Icon = operatingSystemIcons[operatingSystemLogo(os)];
  return (
    <Icon
      className={cn("h-3.5 w-3.5 shrink-0 opacity-80", className)}
      color="currentColor"
      aria-hidden="true"
    />
  );
}
