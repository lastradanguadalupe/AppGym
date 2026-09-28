import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { useWorkout } from '@/context/workout';
import {
  fetchActiveRoutineForClient,
  fetchSchedule,
  fetchSessions,
  insertSession,
  upsertSchedule,
  type RoutineFull,
} from '@/lib/db';
import { WEEKDAYS_SHORT, regionLabel, weekdayLabel, weekdayOf } from '@/lib/format';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RoutineBlock, RoutineSchedule, WorkoutSession } from '@/types';

function isSameDay(iso: string, date: Date): boolean {
  return new Date(iso).toDateString() === date.toDateString();
}

export default function RutinaScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session } = useSession();
  const workout = useWorkout();

  const [routine, setRoutine] = useState<RoutineFull | null>(null);
  const [schedule, setSchedule] = useState<RoutineSchedule[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const uid = session?.user?.id;
  const todayWeekday = weekdayOf(new Date());

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const [r, s, sess] = await Promise.all([
        fetchActiveRoutineForClient(uid),
        fetchSchedule(uid),
        fetchSessions(uid),
      ]);
      setRoutine(r);
      setSchedule(s);
      setSessions(sess);
    } catch (e) {
      console.warn('Error cargando rutina', e);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function scheduledWeekdayOf(blockId: number): number | null {
    return schedule.find((s) => s.block_id === blockId)?.weekday ?? null;
  }

  function blockOfWeekday(weekday: number): RoutineBlock | null {
    const s = schedule.find((x) => x.weekday === weekday);
    if (!s) return null;
    return routine?.routine_blocks.find((b) => b.id === s.block_id) ?? null;
  }

  async function handleSetDay(block: RoutineBlock, weekday: number) {
    if (!uid || !routine) return;
    const currently = scheduledWeekdayOf(block.id);
    if (currently === weekday) return;
    try {
      await upsertSchedule(routine.id, uid, block.id, weekday);
      await load();
    } catch (e) {
      console.warn('Error actualizando semana', e);
    }
  }

  async function markComplete(block: RoutineBlock) {
    if (!uid || !routine || savingId != null) return;
    setSavingId(block.id);
    try {
      await insertSession({
        client_id: uid,
        block_id: block.id,
        routine_id: routine.id,
        weekday: todayWeekday,
      });
      await load();
    } finally {
      setSavingId(null);
    }
  }

  function isCompletedToday(blockId: number): boolean {
    return sessions.some((s) => s.block_id === blockId && isSameDay(s.completed_on, new Date()));
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={theme.brandBright} style={styles.loader} />
      </Screen>
    );
  }

  if (!routine || !routine.routine_blocks.length) {
    return (
      <Screen>
        <ThemedText type="display">Tu rutina</ThemedText>
        <EmptyState
          icon="clipboard-text-outline"
          title="Aún no tenés rutina"
          subtitle="Tu profe todavía no te asignó una rutina con bloques de entrenamiento."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.titleBlock}>
        <ThemedText type="display">{routine.title}</ThemedText>
        {routine.description ? (
          <ThemedText type="small" themeColor="textSecondary">
            {routine.description}
          </ThemedText>
        ) : null}
      </View>

      {/* Resumen de la semana */}
      <Card>
        <ThemedText type="eyebrow" themeColor="textSecondary">
          Tu semana
        </ThemedText>
        {Array.from({ length: 7 }, (_, weekday) => {
          const block = blockOfWeekday(weekday);
          return (
            <View key={weekday} style={styles.weekRow}>
              <ThemedText type="small" themeColor={block ? 'text' : 'textSecondary'} style={styles.weekDay}>
                {weekdayLabel(weekday)}
              </ThemedText>
              <ThemedText type="small" themeColor={block ? 'brandBright' : 'textSecondary'}>
                {block ? block.name : 'Descanso / libre'}
              </ThemedText>
            </View>
          );
        })}
      </Card>

      <ThemedText type="small" themeColor="textSecondary" style={styles.helper}>
        Tocá un día de la semana en cada bloque para elegir cuándo lo hacés.
      </ThemedText>

      {routine.routine_blocks.map((block, index) => {
        const completed = isCompletedToday(block.id);
        return (
          <Card key={block.id} style={styles.blockCard}>
            <View>
              <ThemedText type="smallBold" themeColor="brandBright">
                Bloque {index + 1} · {regionLabel(block.region)}
              </ThemedText>
              <ThemedText type="subtitle">{block.name}</ThemedText>
            </View>

            <View style={styles.group}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Día de la semana
              </ThemedText>
              <View style={styles.chipsRow}>
                {WEEKDAYS_SHORT.map((label, weekday) => (
                  <Chip
                    key={weekday}
                    label={label}
                    selected={scheduledWeekdayOf(block.id) === weekday}
                    onPress={() => handleSetDay(block, weekday)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.exerciseList}>
              {block.routine_block_exercises.map((rbe) => (
                <Pressable
                  key={rbe.id}
                  onPress={() =>
                    router.push({ pathname: '/rutina/[id]', params: { id: rbe.exercise_id, blockId: rbe.block_id } })
                  }
                  style={({ pressed }) => pressed && styles.pressed}>
                  <Card padded={false} style={styles.exerciseRow}>
                    <View style={styles.flex}>
                      <ThemedText type="smallBold">{rbe.exercises?.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {rbe.sets} × {rbe.reps} · {rbe.rest_seconds}s descanso
                      </ThemedText>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.brandBright} />
                  </Card>
                </Pressable>
              ))}
            </View>

            {completed ? (
              <View style={[styles.done, { backgroundColor: `${theme.teal}1A`, borderColor: `${theme.teal}40` }]}>
                <MaterialCommunityIcons name="check-circle" size={20} color={theme.teal} />
                <ThemedText type="smallBold" themeColor="teal">
                  Completado hoy
                </ThemedText>
              </View>
            ) : (
              <View style={styles.row}>
                <Button
                  variant="secondary"
                  label="Marcar completo"
                  icon="check"
                  onPress={() => markComplete(block)}
                  loading={savingId === block.id}
                  style={styles.flex}
                />
                <Button
                  label="Empezar"
                  icon="play"
                  onPress={() =>
                    workout.start({ blockId: block.id, routineId: routine.id, label: block.name })
                  }
                  style={styles.flex}
                />
              </View>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.five },
  titleBlock: { gap: Spacing.one },
  group: { gap: Spacing.md },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  weekDay: { fontWeight: '700' },
  helper: { textAlign: 'center' },
  blockCard: { gap: Spacing.three },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  exerciseList: { gap: Spacing.two },
  exerciseRow: {
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
  },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: { opacity: 0.7 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: Spacing.two },
});