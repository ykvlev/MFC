import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch, loginRequest, logoutRequest, onAuthChange, tryRestoreSession } from './api';
import type { Me } from './types';

interface AuthState {
  me: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    try {
      setMe(await apiFetch<Me>('/auth/me'));
    } catch {
      setMe(null);
    }
  }

  useEffect(() => {
    (async () => {
      const ok = await tryRestoreSession();
      if (ok) await loadMe();
      setLoading(false);
    })();
    return onAuthChange(() => {
      // токен пропал (refresh не удался) — разлогин
      void loadMe();
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      me,
      loading,
      async login(email, password) {
        await loginRequest(email, password);
        await loadMe();
      },
      async logout() {
        await logoutRequest();
        setMe(null);
      },
    }),
    [me, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth вне AuthProvider');
  return ctx;
}
