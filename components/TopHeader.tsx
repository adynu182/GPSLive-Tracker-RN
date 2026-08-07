import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, useAppTheme } from '../src/theme';
import { useStore } from '../src/state';
import { shareRoomCode } from '../src/room';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MembersList from './MembersList';

interface Props {
  onFocusMember: (uid: string) => void;
}

export default function TopHeader({ onFocusMember }: Props) {
  const scheme = useAppTheme();
  const C = Colors[scheme];
  const insets = useSafeAreaInsets();

  const roomId      = useStore((s) => s.roomId);
  const offlineMode = useStore((s) => s.offlineMode);
  const members     = useStore((s) => s.members);
  const connected   = useStore((s) => s.connected);

  const [panelOpen, setPanelOpen] = useState(false);

  const onlineCount = Object.values(members).filter(
    (m) => m.sharing && m.lat != null,
  ).length;

  const totalCount = Object.keys(members).length;

  const topPad = Math.max(insets.top, 16);

  return (
    <>
      {/* ── Header bar ─────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: C.toolbarBg,
            borderBottomColor: C.border,
            paddingTop: topPad,
          },
        ]}
      >
        {/* Left: Room code chip & share button */}
        <View style={styles.left}>
          {offlineMode ? (
            <View style={[styles.roomChip, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[styles.roomChipIcon]}>🛩️</Text>
              <Text style={[styles.roomChipText, { color: C.muted }]}>Offline Nav</Text>
            </View>
          ) : roomId ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.roomChip, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={styles.roomChipIcon}>📡</Text>
                <Text style={[styles.roomChipCode, { color: C.primary }]}>{roomId}</Text>
              </View>

              <Pressable
                style={[styles.shareBtn, { backgroundColor: C.card, borderColor: C.border }]}
                onPress={() => shareRoomCode()}
              >
                <MaterialCommunityIcons name="share-variant-outline" size={18} color={C.primary} />
              </Pressable>
            </View>
          ) : null}

          {/* Offline warning dot */}
          {!connected && (
            <View style={[styles.offlineDot, { backgroundColor: C.badgeOffline }]}>
              <Text style={styles.offlineDotText}>No Signal</Text>
            </View>
          )}
        </View>

        {/* Center: spacer */}
        <View style={styles.center} />

        {/* Right: Member toggle button */}
        {!offlineMode && totalCount > 0 && (
          <Pressable
            style={[
              styles.memberBtn,
              {
                backgroundColor: panelOpen ? C.primary + '22' : C.card,
                borderColor: panelOpen ? C.primary : C.border,
              },
            ]}
            onPress={() => setPanelOpen((v) => !v)}
          >
            <Text style={styles.memberBtnIcon}>👥</Text>
            <View style={styles.memberBtnCounts}>
              <Text style={[styles.memberBtnTotal, { color: C.text }]}>
                {totalCount}
              </Text>
              {onlineCount > 0 && (
                <View style={[styles.onlinePip, { backgroundColor: '#22c55e' }]}>
                  <Text style={styles.onlinePipText}>{onlineCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.chevron, { color: C.muted }]}>
              {panelOpen ? '▲' : '▼'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* ── Member panel (absolute overlay below header) ───── */}
      {panelOpen && (
        <View
          style={[
            styles.panel,
            {
              top: topPad + HEADER_INNER_HEIGHT,
              borderColor: C.border,
            },
          ]}
        >
          <MembersList onFocusMember={(uid) => { onFocusMember(uid); }} />
        </View>
      )}
    </>
  );
}

const HEADER_INNER_HEIGHT = 56; // px of the inner row (excluding safe area)

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 10,
    height: undefined, // dynamic via paddingTop + paddingBottom + content
    minHeight: HEADER_INNER_HEIGHT,
  },

  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },

  roomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  roomChipIcon: { fontSize: 15 },
  roomChipCode: {
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 2,
  },
  roomChipText: {
    fontWeight: '700',
    fontSize: 13,
  },
  shareBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  offlineDot: {
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineDotText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  center: { flex: 1 },

  memberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  memberBtnIcon: { fontSize: 15 },
  memberBtnCounts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberBtnTotal: {
    fontWeight: '800',
    fontSize: 14,
  },
  onlinePip: {
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  onlinePipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 11,
  },

  panel: {
    position: 'absolute',
    right: 12,
    left: 12,
    zIndex: 19,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
