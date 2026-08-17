import { create } from 'zustand';
import { COLORS } from './constants';

// ─── Types ────────────────────────────────────────────────────────
export interface MemberData {
  name: string;
  emoji: string;
  color: string;
  lat: number | null;
  lng: number | null;
  sharing: boolean;
  isMe: boolean;
  joinedAt?: number;
  deviceId?: string;
}

/** Posisi terakhir yang diketahui dari member (termasuk yang sedang offline) */
export interface LastKnownPosition {
  lat: number;
  lng: number;
  name: string;
  emoji: string;
  color: string;
}

/** Satu item di antrian toast. `type` menentukan gaya (info/success/error). */
export interface ToastItem {
  text: string;
  type?: 'info' | 'success' | 'error';
}

export type RouteMode = 'idle' | 'picking' | 'active';

export interface RouteInfo {
  distance: number;
  duration: number;
}

export interface RouteDest {
  lat: number;
  lng: number;
}

export interface RouteLastCalc {
  lat: number;
  lng: number;
  time: number;
}

// ─── App State Shape ──────────────────────────────────────────────
interface AppState {
  // ── User ──────────────────────────────────────────────────────
  myId:     string | null;
  myName:   string | null;
  myEmoji:  string;
  myColor:  string;

  // ── Room ──────────────────────────────────────────────────────
  roomId:      string | null;
  sharingOn:   boolean;
  offlineMode: boolean;
  myJoinedAt:  number | null;

  // ── GPS ───────────────────────────────────────────────────────
  myLat:     number | null;
  myLng:     number | null;
  myHeading: number | null;
  mySpeed:   number;
  // road snap dropped in v1

  // ── Map ───────────────────────────────────────────────────────
  firstFix:    boolean;
  navMode:     boolean;
  appTheme:    'light' | 'dark';

  // ── Follow mode ───────────────────────────────────────────────
  followedUid:    string | null;
  isFollowFlying: boolean;

  // ── Rute navigasi ─────────────────────────────────────────────
  routeMode:     RouteMode;
  routeDest:     RouteDest | null;
  routeInfo:     RouteInfo | null;
  routeLastCalc: RouteLastCalc | null;

  // ── Members ───────────────────────────────────────────────────
  members:            Record<string, MemberData>;
  memberNumbers:      Record<string, number>;
  /** Posisi terakhir yang diketahui — tetap ada meski member offline, dihapus hanya saat keluar room */
  lastKnownPositions: Record<string, LastKnownPosition>;

  // ── UI ────────────────────────────────────────────────────────
  connected:        boolean;
  membersCollapsed: boolean;
  showLabels:       boolean;
  isSessionActive:  boolean; // true once startSession() succeeds → switch to tracker screen

  // ── Toast ─────────────────────────────────────────────────────
  toastQueue:     ToastItem[]; // antrian pesan toast — FIFO, satu tampil sampai selesai baru lanjut
  toastTopOffset: number;      // jarak dari atas layar; di-set tiap layar sesuai layoutnya sendiri

  // ── Route geometry (GeoJSON from OSRM) ───────────────────────
  routeGeometry: object | null;

  // ── Camera fit & control counters ────────────────────────────
  fitAllCounter:       number;
  zoomInCounter:       number;
  zoomOutCounter:      number;
  resetCompassCounter: number;
  navZoomCounter:      number;

  // ── Actions ───────────────────────────────────────────────────
  set: (partial: Partial<Omit<AppState, 'set'>>) => void;
  recomputeMemberNumbers: () => void;
  reset: () => void;
  /** Tambah pesan ke antrian toast. Aman dipanggil berkali-kali secara
   *  berurutan (mis. dalam forEach) — tiap panggilan menambah ke antrian
   *  yang sudah ter-update dari panggilan sebelumnya, bukan menimpanya. */
  pushToast: (text: string, type?: ToastItem['type']) => void;
}

const initialState: Omit<AppState, 'set' | 'recomputeMemberNumbers' | 'reset' | 'pushToast'> = {
  myId:        null,
  myName:      null,
  myEmoji:     '🧑',
  myColor:     COLORS[0],
  roomId:      null,
  sharingOn:   true,
  offlineMode: false,
  myJoinedAt:  null,
  myLat:       null,
  myLng:       null,
  myHeading:   null,
  mySpeed:     0,
  firstFix:    true,
  navMode:     false,
  appTheme:    'light',
  followedUid:    null,
  isFollowFlying: false,
  routeMode:     'idle',
  routeDest:     null,
  routeInfo:     null,
  routeLastCalc: null,
  members:            {},
  memberNumbers:      {},
  lastKnownPositions: {},
  connected:        true,
  membersCollapsed: false,
  showLabels:       true,
  isSessionActive:  false,
  toastQueue:       [],
  toastTopOffset:   40,
  routeGeometry:    null,
  fitAllCounter:       0,
  zoomInCounter:       0,
  zoomOutCounter:      0,
  resetCompassCounter: 0,
  navZoomCounter:      0,
};

// ─── Zustand Store ────────────────────────────────────────────────
export const useStore = create<AppState>((storeSet, get) => ({
  ...initialState,

  set: (partial) => storeSet((s) => ({ ...s, ...partial })),

  recomputeMemberNumbers: () => {
    const members = get().members;
    const sorted = Object.entries(members).sort(([uidA, a], [uidB, b]) => {
      const ta = a.joinedAt ?? 0;
      const tb = b.joinedAt ?? 0;
      if (ta !== tb) return ta - tb;
      return uidA < uidB ? -1 : uidA > uidB ? 1 : 0;
    });
    const numbers: Record<string, number> = {};
    sorted.forEach(([uid], i) => { numbers[uid] = i + 1; });
    storeSet({ memberNumbers: numbers });
  },

  reset: () => storeSet((s) => ({ ...initialState, appTheme: s.appTheme })),

  // Pakai functional updater (bukan set() biasa yang cuma shallow-merge
  // objek statis) supaya beberapa panggilan pushToast() berurutan dalam
  // satu tick sinkron (mis. loop forEach saat banyak member keluar/masuk
  // sekaligus) terakumulasi di antrian, bukan saling menimpa.
  pushToast: (text, type) => storeSet((s) => ({ toastQueue: [...s.toastQueue, { text, type }] })),
}));

// ─── Convenience getter (outside React) ─────────────────────────
export const getState = () => useStore.getState();
