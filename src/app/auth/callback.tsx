import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const TIMEOUT_MS = 20_000;
const SESSION_POLL_MS = 250;
const SESSION_WAIT_MS = 5_000;

async function waitForSession(timeoutMs = SESSION_WAIT_MS) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
    if (Date.now() >= deadline) return null;
    await new Promise((resolve) => setTimeout(resolve, SESSION_POLL_MS));
  }
}

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string | string[]; error?: string | string[] }>();
  const router = useRouter();
  const theme = useTheme();

  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  const oauthError = Array.isArray(params.error) ? params.error[0] : params.error;

  useEffect(() => {
    let cancelled = false;

    const go = (path: '/' | '/login') => {
      if (!cancelled) router.replace(path);
    };

    const watchdog = setTimeout(async () => {
      if (cancelled) return;
      console.warn('Timeout completando la sesión OAuth');
      const { data } = await supabase.auth.getSession();
      go(data.session ? '/' : '/login');
    }, TIMEOUT_MS);

    (async () => {
      try {
        if (oauthError) {
          go('/login');
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (error) {
            console.warn('Error intercambiando código OAuth', error);
            go('/login');
            return;
          }
        }

        const session = await waitForSession();
        go(session ? '/' : '/login');
      } catch (e) {
        console.warn('Error en callback de sesión', e);
        go('/login');
      } finally {
        clearTimeout(watchdog);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(watchdog);
    };
  }, [code, oauthError, router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.brand} />
      <ThemedText type="small" themeColor="textSecondary">
        Completando sesión...
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
});
