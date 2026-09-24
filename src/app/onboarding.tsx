import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { useSession } from '@/context/session';
import { upsertClientDetails } from '@/lib/db';
import { parseTags } from '@/lib/format';
import { Spacing } from '@/constants/theme';
import type { Experiencia } from '@/types';

const EXPERIENCIAS: { value: Experiencia; label: string }[] = [
  { value: 'inicio', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
];

export default function OnboardingScreen() {
  const { session, refreshProfile } = useSession();
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [altura, setAltura] = useState('');
  const [peso, setPeso] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [enfermedades, setEnfermedades] = useState('');
  const [lesiones, setLesiones] = useState('');
  const [experiencia, setExperiencia] = useState<Experiencia | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const uid = session?.user?.id;
    if (!uid) return;

    if (fechaNacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento.trim())) {
      setError('La fecha debe ser con formato AAAA-MM-DD.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await upsertClientDetails(uid, {
        fecha_nacimiento: fechaNacimiento.trim() || null,
        altura_cm: altura ? Number(altura) : null,
        peso_kg: peso ? Number(peso) : null,
        objetivo: objetivo.trim() || null,
        enfermedades: parseTags(enfermedades),
        lesiones: parseTags(lesiones),
        experiencia,
      });
      await refreshProfile();
    } catch (e) {
      setError('No se pudo guardar. Intentá de nuevo.');
      console.warn(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ThemedText type="subtitle">Contanos un poco sobre vos</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Esta información es para que tu profe arme la rutina que mejor se adapte a tu cuerpo y tus
        objetivos. La podés modificar cuando quieras.
      </ThemedText>

      <Card>
        <Field
          label="Fecha de nacimiento"
          value={fechaNacimiento}
          onChangeText={setFechaNacimiento}
          placeholder="AAAA-MM-DD (ej: 1995-04-12)"
          autoCapitalize="none"
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <Field
              label="Altura (cm)"
              value={altura}
              onChangeText={setAltura}
              keyboardType="decimal-pad"
              placeholder="175"
            />
          </View>
          <View style={styles.half}>
            <Field
              label="Peso (kg)"
              value={peso}
              onChangeText={setPeso}
              keyboardType="decimal-pad"
              placeholder="70"
            />
          </View>
        </View>

        <Field
          label="Objetivo"
          value={objetivo}
          onChangeText={setObjetivo}
          placeholder="Ej: ganar músculo, bajar de peso, mantenerme..."
        />

        <Field
          label="Enfermedades (separadas por coma)"
          value={enfermedades}
          onChangeText={setEnfermedades}
          placeholder="Ej: hipertensión, diabetes... (si ninguna, dejalo vacío)"
        />
        <Field
          label="Lesiones (separadas por coma)"
          value={lesiones}
          onChangeText={setLesiones}
          placeholder="Ej: rodilla, hombro... (si ninguna, dejalo vacío)"
        />

        <ThemedText type="smallBold" themeColor="textSecondary">
          Nivel de experiencia
        </ThemedText>
        <View style={styles.row}>
          {EXPERIENCIAS.map((exp) => (
            <Chip
              key={exp.value}
              label={exp.label}
              selected={experiencia === exp.value}
              onPress={() => setExperiencia(exp.value)}
            />
          ))}
        </View>

        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
        <Button label="Guardar y empezar" onPress={handleSave} loading={saving} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  half: { flex: 1, minWidth: 120 },
});