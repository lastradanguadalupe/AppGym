import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { fetchClientDetails, fetchProfile } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import type { ClientDetails, Profile } from '@/types';

type SessionContextValue = {
  session: Session | null;
  profile: Profile | null;
  clientDetails: ClientDetails | null;
  loading: boolean;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const loadIdRef = useRef(0);

  async function loadProfile(uid: string | undefined | null) {
    const loadId = ++loadIdRef.current;
    const isCurrent = () => loadIdRef.current === loadId;

    if (!uid) {
      setProfile(null);
      setClientDetails(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    try {
      const p = await fetchProfile(uid);
      if (!isCurrent()) return;
      setProfile(p);
      if (p.role === 'cliente') {
        const details = await fetchClientDetails(uid);
        if (!isCurrent()) return;
        setClientDetails(details);
      } else {
        setClientDetails(null);
      }
    } catch (e) {
      if (!isCurrent()) return;
      console.warn('Error cargando perfil', e);
      setProfile(null);
      setClientDetails(null);
    } finally {
      if (isCurrent()) setProfileLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id);
      } else {
        setProfile(null);
        setClientDetails(null);
        setProfileLoading(false);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user?.id) {
        loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
        setClientDetails(null);
        setProfileLoading(false);
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
      profileLoading,
      refreshProfile: async () => {
        await loadProfile(session?.user?.id);
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setClientDetails(null);
        setProfileLoading(false);
      },
    }),
    [session, profile, clientDetails, loading, profileLoading]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return ctx;
}