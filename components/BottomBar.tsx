import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useColorScheme } from 'react-native';
import { Colors } from '../src/theme';
import { useStore } from '../src/state';
import { haversine, fmtDist, fmtDuration } from '../src/constants';

interface Props {
  onFocusMember: (uid: string) => void;
}

export default function BottomBar({ onFocusMember }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const C = Colors[scheme];

  const members   = useStore((s) => s.members);
  const myId      = useStore((s) => s.myId);
  const myLat     = useStore((s) => s.myLat);
  const myLng     = useStore((s) => s.myLng);
  const routeMode = useStore((s) => s.routeMode);
  const routeInfo = useStore((s) => s.routeInfo);

  // If route active, show route info chip instead
  if (routeMode === 'active' && routeInfo) {
    return (
      <View style={[styles.bar, { backgroundColor: C.toolbarBg, borderTopColor: C.border }]}>
        <View style={[styles.chip, { backgroundColor: C.primary + '20', borderColor: C.primary }]}>
          <Text style={[styles.chipLabel, { color: C.text }]}>🚗 Menuju tujuan</Text>
          <Text style={[styles.chipValue, { color: C.primary }]}>
            {fmtDist(routeInfo.distance)} · {fmtDuration(routeInfo.duration)}
          </Text>
        </View>
      </View>
    );
  }

  if (myLat == null) return null;

  const others = Object.entries(members).filter(
    ([uid, m]) => uid !== myId && m.lat != null && m.sharing !== false,
  );

  if (!others.length) {
    return (
      <View style={[styles.bar, { backgroundColor: C.toolbarBg, borderTopColor: C.border }]}>
        <Text style={[styles.empty, { color: C.muted }]}>Belum ada anggota lain di peta...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.bar, { backgroundColor: C.toolbarBg, borderTopColor: C.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {others.map(([uid, m]) => {
          const dist = haversine(myLat!, myLng!, m.lat!, m.lng!);
          return (
            <Pressable
              key={uid}
              style={[styles.chip, { borderColor: C.border }]}
              onPress={() => onFocusMember(uid)}
            >
              <View style={[styles.dot, { backgroundColor: m.color }]} />
              <Text style={[styles.chipLabel, { color: C.text }]}>
                {m.emoji} {m.name}
              </Text>
              <Text style={[styles.chipValue, { color: C.primary }]}>
                {fmtDist(dist)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 52,
    justifyContent: 'center',
  },
  scroll:    { alignItems: 'center', gap: 8 },
  empty:     { fontSize: 13, textAlign: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 7,
    gap: 6,
  },
  dot:       { width: 8, height: 8, borderRadius: 4 },
  chipLabel: { fontSize: 13, fontWeight: '600' },
  chipValue: { fontSize: 13, fontWeight: '800' },
});
