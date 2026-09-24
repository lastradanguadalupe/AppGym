import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { fetchProfile, updateProfileName, upsertClientDetails } from '@/lib/db';
import { computeEdad, parseTags } from '@/lib/format';
import { Spacing } from '@/constants/theme';
import type { Experiencia, Profile } from '@/types';

const EXPERIENCIAS: { value: Experiencia; label: string }[] = [
  { value: 'inicio', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
];

export default function PerfilScreen() {
  const { session, profile, clientDetails, refreshProfile, signOut } = useSession();

  const [name, setName] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [altura, setAltura] = useState('');
  const [peso, setPeso] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [enfermedades, setEnfermedades] = useState('');
  const [lesiones, setLesiones] = useState('');
  const [experiencia, setExperiencia] = useState<Experiencia | null>(null);
  const [profe, setProfe] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? '');
    if (profile.profe_id) {
      fetchProfile(profile.profe_id)
        .then(setProfe)
        .catch(() => setProfe(null));
    }
  }, [profile]);

  useEffect(() => {
    if (!clientDetails) return;
    setFechaNacimiento(clientDetails.fecha_nacimiento ?? '');
    setAltura(clientDetails.altura_cm != null ? String(clientDetails.altura_cm) : '');
    setPeso(clientDetails.peso_kg != null ? String(clientDetails.peso_kg) : '');
    setObjetivo(clientDetails.objetivo ?? '');
    setEnfermedades((clientDetails.enfermedades ?? []).join(', '));
    setLesiones((clientDetails.lesiones ?? []).join(', '));
    setExperiencia(clientDetails.experiencia);
  }, [clientDetails]);

  const uid = session?.user?.id;
  const edad = computeEdad(clientDetails?.fecha_nacimiento ?? null);

  async function handleSave() {
    if (!uid) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      if (name.trim() && name.trim() !== profile?.name) {
        await updateProfileName(uid, name.trim());
      }
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
      setMessage('Cambios guardados.');
    } catch (e) {
      setError('No se pudieron guardar los cambios.');
      console.warn(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ThemedText type="subtitle">Perfil</ThemedText>

      <Card>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Datos de la cuenta
        </ThemedText>
        <Field label="Nombre" value={name} onChangeText={setName} />
        <ThemedText type="small" themeColor="textSecondary">
          {profile?.email} · {profile?.role === 'profe' ? 'Profe' : 'Alumno'}
        </ThemedText>
        {profe ? (
          <ThemedText type="small" themeColor="textSecondary">
            Tu profe: <ThemedText type="smallBold">{profe.name ?? profe.email}</ThemedText>
          </ThemedText>
        ) : null}
      </Card>

      <Card>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Tu información para la rutina
        </ThemedText>
        {edad != null ? (
          <ThemedText type="small" themeColor="textSecondary">
            Edad: {edad} años · {clientDetails?.altura_cm ?? '—'} cm · {clientDetails?.peso_kg ?? '—'} kg
          </ThemedText>
        ) : null}

        <Field
          label="Fecha de nacimiento"
          value={fechaNacimiento}
          onChangeText={setFechaNacimiento}
          placeholder="AAAA-MM-DD"
          autoCapitalize="none"
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <Field
              label="Altura (cm)"
              value={altura}
              onChangeText={setAltura}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.half}>
            <Field label="Peso (kg)" value={peso} onChangeText={setPeso} keyboardType="decimal-pad" />
          </View>
        </View>
        <Field label="Objetivo" value={objetivo} onChangeText={setObjetivo} />
        <Field
          label="Enfermedades (separadas por coma)"
          value={enfermedades}
          onChangeText={setEnfermedades}
        />
        <Field
          label="Lesiones (separadas por coma)"
          value={lesiones}
          onChangeText={setLesiones}
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

        {message ? <ThemedText themeColor="success">{message}</ThemedText> : null}
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
        <Button label="Guardar cambios" onPress={handleSave} loading={saving} />
      </Card>

      <Button variant="danger" label="Cerrar sesión" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  half: { flex: 1, minWidth: 120 },
});