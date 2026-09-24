import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card, Row } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { useWorkout } from '@/context/workout';
import {
  fetchActiveRoutineForClient,
  fetchRandomPhrase,
  fetchRandomTip,
  fetchSchedule,
  fetchSessions,
  insertSession,
  type RoutineFull,
} from '@/lib/db';
import { formatDurationMs, formatMinutes, regionLabel, weekdayLabel, weekdayOf } from '@/lib/format';
import { Spacing } from '@/constants/theme';
import type { MotivationalPhrase, NutritionTip, RoutineSchedule, WorkoutSession } from '@/types';

function isSameDay(iso: string, date: Date): boolean {
  return new Date(iso).toDateString() === date.toDateString();
}

export default function ClientHomeScreen() {
  const router = useRouter();
  const { session, profile } = useSession();
  const workout = useWorkout();

  const [routine, setRoutine] = useState<RoutineFull | null>(null);
  const [schedule, setSchedule] = useState<RoutineSchedule[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [phrase, setPhrase] = useState<MotivationalPhrase | null>(null);
  const [tip, setTip] = useState<NutritionTip | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const uid = session?.user?.id;

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const [r, s, sess, ph, t] = await Promise.all([
        fetchActiveRoutineForClient(uid),
        fetchSchedule(uid),
        fetchSessions(uid),
        fetchRandomPhrase(),
        fetchRandomTip(),
      ]);
      setRoutine(r);
      setSchedule(s);
      setSessions(sess);
      if (ph) setPhrase(ph);
      if (t) setTip(t);
    } catch (e) {
      console.warn('Error cargando home', e);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const todayWeekday = weekdayOf(new Date());
  const scheduledToday = schedule.find((s) => s.weekday === todayWeekday);
  const todayBlock = routine?.routine_blocks.find((b) => b.id === scheduledToday?.block_id) ?? null;
  const completedToday = sessions.some((s) => isSameDay(s.completed_on, new Date()));

  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0);

  async function markComplete() {
    if (!uid || !routine || !todayBlock || completedToday) return;
    setSaving(true);
    try {
      await insertSession({
        client_id: uid,
        block_id: todayBlock.id,
        routine_id: routine.id,
        weekday: todayWeekday,
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleFinishTimer() {
    await workout.finish();
    await load();
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator size="large" />
      </Screen>
    );
  }

  const firstName = profile?.name?.split(' ')[0] ?? '';

  return (
    <Screen>
      <View>
        <ThemedText type="small" themeColor="textSecondary">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </ThemedText>
        <ThemedText type="subtitle">Hola{firstName ? `, ${firstName}` : ''}</ThemedText>
      </View>

      {phrase ? (
        <Card style={styles.quoteCard}>
          <ThemedText type="default" style={styles.quote}>
            “{phrase.text}”
          </ThemedText>
          {phrase.author ? (
            <ThemedText type="smallBold" themeColor="textSecondary">
              — {phrase.author}
            </ThemedText>
          ) : null}
        </Card>
      ) : null}

      {/* Entrenamiento de hoy */}
      {workout.status === 'running' || workout.status === 'paused' ? (
        <Card>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Entrenamiento en curso
          </ThemedText>
          <ThemedText type="subtitle" style={styles.timer}>
            {formatDurationMs(workout.elapsedMs)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {workout.label ?? 'Entrenamiento'}
          </ThemedText>
          <View style={styles.row}>
            {workout.status === 'running' ? (
              <Button variant="secondary" label="Pausar" onPress={workout.pause} style={styles.flex} />
            ) : (
              <Button variant="secondary" label="Reanudar" onPress={workout.resume} style={styles.flex} />
            )}
            <Button label="Finalizar" onPress={handleFinishTimer} style={styles.flex} />
          </View>
        </Card>
      ) : !routine ? (
        <EmptyState
          title="Todavía no tenés rutina"
          subtitle="Tu profe todavía no te asignó una rutina. Cuando lo haga, vas a verla acá."
        />
      ) : todayBlock && scheduledToday ? (
        <Card>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Hoy · {weekdayLabel(todayWeekday)}
          </ThemedText>
          <ThemedText type="subtitle">{todayBlock.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {regionLabel(todayBlock.region)} · {todayBlock.routine_block_exercises.length} ejercicios
          </ThemedText>

          {completedToday ? (
            <ThemedText type="smallBold" style={{ color: '#1F9D57' }}>
              ¡Listo! Hoy ya marcaste este entrenamiento como completado.
            </ThemedText>
          ) : (
            <View style={styles.row}>
              <Button
                variant="secondary"
                label="Completado"
                onPress={markComplete}
                loading={saving}
                style={styles.flex}
              />
              <Button
                label="Empezar"
                onPress={() =>
                  workout.start({ blockId: todayBlock.id, routineId: routine.id, label: todayBlock.name })
                }
                style={styles.flex}
              />
            </View>
          )}
        </Card>
      ) : (
        <EmptyState
          title="Hoy no hay entrenamiento programado"
          subtitle="Entrá a tu rutina para elegir qué días hacés cada parte del cuerpo."
        />
      )}

      {/* Resumen */}
      <View style={styles.row}>
        <Card style={[styles.flex, styles.statCard]}>
          <ThemedText type="title">{totalSessions}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Entrenamientos
          </ThemedText>
        </Card>
        <Card style={[styles.flex, styles.statCard]}>
          <ThemedText type="title">{formatMinutes(totalMinutes)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Tiempo total
          </ThemedText>
        </Card>
      </View>

      {!routine || !routine.routine_blocks.length ? (
        <Button variant="secondary" label="Ver mi rutina" onPress={() => router.push('/rutina')} />
      ) : null}

      {tip ? (
        <Card>
          <ThemedText type="smallBold" themeColor="tint">
            Tip de alimentación
          </ThemedText>
          <ThemedText type="default" style={styles.tipTitle}>
            {tip.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {tip.body}
          </ThemedText>
        </Card>
      ) : null}

      <Row>
        <ThemedText type="small" themeColor="textSecondary">
          ¿Querés ver todo tu progreso?
        </ThemedText>
        <ThemedText type="linkPrimary" onPress={() => router.push('/historial')}>
          Ver historial
        </ThemedText>
      </Row>
    </Screen>
  );
}

const styles = StyleSheet.create({
  quoteCard: { gap: Spacing.two },
  quote: { fontStyle: 'italic' },
  timer: { fontVariant: ['tabular-nums'] },
  tipTitle: { fontWeight: 700 },
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'stretch' },
  flex: { flex: 1 },
  statCard: { alignItems: 'center' },
});