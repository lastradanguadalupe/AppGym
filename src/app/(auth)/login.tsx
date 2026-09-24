import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';
import { Spacing } from '@/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Completá email y contraseña.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      setError('Credenciales inválidas. Revisá tu email y contraseña.');
      Alert.alert('Error al ingresar', error.message);
    }
  }

  return (
    <Screen>
      <ThemedText type="subtitle">Bienvenido de nuevo</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Ingresá para ver tu rutina y registrar tus entrenamientos.
      </ThemedText>

      <Card>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="tucorreo@mail.com"
        />
        <Field
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
        <Button label="Ingresar" onPress={handleLogin} loading={loading} />
      </Card>

      <ThemedText type="small" style={styles.footer}>
        <Link href="/register">¿Todavía no tenés cuenta? Registrate</Link>
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { textAlign: 'center', marginTop: Spacing.two },
});