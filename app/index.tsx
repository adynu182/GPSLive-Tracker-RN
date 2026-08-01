import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList,
  StyleSheet, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '../src/theme';
import { EMOJIS, COLORS } from '../src/constants';
import { loadUserData } from '../src/storage';
import { useStore } from '../src/state';
import {
  getGeneratedCode, regenerateRoomCode,
  selectRoomTab, getActiveTab,
  setJoinCode, getJoinCode,
} from '../src/room';
import { startTracking, startOfflineNav } from '../src/session';
import Toast from 'react-native-toast-message';

export default function JoinScreen() {
  const router = useRouter();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const C = Colors[scheme];

  const [tab,        setTab]        = useState<'create' | 'join'>('create');
  const [name,       setName]       = useState('');
  const [emoji,      setEmoji]      = useState('🧑');
  const [joinCode,   setJoinCodeState] = useState('');
  const [roomCode,   setRoomCode]   = useState(getGeneratedCode());
  const [loading,    setLoading]    = useState(false);
  const [colorIdx,   setColorIdx]   = useState(0);

  const isSessionActive = useStore((s) => s.isSessionActive);

  // Navigate to tracker as soon as session is active
  useEffect(() => {
    if (isSessionActive) {
      router.replace('/tracker');
    }
  }, [isSessionActive]);

  // Pre-fill saved user data
  useEffect(() => {
    (async () => {
      const data = await loadUserData();
      if (data.myName)  setName(data.myName);
      if (data.myEmoji) setEmoji(data.myEmoji);
      if (data.myColor) {
        const idx = COLORS.indexOf(data.myColor);
        if (idx >= 0) setColorIdx(idx);
      }
    })();
  }, []);

  const handleTabSelect = (t: 'create' | 'join') => {
    setTab(t);
    selectRoomTab(t);
  };

  const handleRegenerateCode = () => {
    const newCode = regenerateRoomCode();
    setRoomCode(newCode);
  };

  const handleJoinCodeChange = (v: string) => {
    const upper = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setJoinCodeState(upper);
    setJoinCode(upper);
  };

  const handleStart = async () => {
    setLoading(true);
    const result = await startTracking(name);
    setLoading(false);
    if (!result.ok) {
      Toast.show({ type: 'error', text1: result.error });
    }
  };

  const handleOfflineNav = () => {
    startOfflineNav();
  };

  const myColor = COLORS[colorIdx % COLORS.length];

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: C.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.logoCircle, { backgroundColor: C.primary }]}>
            <Text style={styles.logoText}>📍</Text>
          </View>
          <Text style={[styles.appName, { color: C.text }]}>GPS Live</Text>
          <Text style={[styles.subtitle, { color: C.muted }]}>Berbagi lokasi real-time</Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>

          {/* Tab selector */}
          <View style={[styles.tabs, { backgroundColor: C.background }]}>
            <Pressable
              style={[styles.tab, tab === 'create' && { backgroundColor: C.primary }]}
              onPress={() => handleTabSelect('create')}
            >
              <Text style={[styles.tabText, { color: tab === 'create' ? '#fff' : C.muted }]}>
                ✨ Buat Room
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, tab === 'join' && { backgroundColor: C.primary }]}
              onPress={() => handleTabSelect('join')}
            >
              <Text style={[styles.tabText, { color: tab === 'join' ? '#fff' : C.muted }]}>
                🔗 Gabung Room
              </Text>
            </Pressable>
          </View>

          {/* Room code display/input */}
          {tab === 'create' ? (
            <View style={styles.section}>
              <Text style={[styles.label, { color: C.muted }]}>Kode room kamu</Text>
              <Pressable onPress={handleRegenerateCode} style={[styles.roomCodeBox, { borderColor: C.primary }]}>
                <Text style={[styles.roomCode, { color: C.primary }]}>{roomCode}</Text>
                <Text style={[styles.regenHint, { color: C.muted }]}>🔄 ketuk untuk generate baru</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={[styles.label, { color: C.muted }]}>Masukkan kode room</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.background, color: C.text, borderColor: C.border }]}
                value={joinCode}
                onChangeText={handleJoinCodeChange}
                placeholder="Contoh: ABCD12"
                placeholderTextColor={C.muted}
                autoCapitalize="characters"
                maxLength={6}
              />
            </View>
          )}

          {/* Name input */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: C.muted }]}>Nama kamu</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.background, color: C.text, borderColor: C.border }]}
              value={name}
              onChangeText={setName}
              placeholder="Masukkan nama..."
              placeholderTextColor={C.muted}
              autoCorrect={false}
              maxLength={30}
            />
          </View>

          {/* Emoji selector */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: C.muted }]}>Pilih avatar</Text>
            <FlatList
              data={EMOJIS}
              horizontal
              keyExtractor={(e) => e}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setEmoji(item);
                    useStore.getState().set({ myEmoji: item });
                  }}
                  style={[
                    styles.emojiBtn,
                    emoji === item && { backgroundColor: C.primary + '30', borderColor: C.primary },
                  ]}
                >
                  <Text style={styles.emojiText}>{item}</Text>
                </Pressable>
              )}
            />
          </View>

          {/* Color indicator */}
          <View style={styles.colorRow}>
            <View style={[styles.colorDot, { backgroundColor: myColor }]} />
            <Text style={[styles.colorLabel, { color: C.muted }]}>Warna marker kamu</Text>
          </View>

          {/* Start button */}
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: C.primary }, loading && styles.disabled]}
            onPress={handleStart}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>🗺️ Bagikan Lokasi</Text>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: C.border }]} />
            <Text style={[styles.dividerText, { color: C.muted }]}>atau</Text>
            <View style={[styles.divider, { backgroundColor: C.border }]} />
          </View>

          {/* Offline nav button */}
          <Pressable
            style={[styles.offlineBtn, { borderColor: C.border }]}
            onPress={handleOfflineNav}
          >
            <Text style={[styles.offlineBtnText, { color: C.muted }]}>🗺️ Mode Navigasi Offline</Text>
          </Pressable>

        </View>

        <Text style={[styles.footer, { color: C.muted }]}>
          Lokasi hanya dibagikan selama sesi aktif
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },

  header: { alignItems: 'center', marginBottom: 28, marginTop: 20 },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8,
    elevation: 6,
  },
  logoText:  { fontSize: 28 },
  appName:   { fontSize: 26, fontWeight: '800', letterSpacing: 0.3 },
  subtitle:  { fontSize: 14, marginTop: 4 },

  card: {
    borderRadius: 20, padding: 20, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    marginBottom: 20,
  },

  tabs:          { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab:           { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabText:       { fontWeight: '700', fontSize: 13 },

  section:       { marginBottom: 16 },
  label:         { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },

  roomCodeBox:   {
    borderWidth: 2, borderRadius: 12, padding: 16,
    alignItems: 'center', borderStyle: 'dashed',
  },
  roomCode:      { fontSize: 28, fontWeight: '900', letterSpacing: 6 },
  regenHint:     { fontSize: 11, marginTop: 4 },

  input: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 16, fontWeight: '600',
  },

  emojiBtn: {
    width: 46, height: 46, borderRadius: 12, marginRight: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  emojiText:    { fontSize: 22 },

  colorRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  colorDot:  { width: 16, height: 16, borderRadius: 8, marginRight: 8 },
  colorLabel:{ fontSize: 13 },

  primaryBtn: {
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  disabled:       { opacity: 0.6 },

  dividerRow:   { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  divider:      { flex: 1, height: 1 },
  dividerText:  { marginHorizontal: 10, fontSize: 12 },

  offlineBtn: {
    borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center',
  },
  offlineBtnText: { fontWeight: '700', fontSize: 14 },

  footer: { textAlign: 'center', fontSize: 12, marginTop: 4 },
});
