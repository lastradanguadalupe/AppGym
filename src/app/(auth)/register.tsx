import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';
import { Spacing } from '@/constants/theme';

type RoleOption = 'cliente' | 'profe';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RoleOption>('cliente');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError('Completá nombre y email, y usá una contraseña de al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim(), role } },
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    if (data.session) {
      return;
    }

    const confirm = await supabase.auth.signInWithPassword({ email: email.trim(), password }).catch(() => null);
    setLoading(false);
    if (confirm?.error) {
      setError(
        'Te enviamos un mail de confirmación. Revisá tu casilla (y spam) para activar la cuenta.'
      );
    }
    Alert.alert(
      'Cuenta creada',
      'Revisá tu email para confirmar la cuenta antes de ingresar.'
    );
  }

  return (
    <Screen>
      <ThemedText type="subtitle">Creá tu cuenta</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {role === 'cliente'
          ? 'Vas a completar tus datos para que tu profe arme tu rutina.'
          : 'Registrate como profe para gestionar tus alumnos.'}
      </ThemedText>

      <Card>
        <ThemedText type="smallBold" themeColor="textSecondary">
          ¿Qué rol tenés?
        </ThemedText>
        <View style={styles.roleRow}>
          <Chip label="Soy alumno" selected={role === 'cliente'} onPress={() => setRole('cliente')} />
          <Chip label="Soy profe" selected={role === 'profe'} onPress={() => setRole('profe')} />
        </View>

        <Field
          label="Nombre"
          value={name}
          onChangeText={setName}
          placeholder="Cómo te llamás"
        />
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
          placeholder="Mínimo 6 caracteres"
        />
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
        <Button label="Registrarme" onPress={handleRegister} loading={loading} />
      </Card>

      <ThemedText type="small" style={styles.footer}>
        <Link href="/login">¿Ya tenés cuenta? Ingresá</Link>
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  roleRow: { flexDirection: 'row', gap: Spacing.two },
  footer: { textAlign: 'center', marginTop: Spacing.two },
});