import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  scrollable?: boolean;
};

export function Screen({ children, style, contentStyle, scrollable = true }: Props) {
  const theme = useTheme();
  const paddingHorizontal = Spacing.four;

  if (!scrollable) {
    return (
      <ThemedView style={StyleSheet.flatten([styles.staticContainer, style])}>{children}</ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentInset={{ bottom: BottomTabInset + Spacing.three }}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingHorizontal, paddingTop: Spacing.four },
          contentStyle,
        ]}>
        <ThemedView style={StyleSheet.flatten([styles.inner, style])}>{children}</ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contentContainer: { alignItems: 'stretch' },
  inner: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', gap: Spacing.three },
  staticContainer: { flex: 1 },
});