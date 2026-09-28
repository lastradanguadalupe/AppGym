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
import { gradientStyle, Gradients, Spacing, Radius, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Experiencia, Profile } from '@/types';

const EXPERIENCIAS: { value: Experiencia; label: string }[] = [
  { value: 'inicio', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
];

export default function PerfilScreen() {
  const theme = useTheme();
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
  const initials =
    (profile?.name ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?';

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
      <View style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: theme.brand }, gradientStyle(Gradients.accent)]}>
          <ThemedText type="subtitle" themeColor="tintText">
            {initials}
          </ThemedText>
        </View>
        <View style={styles.identityText}>
          <ThemedText type="display" style={styles.identityName}>
            {profile?.name ?? 'Tu perfil'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {profile?.role === 'profe' ? 'Profe' : 'Alumno'}
            {profile?.email ? ` · ${profile.email}` : ''}
          </ThemedText>
        </View>
      </View>

      <Card>
        <ThemedText type="eyebrow" themeColor="textSecondary">
          Datos de la cuenta
        </ThemedText>
        <Field label="Nombre" value={name} onChangeText={setName} />
        {profe ? (
          <ThemedText type="small" themeColor="textSecondary">
            Tu profe: <ThemedText type="smallBold">{profe.name ?? profe.email}</ThemedText>
          </ThemedText>
        ) : null}
      </Card>

      <Card>
        <ThemedText type="eyebrow" themeColor="textSecondary">
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

        <View style={styles.group}>
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
        </View>

        {message ? <ThemedText themeColor="success">{message}</ThemedText> : null}
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
        <Button label="Guardar cambios" icon="content-save-outline" onPress={handleSave} loading={saving} />
      </Card>

      <Button variant="danger" label="Cerrar sesión" icon="logout" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  identityText: { flex: 1, gap: Spacing.one },
  identityName: { fontSize: 26, lineHeight: 32 },
  group: { gap: Spacing.md, paddingTop: Spacing.one },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  half: { flex: 1, minWidth: 120 },
});