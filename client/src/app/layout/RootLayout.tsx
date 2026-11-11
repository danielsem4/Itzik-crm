import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useDirection } from "@/hooks/useDirection";
import { useThemeStore } from "@/stores/themeStore";

/**
 * Applies document-level direction (LTR/RTL), language, and theme. Mounted once
 * at the router root so every page inherits the correct `dir`/`lang`/theme.
 */
export function RootLayout({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const dir = useDirection();
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.dir = dir;
    root.lang = i18n.language;
  }, [dir, i18n.language]);

  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
  }, [theme]);

  return <>{children}</>;
}
