// ─── Warna anggota (dikosongkan saat sharing off → abu) ──────────
export const COLORS = [
  '#247066', '#187a7d', '#2b9a9d', '#1f7b7f',
  '#0f4c4a', '#3da49d', '#5bb5b0', '#7fc6c1',
];

// Pilih warna acak dari COLORS untuk member baru. Kalau `usedColors`
// diberikan (warna-warna yang sudah dipakai member lain di room yang
// sama), diutamakan pilih dari sisa yang BELUM dipakai — supaya warna
// tetap berguna membedakan orang di peta. Kalau semua warna di palet
// sudah kepakai (member lebih banyak dari jumlah warna), baru pilih
// benar-benar acak dari seluruh palet (tabrakan tak terhindarkan).
export function pickRandomColor(usedColors: string[] = []): string {
  const available = COLORS.filter((c) => !usedColors.includes(c));
  const pool = available.length > 0 ? available : COLORS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Pilihan emoji untuk join form ───────────────────────────────
export const EMOJIS = ['🧑', '👩', '🧔', '👦', '👧', '🧑‍💻', '🧑‍🎤', '🧑‍🚀', '🦊', '🐱'];

// ─── Jumlah titik trail per anggota ──────────────────────────────
export const MAX_TRAIL = 40;

// ─── Room code alphabet — tanpa I/O/0/1 supaya tidak ambigu ─────
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;

export const genRoomCode = (): string => {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
};

// ─── Bersihkan input kode room dari user ─────────────────────────
export const sanitizeRoomCode = (s: string | null | undefined): string =>
  String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);

// ─── Generate random ID pendek ────────────────────────────────────
export const genId = (): string => Math.random().toString(36).slice(2, 10);

// ─── Validasi hex color dari Firebase (mencegah injection) ────────
export const safeColor = (c: string): string =>
  /^#[0-9a-fA-F]{6}$/.test(c) ? c : COLORS[0];

// ─── Haversine distance (meters) ─────────────────────────────────
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const r = Math.PI / 180;
  const dL = (lat2 - lat1) * r;
  const dLn = (lng2 - lng1) * r;
  const x =
    Math.sin(dL / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLn / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// ─── Format distance ────────────────────────────────────────────
export const fmtDist = (m: number): string =>
  m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;

// ─── Format duration ─────────────────────────────────────────────
export const fmtDuration = (s: number): string =>
  s < 3600
    ? `${Math.round(s / 60)} menit`
    : `${Math.floor(s / 3600)} jam ${Math.round((s % 3600) / 60)} menit`;
