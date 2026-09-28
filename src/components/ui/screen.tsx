import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useBottomContentInset } from '@/hooks/use-bottom-inset';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  scrollable?: boolean;
  padded?: boolean;
};

export function Screen({ children, style, contentStyle, scrollable = true, padded = true }: Props) {
  const theme = useTheme();
  const bottomInset = useBottomContentInset();
  const paddingHorizontal = padded ? Spacing.four : 0;

  if (!scrollable) {
    return (
      <ThemedView style={StyleSheet.flatten([styles.staticContainer, style])}>{children}</ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      // `collapsable={false}` mantiene el wrapper en la jerarquía nativa para que
      // NativeTabs pueda aplicar su ajuste automático de inset en el ScrollView.
      collapsable={false}
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingHorizontal,
            paddingTop: Spacing.four,
            paddingBottom: bottomInset,
          },
          contentStyle,
        ]}>
        <ThemedView style={StyleSheet.flatten([styles.inner, style])}>{children}</ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Agrupa tarjetas de un mismo bloque con jerarquía de título + contenido. */
export function Section({
  title,
  action,
  children,
  style,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.section, style]}>
      {title || action ? (
        <View style={styles.sectionHeader}>
          {title ? (
            <ThemedText type="eyebrow" themeColor="textSecondary">
              {title}
            </ThemedText>
          ) : (
            <View />
          )}
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contentContainer: { alignItems: 'stretch' },
  inner: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', gap: Spacing.three },
  staticContainer: { flex: 1 },
  section: { gap: Spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
