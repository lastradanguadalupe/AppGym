import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card, StatCard } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { fetchSessions } from '@/lib/db';
import { formatDateTime, formatMinutes, regionLabel } from '@/lib/format';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { WorkoutSession } from '@/types';

type SessionRow = WorkoutSession & {
  routine_blocks?: { id: number; name: string; region: string } | null;
};

export default function HistorialScreen() {
  const { session } = useSession();
  const theme = useTheme();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const uid = session?.user?.id;

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const data = await fetchSessions(uid);
      setSessions(data as SessionRow[]);
    } catch (e) {
      console.warn('Error cargando historial', e);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0);
  const withDuration = sessions.filter((s) => s.duration_minutes != null).length;

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={theme.brandBright} style={styles.loader} />
      </Screen>
    );
  }

  if (!sessions.length) {
    return (
      <Screen>
        <ThemedText type="display">Historial</ThemedText>
        <EmptyState
          icon="clock-outline"
          title="Todavía no entrenaste"
          subtitle="Cuando completes o finalices un entrenamiento, vas a ver tu historial acá."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ThemedText type="display">Historial</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Cada entrenamiento que completás queda registrado acá.
      </ThemedText>

      <View style={styles.statsRow}>
        <StatCard icon="dumbbell" value={String(sessions.length)} label="Entrenamientos" />
        <StatCard
          icon="timer-outline"
          value={formatMinutes(totalMinutes)}
          label="Tiempo"
          tint={theme.brandBright}
        />
      </View>

      {sessions.map((s) => (
        <Card key={s.id} style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <View style={styles.flex}>
              <ThemedText type="smallBold">
                {s.routine_blocks?.name ?? 'Entrenamiento'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatDateTime(s.completed_on)}
                {s.routine_blocks ? ` · ${regionLabel(s.routine_blocks.region)}` : ''}
              </ThemedText>
            </View>
            <View style={[styles.duration, { backgroundColor: theme.brandSurface }]}>
              <ThemedText type="smallBold" themeColor="brandBright">
                {s.duration_minutes != null ? formatMinutes(s.duration_minutes) : 'Completo'}
              </ThemedText>
            </View>
          </View>
        </Card>
      ))}

      {withDuration > 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.totalNote}>
          {withDuration} de {sessions.length} entrenamientos con tiempo registrado por el reloj.
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.five },
  statsRow: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  sessionCard: { gap: Spacing.two },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  duration: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  totalNote: { textAlign: 'center' },
});