import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { useToastConfig } from '../components/Toast';
import { useStore } from '../src/state';
import { loadTheme } from '../src/storage';

export default function RootLayout() {
  const toastConfig = useToastConfig();
  // Offset di-set oleh layar yang sedang aktif (lihat app/index.tsx &
  // app/tracker.tsx) — supaya cuma perlu SATU root <Toast>, bukan satu
  // per layar. Mounting >1 <Toast> bikin react-native-toast-message
  // bingung instance mana yang "aktif" tergantung urutan render.
  const toastTopOffset = useStore((s) => s.toastTopOffset);

  // Muat preferensi tema tersimpan SEBELUM render pertama layar mana pun,
  // supaya tidak ada "flash" tema terang default sesaat sebelum tema
  // gelap (kalau itu preferensi user) diterapkan.
  const [themeLoaded, setThemeLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      const theme = await loadTheme();
      useStore.getState().set({ appTheme: theme });
      setThemeLoaded(true);
    })();
  }, []);

  if (!themeLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <Toast config={toastConfig} topOffset={toastTopOffset} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
