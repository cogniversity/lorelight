import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi, User, setToken, clearToken } from "../api/client";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: restore session by calling /api/auth/me
  useEffect(() => {
    authApi
      .me()
      .then((u) => setUser(u))
      .catch(() => {
        // No valid session — user must log in
        clearToken();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { accessToken } = await authApi.login(email, password);
    setToken(accessToken);
    const u = await authApi.me();
    setUser(u);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearToken();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
