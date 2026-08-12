import {
  ref, set, onValue, onDisconnect,
  serverTimestamp, remove,
  get,
} from 'firebase/database';
import { db } from './firebase';
import { useStore, getState } from './state';
import { COLORS, genId, safeColor } from './constants';
import { saveUserData, getDeviceId } from './storage';
import { stopGPS } from './gps';
import { getSelectedRoomId } from './room';
import { requestWakeLock, releaseWakeLock } from './wakelock';
import { clearSessionData } from './storage';

// ─── Firebase listener lifecycle ──────────────────────────────────
// onValue() mengembalikan fungsi unsubscribe (sinkron) yang HARUS dipanggil
// saat sesi berakhir — kalau tidak, listener lama tetap hidup dan menumpuk
// setiap kali user logout lalu join lagi tanpa restart app.
let _unsubMembers:   (() => void) | null = null;
let _unsubConnected: (() => void) | null = null;

function unsubscribeListeners(): void {
  _unsubMembers?.();
  _unsubMembers = null;
  _unsubConnected?.();
  _unsubConnected = null;
}

// ─── Timeout guard untuk operasi jaringan ─────────────────────────
// Firebase RTDB tidak punya timeout bawaan untuk read/write saat device
// BENAR-BENAR offline (bukan sekadar lambat) — Promise dari get()/set()
// bisa menggantung tanpa batas waktu sampai koneksi kembali, alih-alih
// reject dengan error. Tanpa ini, tombol "Bagikan Lokasi" akan terus
// berputar tanpa feedback apapun kalau device tidak ada internet sama
// sekali. withTimeout() memaksa operasi itu gagal dengan pesan yang jelas
// setelah `ms` milidetik, supaya UI (lihat handleStart di app/index.tsx)
// bisa berhenti loading dan menampilkan toast error seperti biasa.
function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

const NAME_CHECK_TIMEOUT_MS = 6000;   // cek nama duplikat — boleh gagal cepat, tidak kritis
const PRESENCE_TIMEOUT_MS   = 10000;  // tulis presence awal — ini yang menentukan join berhasil/tidak

// ─── Firebase presence write ──────────────────────────────────────
async function writeMyPresence(roomId: string, myId: string, full = true) {
  if (!db) return;
  const { myName, myEmoji, myColor, sharingOn, myLat, myLng, myJoinedAt } = getState();
  const deviceId = await getDeviceId();
  const myRef = ref(db, `rooms/${roomId}/members/${myId}`);
  if (full) {
    await withTimeout(
      set(myRef, {
        name:     myName,
        emoji:    myEmoji,
        color:    myColor,
        sharing:  sharingOn,
        lat:      myLat ?? null,
        lng:      myLng ?? null,
        ts:       serverTimestamp(),
        joinedAt: myJoinedAt ?? serverTimestamp(),
        deviceId,
      }),
      PRESENCE_TIMEOUT_MS,
      'Tidak ada koneksi internet',
    );
  }
  onDisconnect(myRef).remove();
}

// ─── Start Tracking — called from Join screen ─────────────────────
export async function startTracking(name: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!db) {
    return { ok: false, error: '⚠️ Firebase belum siap. Isi EXPO_PUBLIC_FIREBASE_* di .env.' };
  }

  const roomId = getSelectedRoomId();
  if (!roomId)           return { ok: false, error: '⚠️ Masukkan kode room dulu!' };
  if (roomId.length < 4) return { ok: false, error: '⚠️ Kode room minimal 4 karakter!' };
  if (!name.trim())      return { ok: false, error: '⚠️ Masukkan nama kamu dulu!' };

  // Check for duplicate name in room
  try {
    const snapshot = await withTimeout(
      get(ref(db, `rooms/${roomId}/members`)),
      NAME_CHECK_TIMEOUT_MS,
      'Timeout saat memeriksa nama',
    );
    if (snapshot.exists()) {
      const deviceId = await getDeviceId();
      const isNameTaken = Object.values(snapshot.val() as Record<string, any>).some(
        (m) => m.name && m.name.toLowerCase() === name.trim().toLowerCase() && m.deviceId !== deviceId,
      );
      if (isNameTaken) {
        return { ok: false, error: '⚠️ Nama sedang aktif digunakan di room ini!' };
      }
    }
  } catch (err) {
    console.error('Gagal memeriksa nama:', err);
  }

  const myId = genId();
  const { colorIdx, myEmoji, myName: savedName } = getState();
  // Warna dirotasi murni lewat colorIdx (naik tiap sesi baru) — TIDAK boleh
  // fallback ke state.myColor, karena default-nya selalu truthy (COLORS[0])
  // sehingga rotasi ini nyaris tidak pernah benar-benar kepakai, dan semua
  // anggota room berakhir dengan warna yang sama.
  const myColor = COLORS[colorIdx % COLORS.length];
  const myName  = name.trim() || savedName || 'Anggota';

  useStore.getState().set({
    myId,
    myName,
    myColor,
    roomId,
    myJoinedAt: null,
    colorIdx: colorIdx + 1,
  });

  await saveUserData({ myName, myEmoji, myColor, roomId });

  return startSession(roomId, myId);
}

