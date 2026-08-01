import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useColorScheme } from 'react-native';
import { Colors } from '../src/theme';
import { useStore } from '../src/state';
import { toggleSharing, performLogout } from '../src/session';
import { shareRoomCode } from '../src/room';

interface Props {
  accuracyStr: string;
  accuracyLevel: 'good' | 'medium' | 'poor';
  onToggleNavMode: () => void;
  onToggleRoute: () => void;
  onFitAll: () => void;
}

export default function Toolbar({
  accuracyStr,
  accuracyLevel,
  onToggleNavMode,
  onToggleRoute,
  onFitAll,
}: Props) {
  const scheme     = useColorScheme() === 'dark' ? 'dark' : 'light';
  const C          = Colors[scheme];
  const sharingOn  = useStore((s) => s.sharingOn);
  const navMode    = useStore((s) => s.navMode);
  const routeMode  = useStore((s) => s.routeMode);
  const offlineMode = useStore((s) => s.offlineMode);

  const accuracyColor = accuracyLevel === 'good' ? '#22c55e' : accuracyLevel === 'medium' ? '#f59e0b' : '#ef4444';

  const routeIcon = routeMode === 'picking' ? '📍' : routeMode === 'active' ? '✕' : '🚗';

  return (
    <View style={[styles.bar, { backgroundColor: C.toolbarBg, borderTopColor: C.border }]}>
      {/* GPS accuracy badge */}
      <View style={[styles.gpsBadge, { borderColor: accuracyColor }]}>
        <View style={[styles.gpsDot, { backgroundColor: accuracyColor }]} />
        <Text style={[styles.gpsText, { color: C.text }]}>{accuracyStr}</Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>

        {/* Sharing toggle */}
        {!offlineMode && (
          <Pressable
            style={[styles.btn, sharingOn && { backgroundColor: C.primary + '20' }]}
            onPress={() => toggleSharing()}
          >
            <Text style={styles.btnIcon}>{sharingOn ? '📡' : '🔇'}</Text>
          </Pressable>
        )}

        {/* Route toggle */}
        <Pressable
          style={[styles.btn, routeMode !== 'idle' && { backgroundColor: C.primary + '20' }]}
          onPress={onToggleRoute}
        >
          <Text style={styles.btnIcon}>{routeIcon}</Text>
        </Pressable>

        {/* Fit all members */}
        <Pressable style={styles.btn} onPress={onFitAll}>
          <Text style={styles.btnIcon}>👁</Text>
        </Pressable>

        {/* Nav mode toggle */}
        <Pressable
          style={[styles.btn, navMode && { backgroundColor: C.primary + '20' }]}
          onPress={onToggleNavMode}
        >
          <Text style={styles.btnIcon}>{navMode ? '🧭' : '⬆'}</Text>
        </Pressable>

        {/* Share room code */}
        {!offlineMode && (
          <Pressable style={styles.btn} onPress={() => shareRoomCode()}>
            <Text style={styles.btnIcon}>📤</Text>
          </Pressable>
        )}

        {/* Logout */}
        <Pressable style={[styles.btn, styles.logoutBtn]} onPress={() => performLogout()}>
          <Text style={styles.btnIcon}>🚪</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, gap: 10,
  },
  gpsBadge: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, borderWidth: 1.5,
    paddingHorizontal: 10, paddingVertical: 5,
    gap: 5,
  },
  gpsDot:   { width: 8, height: 8, borderRadius: 4 },
  gpsText:  { fontSize: 12, fontWeight: '700' },
  actions:  { flexDirection: 'row', flex: 1, justifyContent: 'flex-end', gap: 6 },
  btn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  btnIcon:    { fontSize: 18 },
  logoutBtn:  { marginLeft: 4 },
});
