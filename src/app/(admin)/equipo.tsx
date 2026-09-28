import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty';
import { Field } from '@/components/ui/field';
import { IconAction } from '@/components/ui/icon-action';
import { Screen } from '@/components/ui/screen';
import { fetchStaffAllowlist, grantStaffAccess, revokeStaffAccess } from '@/lib/db';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { StaffEntry } from '@/types';

export default function AdminEquipoScreen() {
  const theme = useTheme();
  const [staff, setStaff] = useState<StaffEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStaff(await fetchStaffAllowlist());
    } catch (e) {
      console.warn('Error cargando la lista de staff', e);
      setError('No se pudo cargar la lista de habilitados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleGrant() {
    setMessage(null);
    setError(null);
    if (!email.trim()) {
      setError('Ingresá el email del entrenador.');
      return;
    }
    setBusy(true);
    try {
      await grantStaffAccess(email.trim(), note);
      setMessage(`${email.trim()} ya puede registrarse como profe.`);
      setEmail('');
      setNote('');
      await load();
    } catch (e) {
      console.warn(e);
      setError('No se pudo habilitar ese email.');
    } finally {
      setBusy(false);
    }
  }

  function handleRevoke(entry: StaffEntry) {
    setMessage(null);
    setError(null);
    Alert.alert(
      'Quitar acceso de staff',
      `¿Quitar el acceso de entrenador a ${entry.email}? Si ya tiene alumnos o rutinas asignadas, el cambio se rechaza.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeStaffAccess(entry.email);
              setMessage(`Se quitó el acceso de ${entry.email}.`);
              await load();
            } catch (e) {
              console.warn(e);
              setError('No se pudo quitar el acceso. Puede tener alumnos o rutinas asignadas.');
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={theme.brandBright} style={styles.loader} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="eyebrow" themeColor="brandBright">
          Equipo
        </ThemedText>
        <ThemedText type="display">Entrenadores</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Solo los emails de esta lista pueden crear una cuenta de profe. El registro público
          siempre crea alumnos.
        </ThemedText>
      </View>

      <Card>
        <ThemedText type="eyebrow" themeColor="textSecondary">
          Habilitar un entrenador
        </ThemedText>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="off"
          keyboardType="email-address"
          placeholder="entrenador@mail.com"
        />
        <Field label="Nota (opcional)" value={note} onChangeText={setNote} placeholder="Ej: turno noche" />
        {message ? <ThemedText themeColor="success">{message}</ThemedText> : null}
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
        <Button
          label="Habilitar acceso"
          icon="account-tie-outline"
          onPress={handleGrant}
          loading={busy}
        />
      </Card>

      {staff.length ? (
        <ThemedText type="eyebrow" themeColor="textSecondary">
          Con acceso ({staff.length})
        </ThemedText>
      ) : (
        <EmptyState
          icon="account-tie-outline"
          title="Todavía no habilitaste a nadie"
          subtitle="Agregá el email de un entrenador para que pueda entrar a su panel."
        />
      )}

      {staff.map((s) => (
        <Card key={s.email} style={styles.row}>
          <View style={styles.flex}>
            <ThemedText type="default">{s.email}</ThemedText>
            {s.note ? (
              <ThemedText type="small" themeColor="textSecondary">
                {s.note}
              </ThemedText>
            ) : null}
          </View>
          <IconAction
            icon="account-remove-outline"
            label={`Quitar acceso a ${s.email}`}
            color={theme.danger}
            onPress={() => handleRevoke(s)}
          />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.five },
  header: { gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
});
