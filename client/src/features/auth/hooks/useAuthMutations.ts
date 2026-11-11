import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";

export function useForgotPasswordMutation() {
  return useMutation({ mutationFn: (email: string) => authApi.forgotPassword(email) });
}

/** Reset (from a reset link) or activate (from an invite link) — both set a password via a single-use token. */
export function useSetPasswordMutation(mode: "reset" | "activate") {
  return useMutation({
    mutationFn: async ({ token, password }: { token: string; password: string }) => {
      if (mode === "reset") await authApi.resetPassword(token, password);
      else await authApi.activate(token, password);
    },
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) =>
      authApi.changePassword(current, next),
  });
}
