import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  children: ReactNode;
  padded?: boolean;
  style?: object;
};

export function Card({ children, padded = true, style }: Props) {
  return (
    <ThemedView type="backgroundElement" style={StyleSheet.flatten([styles.card, padded && styles.padded, style])}>
      {children}
    </ThemedView>
  );
}

export function Row({
  children,
  between,
  style,
}: {
  children: ReactNode;
  between?: boolean;
  style?: object;
}) {
  const theme = useTheme();
  return (
    <View
      style={StyleSheet.flatten([
        styles.row,
        between && { justifyContent: 'space-between' },
        { borderColor: theme.backgroundSelected },
        style,
      ])}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
  },
  padded: { padding: Spacing.four },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});