import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { setCsrfToken } from "@/lib/apiClient";
import { authApi } from "../api/auth.api";
import type { User } from "../types";

export interface AuthContextValue {
  user: User | null;
  /** True until the initial session-hydration request settles. */
  isLoading: boolean;
  /** Exchange credentials for a session. */
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  /** Re-hydrate from /auth/me (e.g. after activation). */
  refresh: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrate = useCallback(async () => {
    try {
      const { user: me, csrfToken } = await authApi.me();
      setCsrfToken(csrfToken);
      setUser(me);
    } catch {
      // Not authenticated (401) or network error — treat as logged out.
      setCsrfToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      await hydrate();
      if (active) setIsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [hydrate]);

  const login = useCallback(async (email: string, password: string) => {
    const { user: me, csrfToken } = await authApi.login(email, password);
    setCsrfToken(csrfToken);
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setCsrfToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, refresh: hydrate }}
    >
      {children}
    </AuthContext.Provider>
  );
}
