import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useColorScheme } from 'react-native';
import { Colors } from '../src/theme';
import { useStore } from '../src/state';

interface Props {
  onFocusMember: (uid: string) => void;
}

export default function MembersList({ onFocusMember }: Props) {
  const scheme  = useColorScheme() === 'dark' ? 'dark' : 'light';
  const C       = Colors[scheme];

  const members       = useStore((s) => s.members);
  const memberNumbers = useStore((s) => s.memberNumbers);
  const myId          = useStore((s) => s.myId);
  const followedUid   = useStore((s) => s.followedUid);
  const collapsed     = useStore((s) => s.membersCollapsed);

  const entries = Object.entries(members);

  return (
    <View style={[styles.container, { backgroundColor: C.toolbarBg, borderColor: C.border }]}>
      {/* Header */}
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
        <Text style={{ color: C.muted, fontSize: 14 }}>{collapsed ? '▼' : '▲'}</Text>
      </Pressable>

      {/* List */}
      {!collapsed && (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {entries.map(([uid, m]) => {
            const online      = m.sharing && m.lat != null;
            const isFollowing = uid === followedUid;
            const isMe        = uid === myId;
            const num         = memberNumbers[uid] ?? '?';

            return (
              <Pressable
                key={uid}
                style={[
                  styles.card,
                  {
                    backgroundColor: m.color + '14',
                    borderColor:     isFollowing ? m.color : C.border,
                  },
                ]}
                onPress={() => onFocusMember(uid)}
              >
                {/* Avatar */}
                <View style={styles.avatarWrap}>
                  <View style={[styles.avatar, { backgroundColor: m.color, opacity: m.sharing === false ? 0.5 : 1 }]}>
                    <Text style={styles.avatarNum}>{num}</Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: online ? '#22c55e' : '#9ca3af' }]} />
                </View>

                {/* Name */}
                <View style={styles.nameWrap}>
                  <Text style={[styles.name, { color: isFollowing ? m.color : C.text }]} numberOfLines={1}>
                    {m.emoji} {m.name}{isMe ? ' (Me)' : ''}{isFollowing ? ' 🔒' : ''}
                  </Text>
                  <Text style={[styles.statusLabel, { color: C.muted }]}>
                    {online ? 'Online' : 'Offline'}
                  </Text>
                </View>
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
    borderRadius: 16, borderWidth: 1,
    overflow: 'hidden', maxHeight: 280,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
  },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:  { fontWeight: '700', fontSize: 14 },
  countBadge:   { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  countText:    { color: '#fff', fontSize: 12, fontWeight: '700' },

  list: { paddingHorizontal: 10, paddingBottom: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, padding: 10, marginBottom: 6,
    borderWidth: 1.5,
  },

  avatarWrap:  { position: 'relative', marginRight: 10 },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarNum:   { color: '#fff', fontSize: 13, fontWeight: '800' },
  statusDot: {
    position: 'absolute', bottom: -1, right: -1,
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1.5, borderColor: '#fff',
  },

  nameWrap:    { flex: 1 },
  name:        { fontSize: 13, fontWeight: '700' },
  statusLabel: { fontSize: 11, marginTop: 1 },
});
