"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { HeaderTooltip, HEADER_TOOL_BUTTON_CLASS } from "@/components/v2/HeaderTooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppearanceMenu() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const icon = !mounted || theme === "system"
    ? <Monitor className="h-4 w-4" />
    : theme === "dark"
      ? <Moon className="h-4 w-4" />
      : <Sun className="h-4 w-4" />;

  return (
    <DropdownMenu>
      <HeaderTooltip label={t("atlas.appearance")}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={HEADER_TOOL_BUTTON_CLASS}
            aria-label={t("atlas.appearance")}
          >
            {icon}
            <span className="sr-only">{t("atlas.appearance")}</span>
          </Button>
        </DropdownMenuTrigger>
      </HeaderTooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setTheme("light")}>
          <Sun className="h-4 w-4" />
          {t("theme.light")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme("dark")}>
          <Moon className="h-4 w-4" />
          {t("theme.dark")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme("system")}>
          <Monitor className="h-4 w-4" />
          {t("theme.system")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
