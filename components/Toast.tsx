import React, { useEffect, useMemo, useRef } from 'react';
import { useStore } from '../src/state';
import Toast, { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import { Colors, ColorScheme, useAppTheme } from '../src/theme';

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
 * ToastDriver — mengonsumsi `toastQueue` di Zustand store satu per satu.
 * Setiap toast ditampilkan sampai selesai (lewat callback `onHide`) baru
 * toast berikutnya di antrian ditampilkan — supaya kalau ada beberapa
 * notifikasi datang hampir bersamaan (mis. 2 member keluar sekaligus),
 * semuanya tetap sempat terlihat berurutan, bukan cuma yang terakhir.
 *
 * Posisi vertikal (`toastTopOffset`) sengaja diambil dari store, bukan
 * dihitung di sini — karena tiap layar (Join, Tracker) punya layout
 * header yang beda, dan layar itu sendiri yang paling tahu offset yang
 * pas untuk dirinya (lihat efek di app/index.tsx & app/tracker.tsx).
 */
export default function ToastDriver() {
  const queue      = useStore((s) => s.toastQueue);
  const topOffset  = useStore((s) => s.toastTopOffset);
  const showing    = useRef(false);

  useEffect(() => {
    if (showing.current || queue.length === 0) return;
    showing.current = true;

    Toast.show({
      type: queue[0].type ?? 'info',
      text1: queue[0].text,
      topOffset,
      onHide: () => {
        showing.current = false;
        // Buang pesan yang baru selesai ditampilkan dari depan antrian.
        // Ini men-trigger effect ini lagi (queue berubah) untuk lanjut ke
        // pesan berikutnya, kalau masih ada.
        useStore.getState().set({ toastQueue: useStore.getState().toastQueue.slice(1) });
      },
    });
  }, [queue, topOffset]);

  return null;
}

