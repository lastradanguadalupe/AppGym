import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { fetchActiveRoutineForClient, fetchExercise } from '@/lib/db';
import { regionLabel } from '@/lib/format';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Exercise } from '@/types';

export default function ExerciseDetailScreen() {
  const params = useLocalSearchParams<{ id: string; blockId?: string }>();
  const { session } = useSession();
  const theme = useTheme();

  const [exercise, setExercise] = useState<(Exercise & { muscle_groups?: { name: string; region: string } }) | null>(null);
  const [context, setContext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const id = Number(params.id);
        const [ex, activeRoutine] = await Promise.all([
          fetchExercise(id),
          params.blockId ? fetchActiveRoutineForClient(session?.user?.id ?? '') : null,
        ]);
        if (!active) return;
        setExercise(ex);
        if (activeRoutine && params.blockId) {
          const block = activeRoutine.routine_blocks.find((b) => b.id === Number(params.blockId));
          const rbe = block?.routine_block_exercises.find((x) => x.exercise_id === id);
          if (rbe) {
            setContext(
              `${block?.name ?? 'Bloque'} · ${rbe.sets} × ${rbe.reps} · ${rbe.rest_seconds}s de descanso`
            );
          }
        }
      } catch (e) {
        console.warn('Error cargando ejercicio', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [params.id, params.blockId, session?.user?.id]);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator size="large" />
      </Screen>
    );
  }

  if (!exercise) {
    return (
      <Screen>
        <ThemedText type="subtitle">Ejercicio no encontrado</ThemedText>
      </Screen>
    );
  }

  const muscle = exercise.muscle_groups;

  return (
    <Screen>
      <Stack.Screen options={{ title: exercise.name }} />

      {exercise.image_url ? (
        <Image
          source={{ uri: exercise.image_url }}
          style={styles.image}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={[styles.image, { backgroundColor: theme.backgroundElement }]}>
          <SymbolView tintColor={theme.textSecondary} name="dumbbell" size={48} />
          <ThemedText type="small" themeColor="textSecondary">
            Foto pendiente · {muscle?.name ?? ''}
          </ThemedText>
        </View>
      )}

      <View style={styles.chipsRow}>
        {muscle ? <Chip label={muscle.name} selected /> : null}
        {muscle ? <Chip label={regionLabel(muscle.region as never)} /> : null}
      </View>

      {context ? (
        <Card>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Parámetros en tu rutina
          </ThemedText>
          <ThemedText type="default">{context}</ThemedText>
        </Card>
      ) : null}

      <Card>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Cómo hacerlo
        </ThemedText>
        <ThemedText type="default">
          {exercise.instructions ?? 'Sin indicaciones por el momento. Consultá a tu profe.'}
        </ThemedText>
      </Card>

      {exercise.video_url ? (
        <Pressable onPress={() => Linking.openURL(exercise.video_url!)}>
          <Card style={styles.videoCard}>
            <ThemedText type="linkPrimary">Ver video de referencia</ThemedText>
          </Card>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  chipsRow: { flexDirection: 'row', gap: Spacing.two },
  videoCard: { alignItems: 'center' },
});