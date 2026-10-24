import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { currentUser, getProfile, onAuthChange } from '../api/ownly-api.ts';
import type { Profile } from './types.ts';

interface AuthState { user: User | null; profile: Profile | null; loading: boolean; refreshProfile: () => Promise<void> }
const Ctx = createContext<AuthState>({ user: null, profile: null, loading: true, refreshProfile: async () => {} });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (u: User | null) => {
    if (!u) { setProfile(null); return; }
    try { setProfile(await getProfile()); } catch { setProfile(null); }
  };

  useEffect(() => {
    let alive = true;
    currentUser().then(async u => { if (!alive) return; setUser(u); await loadProfile(u); if (alive) setLoading(false); }).catch(() => alive && setLoading(false));
    const stop = onAuthChange(u => { setUser(u); setTimeout(() => loadProfile(u), 0); });
    return () => { alive = false; stop(); };
  }, []);

  const refreshProfile = async () => loadProfile(user);
  return <Ctx.Provider value={{ user, profile, loading, refreshProfile }}>{children}</Ctx.Provider>;
}

/** True when the profile still has the name made from the email (the first-time name step is not done). */
export const needsName = (p: Profile | null) =>
  !!p && (!p.full_name || p.full_name.trim() === p.email.split('@')[0]);

/** True when the person still has to give their name or mobile number (both are required). */
export const needsDetails = (p: Profile | null) => !!p && (needsName(p) || !p.phone);
