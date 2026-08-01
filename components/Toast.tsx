import React, { useEffect, useRef } from 'react';
import { useStore } from '../src/state';
import Toast from 'react-native-toast-message';

/**
 * ToastDriver — listens to `_toastMsg` in Zustand store and shows a toast.
 * Does not render any visible UI itself.
 */
export default function ToastDriver() {
  const msg = useStore((s) => (s as any)._toastMsg as string | null);

  useEffect(() => {
    if (!msg) return;
    Toast.show({ type: 'info', text1: msg });
    // Clear the message from state so it doesn't re-fire
    useStore.getState().set({ _toastMsg: null } as any);
  }, [msg]);

  return null;
}
