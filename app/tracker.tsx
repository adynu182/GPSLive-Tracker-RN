import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Colors, useAppTheme } from '../src/theme';
import { useStore } from '../src/state';
import { startGPS, stopGPS, handleGPSPosition } from '../src/gps';
import { maybeRecalculateRoute, performLogout } from '../src/session';

import AppMapView from '../components/MapView';
import BottomBar from '../components/BottomBar';
import Toolbar from '../components/Toolbar';
import MapControls from '../components/MapControls';
import ConnectionBadge from '../components/ConnectionBadge';
import FollowIndicator from '../components/FollowIndicator';
import ToastDriver from '../components/Toast';
import TopHeader from '../components/TopHeader';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TrackerScreen() {
  const router = useRouter();
  const scheme = useAppTheme();
  const C = Colors[scheme];
  const insets = useSafeAreaInsets();

  const isSessionActive = useStore((s) => s.isSessionActive);
  const followedUid = useStore((s) => s.followedUid);
  const members = useStore((s) => s.members);
  const routeMode = useStore((s) => s.routeMode);

  const [accuracyStr, setAccuracyStr] = useState('–');
  const [accuracyLevel, setAccuracyLevel] = useState<'good' | 'medium' | 'poor'>('poor');

  const bottomPadding = Math.max(insets.bottom, 12);

  // Redirect to join if no active session
  useEffect(() => {
    if (!isSessionActive) {
      router.replace('/');
    }
  }, [isSessionActive]);

  // Toast di layar ini diposisikan di bawah TopHeader (chip room + panel
  // member), bukan mepet paling atas. Root <Toast> tunggal ada di
  // app/_layout.tsx dan membaca offset ini dari store — lihat komentar
  // di sana untuk alasan kenapa cuma ada satu instance Toast global.
  useEffect(() => {
    const HEADER_INNER_HEIGHT = 56; // tinggi baris TopHeader (padding + konten + divider)
    useStore.getState().set({ toastTopOffset: Math.max(insets.top, 16) + HEADER_INNER_HEIGHT + 8 });
    return () => {
      // Kembalikan ke default umum saat layar ini di-unmount (mis. logout),
      // supaya toast berikutnya di layar lain tidak memakai offset milik
      // TopHeader yang sudah tidak ada.
      useStore.getState().set({ toastTopOffset: Math.max(insets.top, 16) + 8 });
    };
  }, [insets.top]);

  // Start GPS when screen mounts
  useEffect(() => {
    const onPosition = (
      lat: number, lng: number,
      accuracy: number,
      heading: number | null,
      speed: number | null,
    ) => {
      const result = handleGPSPosition(lat, lng, accuracy, heading, speed);
      setAccuracyStr(result.accuracyStr);
      setAccuracyLevel(result.accuracyLevel);
      maybeRecalculateRoute();
    };

    startGPS(onPosition);
    return () => stopGPS();
  }, []);

  // ── Focus / follow a member ──────────────────────────────────
  const handleFocusMember = useCallback((uid: string) => {
    const m = members[uid];
    if (!m || m.lat == null) {
      return;
    }

    if (followedUid === uid) {
      useStore.getState().set({ followedUid: null });
      return;
    }

    useStore.getState().set({ followedUid: uid, isFollowFlying: true });
  }, [members, followedUid]);

  const handleCancelFollow = useCallback(() => {
    useStore.getState().set({ followedUid: null });
  }, []);

  const handleMapDrag = useCallback(() => {
    if (followedUid) {
      useStore.getState().set({ followedUid: null });
    }
  }, [followedUid]);


  const handleToggleRoute = useCallback(() => {
    if (routeMode === 'idle') {
      const { myLat } = useStore.getState();
      if (myLat == null) {
        return;
      }
      useStore.getState().set({ routeMode: 'picking' });
    } else if (routeMode === 'picking') {
      useStore.getState().set({ routeMode: 'idle' });
    } else {
      useStore.getState().set({
        routeMode: 'idle', routeDest: null,
        routeInfo: null, routeLastCalc: null,
        routeGeometry: null,
      } as any);
    }
  }, [routeMode]);

  const handleFitAll = useCallback(() => {
    const count = useStore.getState().fitAllCounter || 0;
    useStore.getState().set({ fitAllCounter: count + 1 });
  }, []);

  const handleLogout = useCallback(async () => {
    Alert.alert('Keluar', 'Yakin ingin keluar dari sesi ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar', style: 'destructive',
        onPress: async () => {
          await performLogout();
          router.replace('/');
        },
      },
    ]);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      {/* Toast driver (mengonsumsi toastQueue dari state) */}
      <ToastDriver />

      {/* Map */}
      <AppMapView onMapDrag={handleMapDrag} />

      {/* Top header: room code chip + member list panel */}
      <TopHeader onFocusMember={handleFocusMember} />

      {/* Offline badge fallback (shown when not connected, inside TopHeader too) */}
      <ConnectionBadge />

      {/* Single unit Zoom & Compass controls (bottom-left) */}
      <View style={[styles.bottomLeftControls, { bottom: 120 + insets.bottom }]}>
        <MapControls />
      </View>

      {/* Route mode hint */}
      {routeMode === 'picking' && (
        <View style={[styles.pickingHint, { backgroundColor: C.primary, bottom: 160 + insets.bottom }]}>
          <Text style={styles.pickingText}>📍 Ketuk peta untuk pilih tujuan</Text>
        </View>
      )}

      {/* Follow indicator */}
      <FollowIndicator onCancel={handleCancelFollow} />

      {/* Bottom UI */}
      <View style={[styles.bottomSheet, { backgroundColor: C.toolbarBg, paddingBottom: bottomPadding }]}>
        <BottomBar onFocusMember={handleFocusMember} />
        <Toolbar
          accuracyStr={accuracyStr}
          accuracyLevel={accuracyLevel}
          onToggleRoute={handleToggleRoute}
          onFitAll={handleFitAll}
          onLogout={handleLogout}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  bottomLeftControls: {
    position: 'absolute', left: 14,
    zIndex: 15,
  },

  pickingHint: {
    position: 'absolute', alignSelf: 'center',
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10,
    zIndex: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 5,
  },
  pickingText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
    overflow: 'hidden',
  },
});
