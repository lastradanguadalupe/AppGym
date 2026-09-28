import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card, Row, StatCard } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty';
import { HeroHeader } from '@/components/ui/hero';
import { Screen, Section } from '@/components/ui/screen';
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
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MotivationalPhrase, NutritionTip, RoutineSchedule, WorkoutSession } from '@/types';

function isSameDay(iso: string, date: Date): boolean {
  return new Date(iso).toDateString() === date.toDateString();
}

export default function ClientHomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session, profile } = useSession();
  const workout = useWorkout();

  const [routine, setRoutine] = useState<RoutineFull | null>(null);
  const [schedule, setSchedule] = useState<RoutineSchedule[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [phrase, setPhrase] = useState<MotivationalPhrase | null>(null);
  const [tip, setTip] = useState<NutritionTip | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(0);

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
      setNow(Date.now());
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
  const completedToday = sessions.some((s) => isSameDay(s.completed_on, new Date(now)));

  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0);
  const weekSessions = sessions.filter((s) => {
    const diff = now - new Date(s.completed_on).getTime();
    return diff <= 7 * 24 * 60 * 60 * 1000;
  }).length;

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
        <ActivityIndicator size="large" color={theme.brand} style={styles.loader} />
      </Screen>
    );
  }

  const firstName = profile?.name?.split(' ')[0] ?? '';

  return (
    <Screen padded={false} contentStyle={styles.screenContent}>
      <HeroHeader
        eyebrow={new Date().toLocaleDateString('es-AR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
        title={firstName ? `Hola, ${firstName}` : 'Hola'}
        subtitle={routine?.title ?? 'Entrená con constancia: eso es lo que construye resultados.'}
      />

      <View style={styles.body}>
        {phrase ? (
          <Card tone="brand" style={styles.quoteCard}>
            <MaterialCommunityIcons name="format-quote-open" size={22} color={theme.teal} />
            <ThemedText type="quote" style={styles.quote}>
              {phrase.text}
            </ThemedText>
            {phrase.author ? (
              <ThemedText type="smallBold" themeColor="textSecondary">
                {phrase.author}
              </ThemedText>
            ) : null}
          </Card>
        ) : null}

        <Section title="Tu entrenamiento de hoy">
          {workout.status === 'running' || workout.status === 'paused' ? (
            <Card>
              <View style={styles.timerHeader}>
                <ThemedText type="eyebrow" themeColor="teal">
                  En curso
                </ThemedText>
                <View style={[styles.liveDot, { backgroundColor: theme.teal }]} />
              </View>
              <ThemedText type="display" style={styles.timer}>
                {formatDurationMs(workout.elapsedMs)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {workout.label ?? 'Entrenamiento'}
              </ThemedText>
              <View style={styles.row}>
                {workout.status === 'running' ? (
                  <Button
                    variant="secondary"
                    label="Pausar"
                    icon="pause"
                    onPress={workout.pause}
                    style={styles.flex}
                  />
                ) : (
                  <Button
                    variant="secondary"
                    label="Reanudar"
                    icon="play"
                    onPress={workout.resume}
                    style={styles.flex}
                  />
                )}
                <Button label="Finalizar" icon="stop" onPress={handleFinishTimer} style={styles.flex} />
              </View>
            </Card>
          ) : !routine ? (
            <EmptyState
              icon="clipboard-text-outline"
              title="Todavía no tenés rutina"
              subtitle="Tu profe todavía no te asignó una rutina. Cuando lo haga, vas a verla acá."
            />
          ) : todayBlock && scheduledToday ? (
            <Card>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: theme.brandSurface }]}>
                  <ThemedText type="smallBold" themeColor="brandBright">
                    {weekdayLabel(todayWeekday)}
                  </ThemedText>
                </View>
                <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
                  <MaterialCommunityIcons
                    name="map-marker-outline"
                    size={14}
                    color={theme.textSecondary}
                  />
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {regionLabel(todayBlock.region)}
                  </ThemedText>
                </View>
              </View>

              <ThemedText type="subtitle">{todayBlock.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {todayBlock.routine_block_exercises.length} ejercicios ·{' '}
                {todayBlock.routine_block_exercises.reduce((acc, e) => acc + e.sets, 0)} series
              </ThemedText>

              {completedToday ? (
                <View style={[styles.done, { backgroundColor: `${theme.teal}1A`, borderColor: `${theme.teal}40` }]}>
                  <MaterialCommunityIcons name="check-circle" size={20} color={theme.teal} />
                  <ThemedText type="smallBold" themeColor="teal" style={styles.flex}>
                    ¡Listo! Hoy ya marcaste este entrenamiento como completado.
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.row}>
                  <Button
                    variant="secondary"
                    label="Completado"
                    icon="check"
                    onPress={markComplete}
                    loading={saving}
                    style={styles.flex}
                  />
                  <Button
                    label="Empezar"
                    icon="play"
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
              icon="weather-night"
              title="Hoy es día de descanso"
              subtitle="Entrá a tu rutina para elegir qué días hacés cada parte del cuerpo."
            />
          )}
        </Section>

        <Section title="Tu progreso">
          <View style={styles.row}>
            <StatCard icon="dumbbell" value={String(totalSessions)} label="Entrenamientos" />
            <StatCard
              icon="timer-outline"
              value={formatMinutes(totalMinutes)}
              label="Tiempo total"
              tint={theme.brandBright}
            />
            <StatCard
              icon="fire"
              value={String(weekSessions)}
              label="Esta semana"
              tint={theme.teal}
            />
          </View>
        </Section>

        {!routine || !routine.routine_blocks.length ? (
          <Button
            variant="secondary"
            label="Ver mi rutina"
            icon="arrow-right"
            onPress={() => router.push('/rutina')}
          />
        ) : null}

        {tip ? (
          <Section title="Tip de alimentación">
            <Card>
              <View style={styles.tipHeader}>
                <View style={[styles.tipIcon, { backgroundColor: `${theme.teal}1F`, borderColor: `${theme.teal}40` }]}>
                  <MaterialCommunityIcons name="food-apple-outline" size={20} color={theme.teal} />
                </View>
                <ThemedText type="default" style={styles.flex}>
                  {tip.title}
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {tip.body}
              </ThemedText>
            </Card>
          </Section>
        ) : null}

        <Row>
          <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
            ¿Querés ver todo tu progreso?
          </ThemedText>
          <ThemedText type="linkPrimary" onPress={() => router.push('/historial')}>
            Ver historial
          </ThemedText>
        </Row>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.five },
  screenContent: { paddingTop: 0 },
  body: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four, gap: Spacing.four },
  quoteCard: { gap: Spacing.two, borderRadius: Radius.lg },
  quote: { letterSpacing: -0.2 },
  timerHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  timer: { fontVariant: ['tabular-nums'] },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'stretch' },
  flex: { flex: 1 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
