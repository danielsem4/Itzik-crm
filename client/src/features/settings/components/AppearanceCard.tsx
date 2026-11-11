import { useTranslation } from "react-i18next";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useThemeStore, type Theme } from "@/stores/themeStore";

const THEME_OPTIONS: ReadonlyArray<{ value: Theme; icon: LucideIcon }> = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

export function AppearanceCard() {
  const { t } = useTranslation("settings");
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("appearance.title")}</CardTitle>
        <CardDescription>{t("appearance.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div role="group" aria-label={t("appearance.title")} className="flex flex-wrap gap-2">
          {THEME_OPTIONS.map(({ value, icon: Icon }) => (
            <Button
              key={value}
              type="button"
              variant={theme === value ? "default" : "outline"}
              size="sm"
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
            >
              <Icon aria-hidden />
              {t(`appearance.theme.${value}`)}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
