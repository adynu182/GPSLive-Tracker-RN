import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, useAppTheme } from '../src/theme';
import { useStore } from '../src/state';

export default function ConnectionBadge() {
  const scheme = useAppTheme();
  const C         = Colors[scheme];
  const connected = useStore((s) => s.connected);

  if (connected) return null;

  return (
    <View style={[styles.badge, { backgroundColor: C.badgeOffline }]}>
      <Text style={styles.text}>📡 Offline — mencoba sambung kembali…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingVertical: 6, paddingHorizontal: 14,
    alignItems: 'center',
    zIndex: 100,
  },
  text: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
