import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import {
  addBlockExercise,
  createBlock,
  createRoutine,
  deleteBlock,
  deleteBlockExercise,
  deleteRoutine,
  fetchActiveRoutineForClient,
  fetchClientDetails,
  fetchExercises,
  fetchMuscleGroups,
  fetchProfile,
  fetchSessions,
  updateBlockExercise,
  type RoutineFull,
} from '@/lib/db';
import { computeEdad, experienciaLabel, formatDateTime, formatMinutes, regionLabel } from '@/lib/format';
import { Spacing } from '@/constants/theme';
import type {
  ClientDetails,
  Exercise,
  MuscleGroup,
  Profile,
  Region,
  RoutineBlockExercise,
  WorkoutSession,
} from '@/types';

const REGIONS: { value: Region; label: string }[] = [
  { value: 'superior', label: 'Tren superior' },
  { value: 'inferior', label: 'Tren inferior' },
  { value: 'core', label: 'Core' },
  { value: 'full', label: 'Cuerpo completo' },
];

export default function AdminAlumnoScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { profile: me } = useSession();
  const userId = params.id ?? '';

  const [client, setClient] = useState<Profile | null>(null);
  const [details, setDetails] = useState<ClientDetails | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [routine, setRoutine] = useState<RoutineFull | null>(null);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [exercises, setExercises] = useState<(Exercise & { muscle_groups: MuscleGroup })[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Forms
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newBlockName, setNewBlockName] = useState('');
  const [newBlockRegion, setNewBlockRegion] = useState<Region>('superior');
  const [pickerBlock, setPickerBlock] = useState<number | null>(null);
  const [pickerMuscle, setPickerMuscle] = useState<number | null>(null);
  const [editingRbe, setEditingRbe] = useState<number | null>(null);
  const [editSets, setEditSets] = useState('3');
  const [editReps, setEditReps] = useState('10-12');
  const [editRest, setEditRest] = useState('60');

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [p, d, s, r, mg, ex] = await Promise.all([
        fetchProfile(userId),
        fetchClientDetails(userId),
        fetchSessions(userId),
        fetchActiveRoutineForClient(userId),
        fetchMuscleGroups(),
        fetchExercises(),
      ]);
      setClient(p);
      setDetails(d);
      setSessions(s);
      setRoutine(r);
      setMuscleGroups(mg);
      setExercises(ex as (Exercise & { muscle_groups: MuscleGroup })[]);
    } catch (e) {
      console.warn('Error cargando alumno', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // ---------- Rutina ----------

  async function handleCreateRoutine() {
    if (!me || !newTitle.trim()) return;
    setBusy(true);
    try {
      await createRoutine({ profe_id: me.id, cliente_id: userId, title: newTitle.trim(), description: newDescription.trim() || null });
      setNewTitle('');
      setNewDescription('');
      await load();
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'No se pudo crear la rutina.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddBlock() {
    if (!routine || !newBlockName.trim()) return;
    setBusy(true);
    try {
      await createBlock({
        routine_id: routine.id,
        name: newBlockName.trim(),
        region: newBlockRegion,
        position: routine.routine_blocks.length,
      });
      setNewBlockName('');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteBlock(blockId: number) {
    Alert.alert('Eliminar bloque', '¿Seguro que querés eliminar este bloque?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBlock(blockId);
            await load();
          } catch (e) {
            console.warn(e);
          }
        },
      },
    ]);
  }

  async function handleAddExercise(blockId: number, exerciseId: number) {
    setBusy(true);
    try {
      const block = routine?.routine_blocks.find((b) => b.id === blockId);
      await addBlockExercise({
        block_id: blockId,
        exercise_id: exerciseId,
        sets: 3,
        reps: '10-12',
        rest_seconds: 60,
        position: block?.routine_block_exercises.length ?? 0,
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteExercise(rbeId: number) {
    try {
      await deleteBlockExercise(rbeId);
      await load();
    } catch (e) {
      console.warn(e);
    }
  }

  function openEditRbe(rbe: RoutineBlockExercise) {
    setEditSets(String(rbe.sets));
    setEditReps(rbe.reps);
    setEditRest(String(rbe.rest_seconds));
    setEditingRbe(rbe.id);
  }

  async function handleSaveRbe(rbe: RoutineBlockExercise) {
    const sets = Number(editSets);
    const rest = Number(editRest);
    if (!Number.isFinite(sets) || sets < 1 || !Number.isFinite(rest) || rest < 0) {
      Alert.alert('Revisá los valores', 'Series y descanso deben ser números válidos.');
      return;
    }
    setBusy(true);
    try {
      await updateBlockExercise(rbe.id, {
        sets,
        reps: editReps.trim() || '10-12',
        rest_seconds: rest,
      });
      setEditingRbe(null);
      await load();
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'No se pudieron guardar los cambios.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteRoutine() {
    if (!routine) return;
    Alert.alert('Eliminar rutina', '¿Seguro que querés eliminar toda la rutina del alumno?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRoutine(routine.id);
            setRoutine(null);
            await load();
          } catch (e) {
            console.warn(e);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator size="large" />
      </Screen>
    );
  }

  if (!client) {
    return (
      <Screen>
        <EmptyState title="Alumno no encontrado" />
      </Screen>
    );
  }

  const edad = computeEdad(details?.fecha_nacimiento ?? null);

  return (
    <Screen>
      {/* Datos del alumno */}
      <Card>
        <ThemedText type="subtitle">{client.name ?? client.email}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {client.email}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {edad != null ? `Edad: ${edad} años · ` : ''}
          Altura: {details?.altura_cm ?? '—'} cm · Peso: {details?.peso_kg ?? '—'} kg
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Nivel: {experienciaLabel(details?.experiencia ?? null)} · Objetivo:{' '}
          {details?.objetivo ?? '—'}
        </ThemedText>
        {details?.enfermedades?.length ? (
          <ThemedText type="small" themeColor="textSecondary">
            Enfermedades: {details.enfermedades.join(', ')}
          </ThemedText>
        ) : null}
        {details?.lesiones?.length ? (
          <ThemedText type="small" themeColor="textSecondary">
            Lesiones: {details.lesiones.join(', ')}
          </ThemedText>
        ) : null}
      </Card>

      {/* Avance */}
      <Card>
        <ThemedText type="smallBold" themeColor="tint">
          Avance
        </ThemedText>
        <View style={styles.statsRow}>
          <View style={styles.flex}>
            <ThemedText type="title">{sessions.length}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Entrenamientos
            </ThemedText>
          </View>
          <View style={styles.flex}>
            <ThemedText type="title">
              {formatMinutes(sessions.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0))}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Tiempo total
            </ThemedText>
          </View>
        </View>
        {sessions.slice(0, 5).map((s) => (
          <ThemedText key={s.id} type="small" themeColor="textSecondary">
            {formatDateTime(s.completed_on)}
            {s.duration_minutes != null ? ` · ${formatMinutes(s.duration_minutes)}` : ''}
          </ThemedText>
        ))}
      </Card>

      {/* Rutina */}
      <ThemedText type="subtitle">Rutina</ThemedText>

      {!routine ? (
        <Card>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Crear rutina para {client.name ?? 'el alumno'}
          </ThemedText>
          <Field label="Título" value={newTitle} onChangeText={setNewTitle} placeholder="Ej: Rutina de hipertrofia" />
          <Field label="Descripción" value={newDescription} onChangeText={setNewDescription} placeholder="Opcional" />
          <Button label="Crear rutina" onPress={handleCreateRoutine} loading={busy} />
        </Card>
      ) : (
        <Card>
          <View style={styles.headerRow}>
            <View style={styles.flex}>
              <ThemedText type="subtitle">{routine.title}</ThemedText>
              {routine.description ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {routine.description}
                </ThemedText>
              ) : null}
            </View>
            <Button variant="danger" label="Quitar" onPress={handleDeleteRoutine} />
          </View>

          <ThemedText type="smallBold" themeColor="textSecondary">
            Bloques (cada uno se programa en un día de la semana)
          </ThemedText>

          {routine.routine_blocks.map((block, index) => (
            <Card key={block.id} style={styles.blockBox}>
              <View style={styles.headerRow}>
                <View style={styles.flex}>
                  <ThemedText type="smallBold" themeColor="tint">
                    Bloque {index + 1} · {regionLabel(block.region)}
                  </ThemedText>
                  <ThemedText type="default">{block.name}</ThemedText>
                </View>
                <Button variant="danger" label="Eliminar" onPress={() => handleDeleteBlock(block.id)} />
              </View>

              {block.routine_block_exercises.map((rbe) => (
                <View key={rbe.id}>
                  <View style={styles.exerciseRow}>
                    <View style={styles.flex}>
                      <ThemedText type="default">{rbe.exercises?.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {rbe.sets} × {rbe.reps} · {rbe.rest_seconds}s ·{' '}
                        {rbe.exercises?.muscle_groups?.name}
                      </ThemedText>
                    </View>
                    {editingRbe === rbe.id ? (
                      <ThemedText type="small" themeColor="tint" onPress={() => setEditingRbe(null)}>
                        Cerrar
                      </ThemedText>
                    ) : (
                      <>
                        <ThemedText
                          type="small"
                          themeColor="tint"
                          onPress={() => openEditRbe(rbe)}>
                          Editar
                        </ThemedText>
                        <ThemedText
                          type="small"
                          themeColor="danger"
                          onPress={() =>
                            Alert.alert(rbe.exercises?.name ?? 'Ejercicio', '¿Quitar este ejercicio?', [
                              { text: 'Cancelar', style: 'cancel' },
                              { text: 'Quitar', style: 'destructive', onPress: () => handleDeleteExercise(rbe.id) },
                            ])
                          }>
                          Quitar
                        </ThemedText>
                      </>
                    )}
                  </View>

                  {editingRbe === rbe.id ? (
                    <View style={styles.editBox}>
                      <View style={styles.rowThree}>
                        <Field label="Series" value={editSets} onChangeText={setEditSets} keyboardType="number-pad" />
                        <Field label="Reps" value={editReps} onChangeText={setEditReps} placeholder="10-12" />
                        <Field label="Descanso (s)" value={editRest} onChangeText={setEditRest} keyboardType="number-pad" />
                      </View>
                      <Button variant="outline" label="Guardar" disabled={busy} onPress={() => handleSaveRbe(rbe)} />
                    </View>
                  ) : null}
                </View>
              ))}

              {pickerBlock === block.id ? (
                <View style={styles.picker}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Elegí un músculo y agregá ejercicios
                  </ThemedText>
                  <View style={styles.chipsRow}>
                    {muscleGroups.map((mg) => (
                      <Chip
                        key={mg.id}
                        label={mg.name}
                        selected={pickerMuscle === mg.id}
                        onPress={() => setPickerMuscle(mg.id)}
                      />
                    ))}
                  </View>
                  {exercises
                    .filter((ex) => pickerMuscle == null || ex.muscle_group_id === pickerMuscle)
                    .map((ex) => (
                      <View key={ex.id} style={styles.addRow}>
                        <View style={styles.flex}>
                          <ThemedText type="small">{ex.name}</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {ex.muscle_groups?.name}
                          </ThemedText>
                        </View>
                        <Button
                          variant="outline"
                          label="Agregar"
                          disabled={busy}
                          onPress={() => handleAddExercise(block.id, ex.id)}
                        />
                      </View>
                    ))}
                  {!exercises.length ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      Todavía no hay ejercicios en el catálogo. Cargalos desde “Catálogo de
                      ejercicios”.
                    </ThemedText>
                  ) : null}
                </View>
              ) : (
                <Button
                  variant="outline"
                  label="Agregar ejercicio"
                  onPress={() => {
                    setPickerBlock(block.id);
                    setPickerMuscle(null);
                  }}
                />
              )}
            </Card>
          ))}

          <ThemedText type="smallBold" themeColor="textSecondary">
            Agregar bloque
          </ThemedText>
          <Field label="Nombre del bloque" value={newBlockName} onChangeText={setNewBlockName} placeholder="Ej: Tren superior" />
          <View style={styles.chipsRow}>
            {REGIONS.map((r) => (
              <Chip
                key={r.value}
                label={r.label}
                selected={newBlockRegion === r.value}
                onPress={() => setNewBlockRegion(r.value)}
              />
            ))}
          </View>
          <Button label="Agregar bloque" onPress={handleAddBlock} loading={busy} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.two },
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  blockBox: { gap: Spacing.two },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  picker: { gap: Spacing.two, paddingTop: Spacing.two },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  editBox: { gap: Spacing.two, paddingTop: Spacing.two },
  rowThree: { flexDirection: 'row', gap: Spacing.two },
});