import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { gradientStyle, Gradients, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

/**
 * Header de marca: degradado azul, curva inferior y contenido alineado con el
 * padding de la pantalla. Usar dentro de un `Screen padded={false}` para que
 * el degradado llegue de borde a borde.
 */
export function HeroHeader({ eyebrow, title, subtitle, children }: Props) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.hero,
        { backgroundColor: theme.brandDeep },
        gradientStyle(Gradients.hero),
      ]}>
      <View style={styles.content}>
        {eyebrow ? (
          <ThemedText type="eyebrow" style={{ color: theme.brandBright }}>
            {eyebrow}
          </ThemedText>
        ) : null}
        <ThemedText type="display" style={{ color: theme.text }}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {subtitle}
          </ThemedText>
        ) : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.four,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
    overflow: 'hidden',
  },
  content: { gap: Spacing.two },
});
