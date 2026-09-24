import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import {
  createPhrase,
  createTip,
  deletePhrase,
  deleteTip,
  fetchPhrases,
  fetchTips,
} from '@/lib/db';
import { Spacing } from '@/constants/theme';
import type { MotivationalPhrase, NutritionTip } from '@/types';

export default function AdminContenidoScreen() {
  const [phrases, setPhrases] = useState<MotivationalPhrase[]>([]);
  const [tips, setTips] = useState<NutritionTip[]>([]);
  const [loading, setLoading] = useState(true);

  const [phraseText, setPhraseText] = useState('');
  const [tipTitle, setTipTitle] = useState('');
  const [tipBody, setTipBody] = useState('');

  const load = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([fetchPhrases(), fetchTips()]);
      setPhrases(p);
      setTips(t);
    } catch (e) {
      console.warn('Error cargando contenido', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleAddPhrase() {
    if (!phraseText.trim()) return;
    try {
      await createPhrase(phraseText.trim());
      setPhraseText('');
      await load();
    } catch (e) {
      console.warn(e);
    }
  }

  async function handleAddTip() {
    if (!tipTitle.trim()) return;
    try {
      await createTip({ title: tipTitle.trim(), body: tipBody.trim() });
      setTipTitle('');
      setTipBody('');
      await load();
    } catch (e) {
      console.warn(e);
    }
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator size="large" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Frase motivadora nueva
        </ThemedText>
        <Field value={phraseText} onChangeText={setPhraseText} placeholder="Escribí una frase motivadora..." multiline />
        <Button label="Agregar frase" onPress={handleAddPhrase} />
      </Card>

      {phrases.map((p) => (
        <View key={p.id} style={styles.row}>
          <ThemedText type="small" style={styles.flex} numberOfLines={2}>
            “{p.text}”
          </ThemedText>
          <ThemedText type="small" themeColor="danger" onPress={() => deletePhrase(p.id).then(load)}>
            Borrar
          </ThemedText>
        </View>
      ))}

      <Card>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Tip de alimentación nuevo
        </ThemedText>
        <Field label="Título" value={tipTitle} onChangeText={setTipTitle} placeholder="Ej: Hidratación constante" />
        <Field label="Detalle" value={tipBody} onChangeText={setTipBody} multiline numberOfLines={3} />
        <Button label="Agregar tip" onPress={handleAddTip} />
      </Card>

      {tips.map((t) => (
        <Card key={t.id}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <ThemedText type="default">{t.title}</ThemedText>
              {t.body ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {t.body}
                </ThemedText>
              ) : null}
            </View>
            <ThemedText type="small" themeColor="danger" onPress={() => deleteTip(t.id).then(load)}>
              Borrar
            </ThemedText>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
});