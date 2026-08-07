import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, useAppTheme } from '../src/theme';
import { useStore } from '../src/state';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function MapControls() {
  const scheme = useAppTheme();
  const C = Colors[scheme];

  const handleZoomIn = () => {
    const count = useStore.getState().zoomInCounter || 0;
    useStore.getState().set({ zoomInCounter: count + 1 });
  };

  const handleZoomOut = () => {
    const count = useStore.getState().zoomOutCounter || 0;
    useStore.getState().set({ zoomOutCounter: count + 1 });
  };

  const handleResetCompass = () => {
    const count = useStore.getState().resetCompassCounter || 0;
    useStore.getState().set({ resetCompassCounter: count + 1 });
  };

  const navMode = useStore((s) => s.navMode);
  const handleToggleNavMode = () => {
    const next = !navMode;
    const state = useStore.getState();
    state.set({
      navMode: next,
      // zoom to street level when activating nav mode
      ...(next ? { navZoomCounter: (state.navZoomCounter || 0) + 1 } : {}),
    });
  };

  return (
    <View style={[styles.unitContainer, { backgroundColor: C.toolbarBg, borderColor: C.border }]}>
      {/* Zoom In */}
      <Pressable
        style={styles.btn}
        onPress={handleZoomIn}
        android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }}
      >
        <Text style={[styles.btnText, { color: C.text }]}>＋</Text>
      </Pressable>

      <View style={[styles.divider, { backgroundColor: C.border }]} />

      {/* Zoom Out */}
      <Pressable
        style={styles.btn}
        onPress={handleZoomOut}
        android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }}
      >
        <Text style={[styles.btnText, { color: C.text }]}>－</Text>
      </Pressable>

      <View style={[styles.divider, { backgroundColor: C.border }]} />

      {/* Compass */}
      <Pressable
        style={styles.btn}
        onPress={handleResetCompass}
        android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }}
      >
        <MaterialCommunityIcons name="compass-outline" size={22} color={C.text} />
      </Pressable>

      <View style={[styles.divider, { backgroundColor: C.border }]} />

      {/* Navigation Mode */}
      <Pressable
        style={[styles.btn, navMode && { backgroundColor: C.primary + '20' }]}
        onPress={handleToggleNavMode}
        android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }}
      >
        <MaterialCommunityIcons name={navMode ? "navigation-variant" : "navigation-variant-outline"} size={22} color={C.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  unitContainer: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    alignItems: 'center',
  },
  btn: {
    width: 60,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  compassIcon: {
    fontSize: 18,
  },
  divider: {
    width: '70%',
    height: 1,
  },
});
