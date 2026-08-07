import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeColor, genId } from './constants';

// ─── Keys ────────────────────────────────────────────────────────
const KEY_NAME      = 'lokasi_name';
const KEY_EMOJI     = 'lokasi_emoji';
const KEY_COLOR     = 'lokasi_color';
const KEY_ROOM      = 'lokasi_room';
const KEY_DEVICE_ID = 'lokasi_device_id';

// ─── Simpan preferensi user ───────────────────────────────────────
export async function saveUserData(data: {
  myName: string | null;
  myEmoji: string;
  myColor: string;
  roomId: string | null;
}): Promise<void> {
  const pairs: [string, string][] = [];
  if (data.myName)  pairs.push([KEY_NAME,  data.myName]);
  if (data.myEmoji) pairs.push([KEY_EMOJI, data.myEmoji]);
  if (data.myColor) pairs.push([KEY_COLOR, data.myColor]);
  if (data.roomId)  pairs.push([KEY_ROOM,  data.roomId]);
  if (pairs.length) {
    await Promise.all(pairs.map(([k, v]) => AsyncStorage.setItem(k, v)));
  }
}

// ─── Muat preferensi user saat app dibuka ─────────────────────────
export async function loadUserData(): Promise<{
  myName: string | null;
  myEmoji: string | null;
  myColor: string | null;
}> {
  const result = await Promise.all(
    [KEY_NAME, KEY_EMOJI, KEY_COLOR].map(async (k) => {
      const v = await AsyncStorage.getItem(k);
      return [k, v] as [string, string | null];
    })
  );
  const map = Object.fromEntries(result);
  const savedColor = map[KEY_COLOR];
  return {
    myName:  map[KEY_NAME] || null,
    myEmoji: map[KEY_EMOJI] || null,
    myColor: savedColor && safeColor(savedColor) === savedColor ? savedColor : null,
  };
}

// ─── Kode room terakhir yang dipakai user ─────────────────────────
export async function getSavedRoomCode(): Promise<string> {
  return (await AsyncStorage.getItem(KEY_ROOM)) || '';
}

// ─── Clear room session data saat logout ──────────────────────────
export async function clearSessionData(): Promise<void> {
  await AsyncStorage.removeItem(KEY_ROOM);
}

// ─── Device ID unik per perangkat (bukan per sesi) ───────────────
export async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(KEY_DEVICE_ID);
  if (!id) {
    id = genId() + genId();
    await AsyncStorage.setItem(KEY_DEVICE_ID, id);
  }
  return id;
}
