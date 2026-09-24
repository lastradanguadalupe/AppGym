import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'danger';

type Props = PressableProps & {
  variant?: Variant;
  label: string;
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ variant = 'primary', label, loading, disabled, style, ...rest }: Props) {
  const theme = useTheme();

  const palette: Record<Variant, { bg: string; fg: string }> = {
    primary: { bg: theme.tint, fg: theme.tintText },
    secondary: { bg: theme.backgroundElement, fg: theme.text },
    outline: { bg: 'transparent', fg: theme.tint },
    danger: { bg: theme.danger, fg: theme.onDanger },
  };

  const { bg, fg } = palette[variant];
  const userStyle =
    typeof style === 'function'
      ? style({ pressed: false, hovered: false })
      : style;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg },
        variant === 'outline' && { borderColor: theme.tint, borderWidth: 1 },
        (pressed || disabled || loading) && styles.dim,
        disabled && styles.disabled,
        userStyle,
      ]}
      disabled={disabled || loading}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <ThemedText style={[styles.label, { color: fg }]}>{label}</ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  label: {
    fontSize: 16,
    fontWeight: 700,
  },
  dim: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
});