// ─── Start Offline Nav — no Firebase, no room ─────────────────────
export function startOfflineNav() {
  const { myId, myEmoji, colorIdx } = getState();
  const id    = myId || genId();
  // Sama seperti di startTracking(): jangan fallback ke state.myColor
  // (selalu truthy = COLORS[0]) — pakai colorIdx murni.
  const color = COLORS[colorIdx % COLORS.length];

  useStore.getState().set({
    myId:        id,
    myName:      'Saya',
    myColor:     color,
    offlineMode: true,
    sharingOn:   true,
    members: {
      [id]: {
        name: 'Saya', emoji: myEmoji, color,
        lat: null, lng: null, sharing: true, isMe: true,
        joinedAt: Date.now(),
      },
    },
    isSessionActive: true,
  });

  useStore.getState().recomputeMemberNumbers();
  requestWakeLock();
}

// ─── Core session setup (online mode) ────────────────────────────
async function startSession(roomId: string, myId: string): Promise<{ ok: boolean; error?: string }> {
  if (!db) return { ok: false, error: 'Firebase not ready' };

  // Jaga-jaga kalau startSession terpanggil lagi tanpa performLogout() di
  // antaranya (mis. double-tap) — pastikan tidak ada listener sesi lama
  // yang masih nyantol sebelum pasang yang baru.
  unsubscribeListeners();

  requestWakeLock();

  // Write initial presence — dibungkus try/catch supaya kalau gagal/timeout
  // (mis. tidak ada internet sama sekali), fungsi ini balik dengan pesan
  // error yang jelas alih-alih macet tanpa batas waktu atau reject tanpa
  // tertangkap (handleStart di app/index.tsx tidak bungkus await ini
  // dengan try/catch, jadi startSession/startTracking TIDAK BOLEH throw).
  try {
    await writeMyPresence(roomId, myId, true);
  } catch (err) {
    releaseWakeLock();
    return { ok: false, error: '⚠️ Tidak ada koneksi internet. Coba lagi.' };
  }

  // ── Members listener ──────────────────────────────────────────
  // isFirstSnapshot: snapshot pertama berisi SEMUA member yang sudah ada
  // di room sebelum saya join — bukan orang yang baru saja bergabung.
  // Tanpa guard ini, semua orang yang sudah lama di room akan salah
  // dianggap "baru bergabung" begitu saya connect.
  let isFirstSnapshot = true;

  _unsubMembers = onValue(ref(db, `rooms/${roomId}/members`), (snap) => {
    const data: Record<string, any> = snap.val() || {};
    const state = getState();

    const currentMembers = { ...state.members };
    const lastKnown = { ...state.lastKnownPositions };
    const wasFirstSnapshot = isFirstSnapshot;
    isFirstSnapshot = false;

    // Detect departures (member benar-benar keluar dari room)
    Object.keys(currentMembers).forEach((uid) => {
      if (!data[uid] && uid !== myId) {
        const member = currentMembers[uid];
        useStore.getState().pushToast(
          `${member.emoji || '\uD83E\uDDD1'} ${member.name || 'Anggota'} keluar`,
        );
        delete currentMembers[uid];
        // Hapus lastKnownPositions karena member benar-benar keluar room
        delete lastKnown[uid];
      }
    });

    // Detect arrivals / updates
    Object.entries(data).forEach(([uid, m]: [string, any]) => {
      const isNew = !currentMembers[uid] && uid !== myId;
      // Jangan toast "bergabung" untuk snapshot pertama — itu cuma daftar
      // member yang sudah ada di room, bukan kejadian join yang baru saja.
      if (isNew && !wasFirstSnapshot) {
        useStore.getState().pushToast(
          `${m.emoji || '\uD83E\uDDD1'} ${m.name || 'Anggota'} bergabung!`,
        );
      }

      const prev = currentMembers[uid] || {};
      const updated = {
        ...prev,
        ...m,
        name:  m.name  ?? prev.name  ?? 'Anggota',
        emoji: m.emoji ?? prev.emoji ?? '\uD83E\uDDD1',
        color: safeColor(m.color ?? prev.color ?? COLORS[0]),
        isMe:  uid === myId,
      };
      currentMembers[uid] = updated;

      // Simpan lastKnownPositions setiap kali member punya koordinat valid
      if (m.lat != null && m.lng != null) {
        lastKnown[uid] = {
          lat:   m.lat,
          lng:   m.lng,
          name:  updated.name,
          emoji: updated.emoji,
          color: updated.color,
        };
      }

      if (uid === myId && m.joinedAt) {
        useStore.getState().set({ myJoinedAt: m.joinedAt });
      }
    });

    useStore.getState().set({ members: currentMembers, lastKnownPositions: lastKnown });
    useStore.getState().recomputeMemberNumbers();
  });

  // ── Connection listener ───────────────────────────────────────
  _unsubConnected = onValue(ref(db, '.info/connected'), (snap) => {
    const connected = snap.val() === true;
    const prev = getState().connected;
    useStore.getState().set({ connected });
    if (connected && !prev) {
      // Reconnected — re-write presence. Fire-and-forget (tidak di-await,
      // tidak ada loading state yang menunggu ini) — .catch() cuma jaga-jaga
      // supaya kalau timeout lagi di sini, tidak jadi unhandled rejection.
      writeMyPresence(roomId, myId, true).catch(() => {});
    }
  });

  useStore.getState().set({ isSessionActive: true });

  return { ok: true };
}

