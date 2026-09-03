import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import en from "./locales/en.json";
import zh_CN from "./locales/zh_CN.json";

// not adding the name field will hide the language from the language switcher menu
const resources = {
  en: {
    translation: en,
    name: "English",
  },
  "en-US": {
    translation: en,
  },
  "en-GB": {
    translation: en,
  },
  "zh-CN": {
    translation: zh_CN,
    name: "简体中文",
  },
};

const supportedLanguages = Object.keys(resources);

function normalizeLanguage(language: string | null | undefined): string | undefined {
  if (!language) {
    return undefined;
  }

  const decodedLanguage = (() => {
    try {
      return decodeURIComponent(language);
    } catch {
      return language;
    }
  })().replace("_", "-");
  if (supportedLanguages.includes(decodedLanguage)) {
    return decodedLanguage;
  }

  const lowerLanguage = decodedLanguage.toLowerCase();
  const exactMatch = supportedLanguages.find((code) => code.toLowerCase() === lowerLanguage);
  if (exactMatch) {
    return exactMatch;
  }

  const baseLanguage = lowerLanguage.split("-")[0];
  if (baseLanguage === "zh") {
    return "zh-CN";
  }

  return supportedLanguages.find((code) => code.toLowerCase() === baseLanguage);
}

export function detectClientLanguage(): string {
  if (typeof window === "undefined") {
    return "en";
  }

  const queryLanguage = new URLSearchParams(window.location.search).get("lng");
  const storedLanguage = (() => {
    try {
      return window.localStorage?.getItem(STORAGE_KEYS.language) || null;
    } catch {
      return null;
    }
  })();
  const navigatorLanguage = window.navigator.languages?.[0] || window.navigator.language;

  return (
    normalizeLanguage(queryLanguage) ||
    normalizeLanguage(storedLanguage) ||
    normalizeLanguage(navigatorLanguage) ||
    "en"
  );
}

i18next
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    lng: "en",
    supportedLngs: supportedLanguages,
    load: "currentOnly",
    interpolation: {
      escapeValue: false, // React handles XSS
    },
  });

export default i18next;
