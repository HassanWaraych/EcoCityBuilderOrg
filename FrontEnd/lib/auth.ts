import type { Player } from "./types";

const TOKEN_KEY = "ecocity_token";
const PLAYER_KEY = "ecocity_player";

export function saveAuth(token: string, player: Player) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PLAYER_KEY, JSON.stringify(player));
}

export function getToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
}

export function getStoredPlayer(): Player | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PLAYER_KEY);
  return raw ? (JSON.parse(raw) as Player) : null;
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PLAYER_KEY);
}