// ─── Logout ───────────────────────────────────────────────────────
export async function performLogout(): Promise<void> {
  const { myId, roomId } = getState();

  unsubscribeListeners();
  stopGPS();
  releaseWakeLock();

  if (db && myId && roomId) {
    await remove(ref(db, `rooms/${roomId}/members/${myId}`));
  }

  await clearSessionData();
  useStore.getState().reset();
}

// ─── Toggle location sharing ──────────────────────────────────────
export function toggleSharing(): void {
  const { sharingOn, myId, roomId } = getState();
  const next = !sharingOn;
  useStore.getState().set({ sharingOn: next });

  if (db && myId && roomId) {
    set(ref(db, `rooms/${roomId}/members/${myId}/sharing`), next);
  }
}

// ─── Route OSRM logic ─────────────────────────────────────────────
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
const RECALC_MIN_DIST_M = 150;
const RECALC_MIN_MS = 35000;
const ARRIVED_DIST_M = 40;

let _requestInFlight = false;

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const r = Math.PI / 180;
  const dL = (lat2 - lat1) * r;
  const dLn = (lng2 - lng1) * r;
  const x =
    Math.sin(dL / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLn / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export async function requestRoute(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<void> {
  if (_requestInFlight) return;
  _requestInFlight = true;

  const url = `${OSRM_BASE}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
  let data: any;
  try {
    const res = await fetch(url);
    data = await res.json();
  } catch (err) {
    _requestInFlight = false;
    useStore.getState().pushToast('⚠️ Gagal menghitung rute — coba lagi');
    return;
  }
  _requestInFlight = false;

  if (data.code !== 'Ok' || !data.routes?.length) {
    useStore.getState().pushToast('⚠️ Rute ke titik itu tidak ditemukan');
    return;
  }

  const { routeMode } = getState();
  if (routeMode !== 'active') return;

  const route = data.routes[0];
  useStore.getState().set({
    routeInfo: { distance: route.distance, duration: route.duration },
    routeLastCalc: { lat: fromLat, lng: fromLng, time: Date.now() },
    routeGeometry: route.geometry,
  } as any);

  if (route.distance < ARRIVED_DIST_M) {
    useStore.getState().set({
      routeMode: 'idle',
      routeDest: null,
      routeInfo: null,
      routeLastCalc: null,
      routeGeometry: null,
    } as any);
    useStore.getState().pushToast('🏁 Sampai tujuan!');
  }
}

export function maybeRecalculateRoute(): void {
  const state = getState();
  if (state.routeMode !== 'active' || !state.routeDest || state.myLat == null) return;

  const last = state.routeLastCalc;
  if (last) {
    const moved   = haversine(last.lat, last.lng, state.myLat!, state.myLng!);
    const elapsed = Date.now() - last.time;
    if (moved < RECALC_MIN_DIST_M && elapsed < RECALC_MIN_MS) return;
  }

  requestRoute(state.myLat!, state.myLng!, state.routeDest.lat, state.routeDest.lng);
}
