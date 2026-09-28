import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { Radius } from '@/constants/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  icon: IconName;
  label: string;
  color: string;
  background?: string;
  onPress: () => void;
};

export function IconAction({ icon, label, color, background = 'transparent', onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.base, { backgroundColor: background }, pressed && styles.pressed]}>
      <MaterialCommunityIcons name={icon} size={18} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.5 },
});
