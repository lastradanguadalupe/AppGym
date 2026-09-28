import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  children: ReactNode;
  padded?: boolean;
  style?: object;
  tone?: 'surface' | 'brand' | 'flat';
};

export function Card({ children, padded = true, style, tone = 'surface' }: Props) {
  const theme = useTheme();

  return (
    <View
      style={StyleSheet.flatten([
        styles.card,
        tone === 'surface' && [styles.elevated, { backgroundColor: theme.backgroundElement }],
        tone === 'brand' && { backgroundColor: theme.brandSurface },
        tone === 'flat' && { backgroundColor: theme.background },
        { borderColor: theme.border, borderWidth: StyleSheet.hairlineWidth },
        padded && styles.padded,
        style,
      ])}>
      {children}
    </View>
  );
}

/** Tarjeta de estadística: ícono + número grande + rótulo. */
export function StatCard({
  icon,
  value,
  label,
  tint,
}: {
  icon: IconName;
  value: string;
  label: string;
  tint?: string;
}) {
  const theme = useTheme();
  const color = tint ?? theme.brandBright;

  return (
    <Card style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: `${color}1F`, borderColor: `${color}33` }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <ThemedText type="title" style={styles.statValue}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Card>
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
        { borderColor: theme.border },
        style,
      ])}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    gap: Spacing.md,
  },
  elevated: {
    ...Shadows.card,
  },
  padded: { padding: Spacing.three },
  stat: { flex: 1, gap: Spacing.two, alignItems: 'flex-start' },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { lineHeight: 34 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

export type { ViewStyle };
