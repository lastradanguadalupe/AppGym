import '@/global.css';

import { Platform } from 'react-native';

/**
 * Marca AppGym — modo oscuro.
 * Rampa de superficies: `background` (noche) < `backgroundElement` (profundo) <
 * `brandSurface` (azul de marca). El texto es blanco o celeste; el azul
 * eléctrico se reserva para acciones y el teal para progreso y estados positivos.
 * Reparto aproximado: 70 % azul noche, 20 % azul eléctrico, 10 % teal.
 */
const dark = {
  // Marca
  brand: '#2D8CFF',
  brandBright: '#6BA8FF',
  brandDeep: '#0D2B50',
  brandSurface: '#102C55',
  brandSurfaceAlt: '#173A6B',

  // Semánticos
  text: '#FFFFFF',
  textSecondary: '#A9BED8',
  muted: '#8098B8',
  background: '#07172E',
  backgroundElement: '#0D2B50',
  backgroundSelected: '#143459',
  border: '#1C3E6B',
  borderStrong: 'rgba(45, 140, 255, 0.55)',
  tint: '#2D8CFF',
  tintText: '#07172E',
  teal: '#16CDBA',
  success: '#16CDBA',
  onSuccess: '#04231F',
  danger: '#FF5A6E',
  onDanger: '#2A0510',
  warning: '#FFB547',
  overlay: 'rgba(3, 10, 22, 0.72)',
} as const;

/** La app es de tema oscuro único: `light` es un alias para que `ThemeColor` siga siendo válido. */
const light = dark;

export const Colors = {
  light,
  dark: light,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  md: 12,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Color de las sombras: en fondo oscuro la profundidad la dan la sombra y el borde fino. */
export const ShadowColor = '#020A16';

/** Sombras discretas: en fondo oscuro la profundidad la dan la sombra y el borde fino. */
export const Shadows = {
  card: Platform.select({
    ios: {
      shadowColor: ShadowColor,
      shadowOpacity: 0.45,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 3 },
    default: {
      boxShadow: '0 10px 28px rgba(2, 10, 22, 0.55)',
    },
  }),
  raised: Platform.select({
    ios: {
      shadowColor: ShadowColor,
      shadowOpacity: 0.6,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 14 },
    },
    android: { elevation: 8 },
    default: {
      boxShadow: '0 14px 36px rgba(2, 10, 22, 0.65)',
    },
  }),
} as const;

/** Degradados de marca. `experimental_backgroundImage` requiere RN 0.76+. */
export const Gradients = {
  hero: 'linear-gradient(155deg, #0A2A54 0%, #0E3C78 50%, #14529E 100%)',
  accent: 'linear-gradient(135deg, #2D8CFF 0%, #1D6FE0 100%)',
  deep: 'linear-gradient(160deg, #05122A 0%, #0D2B50 100%)',
} as const;

/**
 * Aplica un degradado de `Gradients` como estilo de View/Pressable.
 * En native va como `experimental_backgroundImage`; en web react-native-web
 * solo entiende `backgroundImage`, así que el alias experimental se pierde y
 * el View queda transparente. Usar SIEMPRE junto a un `backgroundColor` sólido
 * de respaldo para que el contenido claro nunca quede ilegible.
 */
export function gradientStyle(gradient: string) {
  return Platform.OS === 'web'
    ? { backgroundImage: gradient }
    : { experimental_backgroundImage: gradient };
}

export const MaxContentWidth = 800;
