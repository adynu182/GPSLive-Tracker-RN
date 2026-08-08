import React, { useEffect, useMemo } from 'react';
import { useStore } from '../src/state';
import Toast, { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, ColorScheme, useAppTheme } from '../src/theme';

// Height of TopHeader inner row (paddingBottom 10 + content ~36 + divider ≈ 56)
const HEADER_INNER_HEIGHT = 56;

export function getToastConfig(C: ColorScheme): ToastConfig {
  return {
    info: (props) => (
      <BaseToast
        {...props}
        style={{
          backgroundColor: C.card,
          borderLeftColor: C.primary,
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: 14,
          height: undefined,
          minHeight: 48,
          paddingVertical: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 6,
        }}
        contentContainerStyle={{ paddingHorizontal: 14 }}
        text1Style={{
          fontSize: 13,
          fontWeight: '700',
          color: C.text,
        }}
        text2Style={{
          fontSize: 12,
          color: C.muted,
        }}
      />
    ),
    success: (props) => (
      <BaseToast
        {...props}
        style={{
          backgroundColor: C.card,
          borderLeftColor: '#22c55e',
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: 14,
          height: undefined,
          minHeight: 48,
          paddingVertical: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 6,
        }}
        contentContainerStyle={{ paddingHorizontal: 14 }}
        text1Style={{
          fontSize: 13,
          fontWeight: '700',
          color: C.text,
        }}
        text2Style={{
          fontSize: 12,
          color: C.muted,
        }}
      />
    ),
    error: (props) => (
      <ErrorToast
        {...props}
        style={{
          backgroundColor: C.card,
          borderLeftColor: C.badgeOffline,
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: 14,
          height: undefined,
          minHeight: 48,
          paddingVertical: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 6,
        }}
        contentContainerStyle={{ paddingHorizontal: 14 }}
        text1Style={{
          fontSize: 13,
          fontWeight: '700',
          color: C.text,
        }}
        text2Style={{
          fontSize: 12,
          color: C.muted,
        }}
      />
    ),
  };
}

export function useToastConfig(): ToastConfig {
  const scheme = useAppTheme();
  const C = Colors[scheme];
  return useMemo(() => getToastConfig(C), [C]);
}

/**
 * ToastDriver — listens to `_toastMsg` in Zustand store and shows a toast.
 * Positions the toast below the TopHeader automatically.
 */
export default function ToastDriver() {
  const msg    = useStore((s) => (s as any)._toastMsg as string | null);
  const insets = useSafeAreaInsets();

  // topOffset = safe-area top (min 16) + header row height + gap
  const topOffset = Math.max(insets.top, 16) + HEADER_INNER_HEIGHT + 8;

  useEffect(() => {
    if (!msg) return;
    Toast.show({ type: 'info', text1: msg, topOffset });
    // Clear so it doesn't re-fire
    useStore.getState().set({ _toastMsg: null } as any);
  }, [msg]);

  return null;
}

