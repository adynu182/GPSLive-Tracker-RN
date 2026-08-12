import { ref, update, set, serverTimestamp } from 'firebase/database';
import { db } from './firebase';
import { getState } from './state';

// ─── Tulis koordinat GPS ke Firebase (atomic update) ──────────────
export function writeLocation(lat: number, lng: number): void {
  const { myId, roomId, offlineMode } = getState();
  // Navigasi offline murni lokal — tidak ada room Firebase untuk ditulisi.
  // Tanpa guard ini, myId/roomId yang (seharusnya sudah tidak) nyangkut
  // dari percobaan online sebelumnya bisa bikin posisi GPS diam-diam
  // terkirim ke Firebase padahal user mengira dirinya offline.
  if (offlineMode || !db || !myId || !roomId) return;
  update(ref(db, `rooms/${roomId}/members/${myId}`), {
    lat,
    lng,
    ts: serverTimestamp(),
  });
}

// ─── Update status berbagi lokasi ─────────────────────────────────
export function writeSharing(val: boolean): void {
  const { myId, roomId } = getState();
  if (!db || !myId || !roomId) return;
  set(ref(db, `rooms/${roomId}/members/${myId}/sharing`), val);
}
