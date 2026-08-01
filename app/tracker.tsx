import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  useColorScheme, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';

import MapboxGL from '@rnmapbox/maps';

import { Colors } from '../src/theme';
import { useStore } from '../src/state';
import { startGPS, stopGPS, handleGPSPosition } from '../src/gps';
import { maybeRecalculateRoute, performLogout } from '../src/session';

import AppMapView from '../components/MapView';
import MembersList from '../components/MembersList';
import BottomBar from '../components/BottomBar';
import Toolbar from '../components/Toolbar';
import ConnectionBadge from '../components/ConnectionBadge';
import FollowIndicator from '../components/FollowIndicator';
import ToastDriver from '../components/Toast';
import Toast from 'react-native-toast-message';

// Set Mapbox token (public, needed by @rnmapbox/maps even for non-Mapbox styles)
MapboxGL.setAccessToken('');

export default function TrackerScreen() {
  const router  = useRouter();
  const scheme  = useColorScheme() === 'dark' ? 'dark' : 'light';
  const C       = Colors[scheme];

  const isSessionActive = useStore((s) => s.isSessionActive);
  const roomId          = useStore((s) => s.roomId);
  const offlineMode     = useStore((s) => s.offlineMode);
  const followedUid     = useStore((s) => s.followedUid);
  const members         = useStore((s) => s.members);
  const navMode         = useStore((s) => s.navMode);
  const routeMode       = useStore((s) => s.routeMode);

  const [accuracyStr,   setAccuracyStr]   = useState('–');
  const [accuracyLevel, setAccuracyLevel] = useState<'good' | 'medium' | 'poor'>('poor');
  const [sidebarOpen,   setSidebarOpen]   = useState(false);

  // Redirect to join if no active session
  useEffect(() => {
    if (!isSessionActive) {
      router.replace('/');
    }
  }, [isSessionActive]);

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
      Toast.show({ type: 'info', text1: '📍 Lokasi belum tersedia' });
      return;
    }

    if (followedUid === uid) {
      useStore.getState().set({ followedUid: null });
      Toast.show({ type: 'info', text1: '📍 Mode ikuti dinonaktifkan' });
      return;
    }

    useStore.getState().set({ followedUid: uid, isFollowFlying: true });
    Toast.show({ type: 'info', text1: `📍 Mengikuti ${m.name}` });
  }, [members, followedUid]);

  const handleCancelFollow = useCallback(() => {
    useStore.getState().set({ followedUid: null });
    Toast.show({ type: 'info', text1: '🗺️ Mode ikuti dibatalkan' });
  }, []);

  const handleMapDrag = useCallback(() => {
    if (followedUid) {
      useStore.getState().set({ followedUid: null });
      Toast.show({ type: 'info', text1: '🗺️ Mode ikuti dibatalkan' });
    }
  }, [followedUid]);

  const handleToggleNavMode = useCallback(() => {
    useStore.getState().set({ navMode: !navMode });
  }, [navMode]);

  const handleToggleRoute = useCallback(() => {
    if (routeMode === 'idle') {
      const { myLat } = useStore.getState();
      if (myLat == null) {
        Toast.show({ type: 'info', text1: '⚠️ Tunggu GPS kamu terdeteksi dulu' });
        return;
      }
      useStore.getState().set({ routeMode: 'picking' });
      Toast.show({ type: 'info', text1: '📍 Ketuk peta untuk pilih tujuan' });
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
    // Trigger a "fit all members" — implemented via camera in MapView
    // We'll just set a state flag the MapView can react to
    Toast.show({ type: 'info', text1: '👁 Menyesuaikan tampilan...' });
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
      {/* Toast driver (reads _toastMsg from state) */}
      <ToastDriver />

      {/* Map */}
      <AppMapView onMapDrag={handleMapDrag} />

      {/* Offline badge */}
      <ConnectionBadge />

      {/* Room code pill */}
      <View style={styles.topLeft}>
        {roomId && !offlineMode ? (
          <Pressable
            style={[styles.roomPill, { backgroundColor: C.toolbarBg, borderColor: C.border }]}
            onPress={() => setSidebarOpen((v) => !v)}
          >
            <Text style={[styles.roomCode, { color: C.primary }]}>{roomId}</Text>
            <Text style={[styles.roomLabel, { color: C.muted }]}>👥</Text>
          </Pressable>
        ) : offlineMode ? (
          <View style={[styles.roomPill, { backgroundColor: C.toolbarBg, borderColor: C.border }]}>
            <Text style={[styles.roomCode, { color: C.muted }]}>Offline Nav</Text>
          </View>
        ) : null}
      </View>

      {/* Route mode hint */}
      {routeMode === 'picking' && (
        <View style={[styles.pickingHint, { backgroundColor: C.primary }]}>
          <Text style={styles.pickingText}>📍 Ketuk peta untuk pilih tujuan</Text>
        </View>
      )}

      {/* Follow indicator */}
      <FollowIndicator onCancel={handleCancelFollow} />

      {/* Sidebar: members list */}
      {sidebarOpen && (
        <View style={styles.sidebar}>
          <MembersList onFocusMember={handleFocusMember} />
        </View>
      )}

      {/* Bottom UI */}
      <View style={[styles.bottomSheet, { backgroundColor: C.toolbarBg }]}>
        <BottomBar onFocusMember={handleFocusMember} />
        <Toolbar
          accuracyStr={accuracyStr}
          accuracyLevel={accuracyLevel}
          onToggleNavMode={handleToggleNavMode}
          onToggleRoute={handleToggleRoute}
          onFitAll={handleFitAll}
        />
      </View>

      {/* Global toast renderer */}
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },

  topLeft: {
    position: 'absolute', top: 52, left: 12,
    zIndex: 10,
  },
  roomPill: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 8,
    gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  roomCode:  { fontWeight: '900', fontSize: 15, letterSpacing: 2 },
  roomLabel: { fontSize: 16 },

  pickingHint: {
    position: 'absolute', bottom: 160, alignSelf: 'center',
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10,
    zIndex: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 5,
  },
  pickingText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  sidebar: {
    position: 'absolute', top: 100, right: 12,
    width: 220, zIndex: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 8,
  },

  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
    overflow: 'hidden',
  },
});
