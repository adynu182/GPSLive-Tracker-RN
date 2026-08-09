import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Colors, useAppTheme } from '../src/theme';
import { useStore } from '../src/state';

interface Props {
  onFocusMember: (uid: string) => void;
}

export default function MembersList({ onFocusMember }: Props) {
  const scheme = useAppTheme();
  const C = Colors[scheme];

  const members = useStore((s) => s.members);
  const memberNumbers = useStore((s) => s.memberNumbers);
  const myId = useStore((s) => s.myId);
  const followedUid = useStore((s) => s.followedUid);
  const collapsed = useStore((s) => s.membersCollapsed);

  const entries = Object.entries(members);

  return (
    <View style={[styles.container, { backgroundColor: C.toolbarBg, borderColor: C.border }]}>
      {/* Header — ketuk untuk collapse/expand daftar member */}
      <Pressable
        style={styles.header}
        onPress={() => useStore.getState().set({ membersCollapsed: !collapsed })}
      >
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: C.text }]}>Anggota</Text>
          <View style={[styles.countBadge, { backgroundColor: C.primary }]}>
            <Text style={styles.countText}>{entries.length}</Text>
          </View>
        </View>
        <Text style={[styles.collapseIcon, { color: C.muted }]}>{collapsed ? '▼' : '▲'}</Text>
      </Pressable>

      {/* Horizontal Pill List */}
      {!collapsed && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {entries.map(([uid, m]) => {
            const online = m.sharing && m.lat != null;
            const isFollowing = uid === followedUid;
            const isMe = uid === myId;
            const num = memberNumbers[uid] ?? '?';

            return (
              <Pressable
                key={uid}
                style={[
                  styles.pillCard,
                  {
                    backgroundColor: isFollowing ? m.color + '33' : m.color + '14',
                    borderColor: isFollowing ? m.color : C.border,
                  },
                ]}
                onPress={() => onFocusMember(uid)}
              >
                {/* Avatar */}
                <View style={styles.avatarWrap}>
                  <View style={[styles.avatar, { backgroundColor: m.color, opacity: !online ? 0.5 : 1 }]}>
                    <Text style={styles.avatarNum}>{num}</Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: online ? '#22c55e' : '#9ca3af' }]} />
                </View>

                {/* Emoji & Name */}
                <Text style={[styles.pillName, { color: isFollowing ? m.color : C.text }]} numberOfLines={1}>
                  {m.emoji} {m.name}{isMe ? ' (Me)' : ''}{isFollowing ? ' 🎯' : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontWeight: '700', fontSize: 13 },
  countBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  countText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  collapseIcon: { fontSize: 11, fontWeight: '700' },

  horizontalList: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  pillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1.5,
    gap: 7,
  },

  avatarWrap: { position: 'relative' },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarNum: { color: '#fff', fontSize: 11, fontWeight: '800' },
  statusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  pillName: {
    fontSize: 13,
    fontWeight: '700',
  },
});
