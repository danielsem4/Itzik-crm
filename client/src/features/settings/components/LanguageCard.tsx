import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supportedLanguages, type SupportedLanguage } from "@/lib/i18n";

/** Endonyms — always shown in their own language. */
const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  he: "עברית",
};

export function LanguageCard() {
  const { t, i18n } = useTranslation("settings");
  const currentLanguage = supportedLanguages.includes(i18n.language as SupportedLanguage)
    ? (i18n.language as SupportedLanguage)
    : "en";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("language.title")}</CardTitle>
        <CardDescription>{t("language.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="language">{t("language.title")}</Label>
          <select
            id="language"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
            value={currentLanguage}
            onChange={(e) => void i18n.changeLanguage(e.target.value)}
          >
            {supportedLanguages.map((lng) => (
              <option key={lng} value={lng}>
                {LANGUAGE_LABELS[lng]}
              </option>
            ))}
          </select>
        </div>
      </CardContent>
    </Card>
  );
}
