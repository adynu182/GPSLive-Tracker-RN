import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, useAppTheme } from '../src/theme';
import { useStore } from '../src/state';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  onCancel: () => void;
}

export default function FollowIndicator({ onCancel }: Props) {
  const scheme = useAppTheme();
  const C = Colors[scheme];
  const insets = useSafeAreaInsets();
  const followedUid = useStore((s) => s.followedUid);
  const members = useStore((s) => s.members);

  const topOffset = Math.max(insets.top, 16);

  if (!followedUid || !members[followedUid]) return null;
  const m = members[followedUid];

  return (
    <View style={[styles.wrap, { top: topOffset + 60, backgroundColor: C.primary + 'EE', shadowColor: C.primary }]}>
      <Text style={styles.text}>
        {m.emoji} Mengikuti {m.name}
      </Text>
      <Pressable onPress={onCancel} style={styles.cancelBtn}>
        <Text style={styles.cancelText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', top: 56, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 6, gap: 10,
  },
  text: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
