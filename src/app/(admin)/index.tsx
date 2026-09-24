import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card, Row } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { assignProfe, fetchActiveRoutineForClient, fetchAlumnos, fetchSessions } from '@/lib/db';
import { formatMinutes } from '@/lib/format';
import { Spacing } from '@/constants/theme';
import type { Profile } from '@/types';

type AlumnoStats = { sessions: number; minutes: number; hasRoutine: boolean };

export default function AdminHomeScreen() {
  const router = useRouter();
  const { profile, signOut } = useSession();

  const [alumnos, setAlumnos] = useState<Profile[]>([]);
  const [stats, setStats] = useState<Record<string, AlumnoStats>>({});
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await fetchAlumnos();
      setAlumnos(list);
      const entries = await Promise.all(
        list.map(async (a) => {
          const [sessions, routine] = await Promise.all([
            fetchSessions(a.id),
            fetchActiveRoutineForClient(a.id),
          ]);
          return [
            a.id,
            {
              sessions: sessions.length,
              minutes: sessions.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0),
              hasRoutine: !!routine,
            },
          ] as const;
        })
      );
      setStats(Object.fromEntries(entries));
    } catch (e) {
      console.warn('Error cargando alumnos', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleAgregar() {
    setMessage(null);
    setError(null);
    if (!email.trim()) {
      setError('Ingresá el email del alumno.');
      return;
    }
    setBusy(true);
    try {
      const target = alumnos.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
      if (!target) {
        setError('No encontré ningún alumno con ese email. Debe registrarse primero como alumno.');
        return;
      }
      await assignProfe(target.id);
      setMessage(`${target.name ?? target.email} ahora es tu alumno.`);
      setEmail('');
      await load();
    } catch (e) {
      setError('No se pudo asignar el alumno.');
      console.warn(e);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator size="large" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Mis alumnos' }} />

      <ThemedText type="small" themeColor="textSecondary">
        Hola {profile?.name?.split(' ')[0]}, acá podés gestionar a tus alumnos.
      </ThemedText>

      <Card>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Agregar un alumno
        </ThemedText>
        <Field
          label="Email del alumno"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="off"
          keyboardType="email-address"
          placeholder="alumno@mail.com"
        />
        {message ? <ThemedText themeColor="success">{message}</ThemedText> : null}
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
        <Button label="Agregar como mi alumno" onPress={handleAgregar} loading={busy} />
      </Card>

      <View style={styles.row}>
        <Button variant="secondary" label="Catálogo de ejercicios" onPress={() => router.push('/ejercicios')} style={styles.flex} />
        <Button variant="secondary" label="Frases y tips" onPress={() => router.push('/contenido')} style={styles.flex} />
      </View>

      <Button variant="danger" label="Cerrar sesión" onPress={signOut} />

      {!alumnos.length ? (
        <EmptyState
          title="Todavía no tenés alumnos"
          subtitle="Agregá un alumno por su email para empezar a asignarle una rutina."
        />
      ) : (
        <>
          <ThemedText type="subtitle">Tus alumnos ({alumnos.length})</ThemedText>
          {alumnos.map((a) => {
            const st = stats[a.id];
            return (
              <Pressable key={a.id} onPress={() => router.push(`/alumno/${a.id}`)} style={({ pressed }) => pressed && styles.pressed}>
                <Card>
                  <Row between>
                    <View style={styles.flex}>
                      <ThemedText type="default">{a.name ?? a.email}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {a.email}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="tint">
                      Ver
                    </ThemedText>
                  </Row>
                  <ThemedText type="small" themeColor="textSecondary">
                    {st
                      ? `${st.sessions} entrenamientos · ${formatMinutes(st.minutes)} · ${st.hasRoutine ? 'con rutina' : 'sin rutina'}`
                      : 'Cargando...'}
                  </ThemedText>
                </Card>
              </Pressable>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
});