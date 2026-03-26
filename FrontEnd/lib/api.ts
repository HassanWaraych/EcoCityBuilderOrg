import { getToken } from "./auth";
import type { LeaderboardEntry, Player, Session } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {}
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function register(payload: { username: string; email: string; password: string }) {
  return request<{ token: string; player: Player }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function login(payload: { email: string; password: string }) {
  return request<{ token: string; player: Player }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchProfile(playerId: string) {
  return request<{
    profile: Player & { achievements: { code: string; earnedAt: string }[] };
  }>(`/players/${playerId}/profile`);
}

export function fetchScores(playerId: string) {
  return request<{
    scores: {
      sessionId: string;
      cityName: string;
      difficulty: string;
      status: string;
      finalScore: number | null;
      resultTier: string | null;
      completedAt: string | null;
      currentTurn: number;
    }[];
  }>(`/players/${playerId}/scores`);
}

export function fetchLeaderboard() {
  return request<{ leaderboard: LeaderboardEntry[] }>("/players/leaderboard");
}

export function fetchCatalog() {
  return request<{
    zones: { code: string; label: string; cost: number; deltas: Record<string, number> }[];
    infrastructure: { code: string; label: string; cost: number; deltas: Record<string, number> }[];
  }>("/game/catalog");
}

export function createSession(payload: { cityName: string; difficulty: "easy" | "normal" | "hard" }) {
  return request<{ session: Session }>("/game/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchSessions() {
  return request<{
    sessions: {
      sessionId: string;
      cityName: string;
      difficulty: string;
      currentTurn: number;
      status: string;
      finalScore: number | null;
      resultTier: string | null;
      startedAt: string;
    }[];
  }>("/game/sessions");
}

export function fetchSession(sessionId: string) {
  return request<{ session: Session }>(`/game/sessions/${sessionId}`);
}

export function submitTurn(
  sessionId: string,
  payload: {
    actions: { category: "zone" | "infrastructure"; code: string; tileIndex: number }[];
    projectDecisions: { code: string; decision: "approve" | "reject" }[];
    eventResponseIndex?: number;
  },
) {
  return request<{
    session: Session;
    maxTurns: number;
    records: {
      actionType: string;
      detail: Record<string, unknown>;
      delta: Record<string, number>;
      cost: number;
    }[];
    achievements: string[];
  }>(`/game/sessions/${sessionId}/turn`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchHistory(sessionId: string) {
  return request<{
    history: {
      decisionId: string;
      turnNumber: number;
      actionType: string;
      actionDetail: Record<string, unknown>;
      deltas: Record<string, number>;
      cost: number;
      createdAt: string;
    }[];
  }>(`/game/sessions/${sessionId}/history`);
}
