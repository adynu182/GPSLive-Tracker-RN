import { Appearance, useColorScheme } from 'react-native';

// ─── Map style URLs (same as PWA) ─────────────────────────────────
export const MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark:  'https://tiles.openfreemap.org/styles/liberty', // same URL; OpenFreeMap handles dark via params
} as const;

export type ThemeMode = 'light' | 'dark';

// ─── Get current system theme ────────────────────────────────────
export function getCurrentTheme(): ThemeMode {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

// ─── Get current map style URL ───────────────────────────────────
export function getCurrentMapStyleUrl(): string {
  return MAP_STYLES[getCurrentTheme()];
}

// ─── Color palette ───────────────────────────────────────────────
export const Colors = {
  light: {
    background:   '#e5e6e8',
    card:         '#ffffff',
    text:         '#1a2524',
    muted:        '#6b7a7c',
    primary:      '#247066',
    border:       '#d1d5db',
    toolbarBg:    'rgba(255,255,255,0.92)',
    overlay:      'rgba(0,0,0,0.45)',
    toastBg:      '#1a2524',
    toastText:    '#e5e6e8',
    badgeOffline: '#ef4444',
  },
  dark: {
    background:   '#111a1a',
    card:         '#1e2c2c',
    text:         '#e5e6e8',
    muted:        '#8fa6a4',
    primary:      '#2b9a9d',
    border:       '#2e4040',
    toolbarBg:    'rgba(18,28,28,0.94)',
    overlay:      'rgba(0,0,0,0.7)',
    toastBg:      '#e5e6e8',
    toastText:    '#1a2524',
    badgeOffline: '#f87171',
  },
} as const;

export type ColorScheme = typeof Colors.light;
