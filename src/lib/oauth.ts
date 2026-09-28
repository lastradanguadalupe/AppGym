import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const CALLBACK_PATH = 'auth/callback';

/**
 * Destino de los redirects de auth: OAuth de Google y confirmación de email.
 * En native resuelve al deep link del scheme (`appgym://auth/callback`) y en web
 * a la ruta `/auth/callback` del dev server / deploy. Tiene que estar en la
 * lista de Redirect URLs del panel de Supabase.
 */
export function authCallbackUri(): string {
  return AuthSession.makeRedirectUri({ path: CALLBACK_PATH });
}

/**
 * Inicia sesión con Google (OAuth browser flow).
 * Funciona en Expo Go, dev builds y web.
 */
export async function signInWithGoogle(): Promise<{ cancelled: boolean }> {
  const redirectTo = authCallbackUri();
  const options = {
    redirectTo,
    queryParams: { access_type: 'offline', prompt: 'consent' },
  };

  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options,
    });
    if (error) throw error;
    return { cancelled: false };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { ...options, skipBrowserRedirect: true },
  });
  if (error) throw error;

  if (!data.url) {
    throw new Error('No se pudo iniciar sesión con Google.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === 'dismiss' || result.type === 'cancel') {
    return { cancelled: true };
  }

  return { cancelled: false };
}