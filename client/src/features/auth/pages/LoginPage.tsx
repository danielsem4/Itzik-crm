import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toastApiError } from "@/lib/notify";
import { AuthShell } from "../components/AuthShell";
import { LoginCredentialsForm } from "../components/LoginCredentialsForm";
import { useAuth } from "../hooks/useAuth";
import type { LoginValues } from "../schemas/auth.schemas";

export function LoginPage() {
  const { t } = useTranslation("auth");
  const { login } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(values: LoginValues) {
    try {
      await login(values.email, values.password);
      navigate("/", { replace: true });
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <AuthShell title={t("login.title")} description={t("login.subtitle")}>
      <LoginCredentialsForm onSubmit={onSubmit} />
    </AuthShell>
  );
}
