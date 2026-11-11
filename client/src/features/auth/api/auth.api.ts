import { apiClient } from "@/lib/apiClient";
import type { User, AuthSession } from "../types";

export const authApi = {
  async login(email: string, password: string): Promise<AuthSession> {
    const { data } = await apiClient.post<AuthSession>("/auth/login", {
      email,
      password,
    });
    return data;
  },

  async me(): Promise<AuthSession> {
    const { data } = await apiClient.get<AuthSession>("/auth/me");
    return data;
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post("/auth/password/forgot", { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await apiClient.post("/auth/password/reset", { token, password });
  },

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    await apiClient.post("/auth/password/change", {
      currentPassword,
      newPassword,
    });
  },

  async activate(token: string, password: string): Promise<User> {
    const { data } = await apiClient.post<{ user: User }>("/auth/activate", {
      token,
      password,
    });
    return data.user;
  },
};
