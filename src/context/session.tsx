import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fetchClientDetails, fetchProfile } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import type { ClientDetails, Profile } from '@/types';

type SessionContextValue = {
  session: Session | null;
  profile: Profile | null;
  clientDetails: ClientDetails | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid: string | undefined | null) {
    if (!uid) {
      setProfile(null);
      setClientDetails(null);
      return;
    }
    try {
      const p = await fetchProfile(uid);
      setProfile(p);
      if (p.role === 'cliente') {
        const details = await fetchClientDetails(uid);
        setClientDetails(details);
      } else {
        setClientDetails(null);
      }
    } catch (e) {
      console.warn('Error cargando perfil', e);
      setProfile(null);
      setClientDetails(null);
    }
  }

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user?.id) {
        loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
        setClientDetails(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      profile,
      clientDetails,
      loading,
      refreshProfile: async () => {
        await loadProfile(session?.user?.id);
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setClientDetails(null);
      },
    }),
    [session, profile, clientDetails, loading]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return ctx;
}