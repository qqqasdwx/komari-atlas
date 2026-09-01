"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { AccountProvider } from "@/contexts/AccountContext"
import { PublicInfoProvider } from "@/contexts/PublicInfoContext"
import { Toaster } from "@/components/ui/sonner"
import i18n, { detectClientLanguage } from "@/i18n/config"
import { STORAGE_KEYS } from "@/lib/storageKeys"

function I18nClientLanguageSync() {
  React.useEffect(() => {
    const detectedLanguage = detectClientLanguage();
    if (i18n.language !== detectedLanguage) {
      void i18n.changeLanguage(detectedLanguage);
    }
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey={STORAGE_KEYS.appearance}
    >
      <I18nClientLanguageSync />
      <PublicInfoProvider>
        <AccountProvider>
          {children}
          <Toaster />
        </AccountProvider>
      </PublicInfoProvider>
    </NextThemesProvider>
  )
}
