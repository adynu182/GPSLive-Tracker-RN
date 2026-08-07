import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, useAppTheme } from '../src/theme';
import { useStore } from '../src/state';
import { toggleSharing, performLogout } from '../src/session';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface Props {
  accuracyStr: string;
  accuracyLevel: 'good' | 'medium' | 'poor';
  onToggleRoute: () => void;
  onFitAll: () => void;
}

export default function Toolbar({
  accuracyStr,
  accuracyLevel,
  onToggleRoute,
  onFitAll,
}: Props) {
  const scheme = useAppTheme();
  const C = Colors[scheme];
  const appTheme = useStore((s) => s.appTheme);
  const sharingOn = useStore((s) => s.sharingOn);
  const routeMode = useStore((s) => s.routeMode);
  const offlineMode = useStore((s) => s.offlineMode);

  const showLabels = useStore((s) => s.showLabels);

  const accuracyColor = accuracyLevel === 'good' ? '#22c55e' : accuracyLevel === 'medium' ? '#f59e0b' : '#ef4444';

  const routeIconName = routeMode === 'picking' ? 'map-marker' : routeMode === 'active' ? 'close' : 'car';

  const handleToggleTheme = () => {
    useStore.getState().set({ appTheme: appTheme === 'light' ? 'dark' : 'light' });
  };

  const handleToggleLabels = () => {
    useStore.getState().set({ showLabels: !showLabels });
  };

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
            <MaterialCommunityIcons name={sharingOn ? 'access-point' : 'access-point-network-off'} size={24} color={C.text} />
          </Pressable>
        )}

        {/* Route toggle */}
        <Pressable
          style={[styles.btn, routeMode !== 'idle' && { backgroundColor: C.primary + '20' }]}
          onPress={onToggleRoute}
        >
          <MaterialCommunityIcons name={routeIconName} size={24} color={C.text} />
        </Pressable>

        {/* Fit all members */}
        <Pressable style={styles.btn} onPress={onFitAll}>
          <MaterialCommunityIcons name="eye-outline" size={24} color={C.text} />
        </Pressable>

        {/* Toggle member name labels */}
        <Pressable
          style={[styles.btn, !showLabels && { backgroundColor: C.primary + '20' }]}
          onPress={handleToggleLabels}
        >
          <MaterialCommunityIcons
            name={showLabels ? 'label-outline' : 'label-off-outline'}
            size={24}
            color={C.text}
          />
        </Pressable>

        {/* Theme toggle */}
        <Pressable style={styles.btn} onPress={handleToggleTheme}>
          <MaterialCommunityIcons name={appTheme === 'light' ? 'weather-sunny' : 'weather-night'} size={24} color={C.text} />
        </Pressable>

        {/* Logout */}
        <Pressable style={[styles.btn, styles.logoutBtn]} onPress={() => performLogout()}>
          <MaterialCommunityIcons name="logout" size={24} color={C.text} />
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
  gpsDot: { width: 8, height: 8, borderRadius: 4 },
  gpsText: { fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', flex: 1, justifyContent: 'flex-end', gap: 6 },
  btn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  btnIcon: { fontSize: 18 },
  logoutBtn: { marginLeft: 4 },
});
