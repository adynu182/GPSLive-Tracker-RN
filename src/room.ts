import { genRoomCode, sanitizeRoomCode } from './constants';
import { useStore, getState } from './state';

// ─── State for room tab UI ─────────────────────────────────────────
// Kept as module-level state (not Zustand) since it's only needed
// during the join screen before a session starts.

let _generatedCode = genRoomCode();
let _activeTab: 'create' | 'join' = 'create';
let _joinCode = '';

export function getGeneratedCode(): string {
  return _generatedCode;
}

export function regenerateRoomCode(): string {
  _generatedCode = genRoomCode();
  return _generatedCode;
}

export function selectRoomTab(tab: 'create' | 'join'): void {
  _activeTab = tab;
}

export function getActiveTab(): 'create' | 'join' {
  return _activeTab;
}

export function setJoinCode(code: string): void {
  _joinCode = sanitizeRoomCode(code);
}

export function getJoinCode(): string {
  return _joinCode;
}

// ─── Returns the room ID to use when starting a session ──────────
export function getSelectedRoomId(): string {
  if (_activeTab === 'create') return _generatedCode;
  return sanitizeRoomCode(_joinCode);
}

// ─── Share room code via native Share sheet ───────────────────────
export async function shareRoomCode(): Promise<void> {
  const { Share } = await import('react-native');
  const { roomId } = getState();
  const code = roomId || _generatedCode;
  const message = `Gabung sesi GPS Live bareng aku!\nKode room: ${code}`;
  await Share.share({ message, title: 'GPS Live — Kode Room' });
}

// ─── Copy room code to clipboard ─────────────────────────────────
export async function copyRoomCode(): Promise<void> {
  const { Clipboard } = await import('react-native');
  const { roomId } = getState();
  const code = roomId || _generatedCode;
  Clipboard.setString(code);
}
