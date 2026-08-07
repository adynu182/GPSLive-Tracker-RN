import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useStore } from '../src/state';
import { Colors, useAppTheme } from '../src/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface Props {
  uid: string;
}

export default function MemberMarker({ uid }: Props) {
  const scheme = useAppTheme();
  const C = Colors[scheme];

  const member = useStore((s) => s.members[uid]);
  const num = useStore((s) => s.memberNumbers[uid] ?? 1);
  const navMode = useStore((s) => s.navMode);
  const myId = useStore((s) => s.myId);
  const showLabels = useStore((s) => s.showLabels);

  if (!member) return null;

  const isMe = uid === myId;
  const showArrow = isMe && navMode;

  if (showArrow) {
    // Arrow marker for nav mode (self)
    return (
      <View style={[styles.arrowWrap, {
        shadowColor: '#68d04bff', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
      }]}>
        <MaterialCommunityIcons name="navigation" size={40} color='#b00a0aff' />
      </View>
    );
  }

  const isOnline = member.sharing && member.lat != null;
  const markerColor = isOnline ? member.color : '#9ca3af';

  return (
    <View style={styles.wrap}>
      {/* Emoji bubble */}
      <View style={[styles.bubble, { backgroundColor: markerColor, borderColor: markerColor }]}>
        <Text style={[styles.emoji, !isOnline && styles.emojiOffline]}>{member.emoji}</Text>
      </View>
      {/* Number badge */}
      <View style={[styles.badge, { backgroundColor: markerColor }]}>
        <Text style={styles.badgeText}>{num}</Text>
      </View>
      {/* Callout label */}
      {showLabels && (
        <View style={[styles.label, { backgroundColor: C.card }]}>
          <Text style={[styles.labelText, { color: isOnline ? C.text : C.muted }]} numberOfLines={1}>
            {member.name}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  bubble: {
    width: 30, height: 30, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  emoji: { fontSize: 20 },
  emojiOffline: { opacity: 0.55 },
  badge: {
    position: 'absolute', top: -4, right: -4,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  label: {
    marginTop: 3, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12, shadowRadius: 2, elevation: 2,
  },
  labelText: { fontSize: 11, fontWeight: '700' },
  arrowWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent', borderWidth: 0,
  },
  arrowIcon: { fontSize: 22, color: '#247066' },
});
