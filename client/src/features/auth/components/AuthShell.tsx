import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo.svg";

/**
 * Shared chrome for every auth screen (login, forgot/reset/activate):
 * a centered card with the app logo on top and an optional heading.
 * The logo is vendored (not hot-linked) so unauthenticated pages make no
 * third-party requests.
 */

export function AuthShell({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation("auth");
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
        <div className="mb-8 flex justify-center">
          <img
            src={logo}
            alt={t("logoAlt")}
            className="h-16 object-contain"
          />
        </div>
        {title && (
          <div className="mb-6 space-y-1.5 text-center">
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
