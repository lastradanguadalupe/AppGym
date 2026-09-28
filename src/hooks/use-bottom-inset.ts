import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTabBarHeight } from '@/context/tab-bar';

/**
 * Padding inferior que hay que dejar en el contenido scrolleable para que la
 * tab bar nunca lo tape.
 *
 * - Web: la tab bar es una vista absoluta, así que sumamos su altura medida.
 * - Nativo: `NativeTabs` ya aplica el inset de la tab bar (SafeAreaView en
 *   Android, content inset automático en iOS), alcanza con el inset del
 *   dispositivo más aire de respiración.
 */
export function useBottomContentInset(extra = 0): number {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();

  return (tabBarHeight > 0 ? tabBarHeight : insets.bottom) + Spacing.four + extra;
}
