import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { fetchSessions } from '@/lib/db';
import { formatDateTime, formatMinutes, regionLabel } from '@/lib/format';
import { Spacing } from '@/constants/theme';
import type { WorkoutSession } from '@/types';

type SessionRow = WorkoutSession & {
  routine_blocks?: { id: number; name: string; region: string } | null;
};

export default function HistorialScreen() {
  const { session } = useSession();
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
        <ActivityIndicator size="large" />
      </Screen>
    );
  }

  if (!sessions.length) {
    return (
      <Screen>
        <EmptyState
          title="Todavía no entrenaste"
          subtitle="Cuando completes o finalices un entrenamiento, vas a ver tu historial acá."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ThemedText type="subtitle">Historial</ThemedText>

      <View style={styles.statsRow}>
        <Card style={[styles.flex, styles.statCard]}>
          <ThemedText type="title">{sessions.length}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Entrenamientos
          </ThemedText>
        </Card>
        <Card style={[styles.flex, styles.statCard]}>
          <ThemedText type="title">{formatMinutes(totalMinutes)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Tiempo
          </ThemedText>
        </Card>
      </View>

      {sessions.map((s) => (
        <Card key={s.id} style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <ThemedText type="default">
              {s.routine_blocks?.name ?? 'Entrenamiento'}
            </ThemedText>
            <ThemedText type="smallBold" themeColor="tint">
              {s.duration_minutes != null ? formatMinutes(s.duration_minutes) : 'Completo'}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDateTime(s.completed_on)}
            {s.routine_blocks ? ` · ${regionLabel(s.routine_blocks.region)}` : ''}
          </ThemedText>
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
  statsRow: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  statCard: { alignItems: 'center' },
  sessionCard: { gap: Spacing.one },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalNote: { textAlign: 'center' },
});