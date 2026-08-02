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

// ─── Firebase presence write ──────────────────────────────────────
async function writeMyPresence(roomId: string, myId: string, full = true) {
  if (!db) return;
  const { myName, myEmoji, myColor, sharingOn, myLat, myLng, myJoinedAt } = getState();
  const deviceId = await getDeviceId();
  const myRef = ref(db, `rooms/${roomId}/members/${myId}`);
  if (full) {
    await set(myRef, {
      name:     myName,
      emoji:    myEmoji,
      color:    myColor,
      sharing:  sharingOn,
      lat:      myLat ?? null,
      lng:      myLng ?? null,
      ts:       serverTimestamp(),
      joinedAt: myJoinedAt ?? serverTimestamp(),
      deviceId,
    });
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
    const snapshot = await get(ref(db, `rooms/${roomId}/members`));
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
  const { colorIdx, myColor: savedColor, myEmoji, myName: savedName } = getState();
  const myColor = savedColor || COLORS[colorIdx % COLORS.length];
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
  const { myId, myEmoji, myColor, colorIdx } = getState();
  const id    = myId    || genId();
  const color = myColor || COLORS[colorIdx % COLORS.length];

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

  requestWakeLock();

  // Write initial presence
  await writeMyPresence(roomId, myId, true);

  // ── Members listener ──────────────────────────────────────────
  onValue(ref(db, `rooms/${roomId}/members`), (snap) => {
    const data: Record<string, any> = snap.val() || {};
    const state = getState();

    const currentMembers = { ...state.members };

    // Detect departures
    Object.keys(currentMembers).forEach((uid) => {
      if (!data[uid] && uid !== myId) {
        const member = currentMembers[uid];
        useStore.getState().set({
          _toastMsg: `${member.emoji || '🧑'} ${member.name || 'Anggota'} keluar`,
        } as any);
        delete currentMembers[uid];
      }
    });

    // Detect arrivals / updates
    Object.entries(data).forEach(([uid, m]: [string, any]) => {
      const isNew = !currentMembers[uid] && uid !== myId;
      if (isNew) {
        useStore.getState().set({
          _toastMsg: `${m.emoji || '🧑'} ${m.name || 'Anggota'} bergabung!`,
        } as any);
      }

      const prev = currentMembers[uid] || {};
      currentMembers[uid] = {
        ...prev,
        ...m,
        name:  m.name  ?? prev.name  ?? 'Anggota',
        emoji: m.emoji ?? prev.emoji ?? '🧑',
        color: safeColor(m.color ?? prev.color ?? COLORS[0]),
        isMe:  uid === myId,
      };

      if (uid === myId && m.joinedAt) {
        useStore.getState().set({ myJoinedAt: m.joinedAt });
      }
    });

    useStore.getState().set({ members: currentMembers });
    useStore.getState().recomputeMemberNumbers();
  });

  // ── Connection listener ───────────────────────────────────────
  onValue(ref(db, '.info/connected'), (snap) => {
    const connected = snap.val() === true;
    const prev = getState().connected;
    useStore.getState().set({ connected });
    if (connected && !prev) {
      // Reconnected — re-write presence
      writeMyPresence(roomId, myId, true);
    }
  });

  useStore.getState().set({ isSessionActive: true });

  return { ok: true };
}

// ─── Logout ───────────────────────────────────────────────────────
export async function performLogout(): Promise<void> {
  const { myId, roomId } = getState();

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
    useStore.getState().set({ _toastMsg: '⚠️ Gagal menghitung rute — coba lagi' } as any);
    return;
  }
  _requestInFlight = false;

  if (data.code !== 'Ok' || !data.routes?.length) {
    useStore.getState().set({ _toastMsg: '⚠️ Rute ke titik itu tidak ditemukan' } as any);
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
      _toastMsg: '🏁 Sampai tujuan!',
      routeMode: 'idle',
      routeDest: null,
      routeInfo: null,
      routeLastCalc: null,
      routeGeometry: null,
    } as any);
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
