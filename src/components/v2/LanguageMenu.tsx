"use client";

import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STORAGE_KEYS } from "@/lib/storageKeys";

const LANGUAGES = [
  { code: "zh-CN", label: "简体中文" },
  { code: "en", label: "English" },
] as const;

export function LanguageMenu() {
  const { i18n, t } = useTranslation();

  const changeLanguage = (language: string) => {
    window.localStorage.setItem(STORAGE_KEYS.language, language);
    void i18n.changeLanguage(language);
    document.documentElement.lang = language;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" title={t("atlas.language")}>
          <Languages className="h-4 w-4" />
          <span className="sr-only">{t("atlas.language")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language.code}
            className={i18n.resolvedLanguage === language.code ? "bg-accent" : ""}
            onSelect={() => changeLanguage(language.code)}
          >
            {language.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
