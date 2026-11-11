import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "@/locales/en/common.json";
import enAuth from "@/locales/en/auth.json";
import enSettings from "@/locales/en/settings.json";
import enUsers from "@/locales/en/users.json";
import enDashboard from "@/locales/en/dashboard.json";
import heCommon from "@/locales/he/common.json";
import heAuth from "@/locales/he/auth.json";
import heSettings from "@/locales/he/settings.json";
import heUsers from "@/locales/he/users.json";
import heDashboard from "@/locales/he/dashboard.json";

export const supportedLanguages = ["en", "he"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

// Right-to-left languages. The app ships English + Hebrew (RTL).
export const rtlLanguages: SupportedLanguage[] = ["he"];

export function isRtl(lang: string): boolean {
  return rtlLanguages.includes(lang as SupportedLanguage);
}

export const namespaces = [
  "common",
  "auth",
  "settings",
  "users",
  "dashboard",
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, auth: enAuth, settings: enSettings, users: enUsers, dashboard: enDashboard },
      he: { common: heCommon, auth: heAuth, settings: heSettings, users: heUsers, dashboard: heDashboard },
    },
    fallbackLng: "en",
    supportedLngs: supportedLanguages as unknown as string[],
    defaultNS: "common",
    ns: namespaces as unknown as string[],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
  });

export default i18n;
