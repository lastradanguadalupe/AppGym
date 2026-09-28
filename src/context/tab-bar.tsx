import { createContext, useContext } from 'react';

import type { ReactNode } from 'react';

/**
 * Altura real de la tab bar de la zona cliente en web (medida con onLayout).
 * En nativo la tab bar es del sistema y ya descuenta su propio inset, así que
 * queda en 0 y el padding se resuelve con los safe area insets.
 */
const TabBarHeightContext = createContext(0);

export function TabBarHeightProvider({
  height,
  children,
}: {
  height: number;
  children: ReactNode;
}) {
  return <TabBarHeightContext.Provider value={height}>{children}</TabBarHeightContext.Provider>;
}

export function useTabBarHeight() {
  return useContext(TabBarHeightContext);
}
