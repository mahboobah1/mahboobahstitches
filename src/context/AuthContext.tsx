import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError } from "../lib/api";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
}

type Status = "loading" | "ready" | "unavailable";

interface AuthValue {
  status: Status;
  user: AuthUser | null;
  can: (permission: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { fullName: string; email: string; password: string; phone?: string }) => Promise<void>;
  setupOwner: (input: { setupToken: string; fullName: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let alive = true;
    api<{ user: AuthUser | null }>("/api/auth/me")
      .then((d) => {
        if (!alive) return;
        setUser(d.user);
        setStatus("ready");
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setStatus(e instanceof ApiError && e.status === 0 ? "unavailable" : "ready");
      });
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const d = await api<{ user: AuthUser }>("/api/auth/login", { method: "POST", body: { email, password } });
    setUser(d.user);
  }, []);
  const register = useCallback(async (input: { fullName: string; email: string; password: string; phone?: string }) => {
    const d = await api<{ user: AuthUser }>("/api/auth/register", { method: "POST", body: input });
    setUser(d.user);
  }, []);
  const setupOwner = useCallback(
    async (input: { setupToken: string; fullName: string; email: string; password: string }) => {
      const d = await api<{ user: AuthUser }>("/api/setup/owner", { method: "POST", body: input });
      setUser(d.user);
    },
    [],
  );
  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST", body: {} });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      can: (p) => Boolean(user?.permissions.includes(p)),
      login,
      register,
      setupOwner,
      logout,
    }),
    [status, user, login, register, setupOwner, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
