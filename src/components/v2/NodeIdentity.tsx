import {
  Apple,
  Globe2,
  PanelsTopLeft,
  Router,
  Server,
  Terminal,
  type LucideIcon,
} from "lucide-react";

import { countryCodeFromRegion, operatingSystemKind } from "@/lib/nodeIdentity";
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

const operatingSystemIcons: Record<ReturnType<typeof operatingSystemKind>, LucideIcon> = {
  linux: Terminal,
  macos: Apple,
  router: Router,
  server: Server,
  windows: PanelsTopLeft,
};

export function OperatingSystemIcon({ os, className }: { os: string; className?: string }) {
  const Icon = operatingSystemIcons[operatingSystemKind(os)];
  return <Icon className={cn("h-3.5 w-3.5 shrink-0", className)} aria-hidden="true" />;
}
