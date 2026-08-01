import { ref, update, set, serverTimestamp } from 'firebase/database';
import { db } from './firebase';
import { getState } from './state';

// ─── Tulis koordinat GPS ke Firebase (atomic update) ──────────────
export function writeLocation(lat: number, lng: number): void {
  const { myId, roomId } = getState();
  if (!db || !myId || !roomId) return;
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
