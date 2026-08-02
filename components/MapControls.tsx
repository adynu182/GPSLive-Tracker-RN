import React from 'react';
import { View, Text, Pressable, StyleSheet, useColorScheme } from 'react-native';
import { Colors } from '../src/theme';
import { useStore } from '../src/state';

export default function MapControls() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
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
        <Text style={styles.compassIcon}>🧭</Text>
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
    width: 42,
    alignItems: 'center',
  },
  btn: {
    width: 42,
    height: 42,
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
