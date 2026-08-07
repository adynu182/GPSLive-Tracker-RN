import React, { useEffect } from 'react';
import { useStore } from '../src/state';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Height of TopHeader inner row (paddingBottom 10 + content ~36 + divider ≈ 56)
const HEADER_INNER_HEIGHT = 56;

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
