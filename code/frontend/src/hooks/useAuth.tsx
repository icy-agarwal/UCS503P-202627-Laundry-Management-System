import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { Me } from '../api/types';

const KEY = 'hl_token';
type Status = 'loading' | 'out' | 'in';
interface Auth {
  status: Status; me: Me | null;
  sendOtp(identifier: string): Promise<string>;
  verifyOtp(email: string, code: string): Promise<void>;
  refresh(): Promise<void>;
  logout(): Promise<void>;
}
const Ctx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<Me | null>(null);

  const drop = useCallback(async () => { api.setSession(null); await AsyncStorage.removeItem(KEY).catch(() => {}); setMe(null); setStatus('out'); }, []);

  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem(KEY);
        if (!t) return setStatus('out');
        api.setSession(t);
        setMe(await api.me());
        setStatus('in');
      } catch { await drop(); }
    })();
  }, [drop]);

  const value = useMemo<Auth>(() => ({
    status, me,
    sendOtp: (identifier) => api.auth.sendOtp(identifier),
    async verifyOtp(email, code) {
      const r = await api.auth.verifyOtp(email, code);
      api.setSession(r.token);
      try {
        const m = r.me ?? (await api.me());
        await AsyncStorage.setItem(KEY, r.token);
        setMe(m); setStatus('in');
      } catch (e) { api.setSession(null); throw e; }
    },
    async refresh() { setMe(await api.me()); },
    logout: drop,
  }), [status, me, drop]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): Auth {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
}
