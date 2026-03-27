export type SessionStatus = "active" | "completed" | "abandoned" | "lost";

export interface Tile {
  terrain: "plain" | "rock";
  zone: string | null;
  infrastructure: string | null;
}

export interface SessionState {
  gridW: number;
  gridH: number;
  tiles: Tile[][];
  roadsBuilt: number;
  transitBuilt: number;
  waterPlantsBuilt: number;
  windTurbinesBuilt: number;
  wasteManagementBuilt: number;
  bikeLanesBuilt: number;
}

export interface SessionMetrics {
  happiness: number;
  envHealth: number;
  economy: number;
  carbonFootprint: number;
  budget: number;
  population: number;
}

export interface ProjectOption {
  code: string;
  label: string;
  cost: number;
  deltas: MetricsDelta;
  rejectPenalty: Partial<MetricsDelta>;
}

export interface EventOption {
  label: string;
  deltas: MetricsDelta;
  budgetDelta?: number;
}

export interface EventCard {
  code: string;
  title: string;
  description: string;
  options: EventOption[];
}

export interface MetricsDelta {
  happiness?: number;
  envHealth?: number;
  economy?: number;
  carbonFootprint?: number;
  budget?: number;
  population?: number;
}

export interface TurnAction {
  category: "zone" | "infrastructure";
  code: string;
  tileIndex: number;
}

export interface ProjectDecision {
  code: string;
  decision: "approve" | "reject";
}

export interface TurnDecisionRecord {
  actionType: string;
  detail: Record<string, unknown>;
  delta: MetricsDelta;
  cost: number;
}

export interface SessionRecord {
  sessionId: string;
  playerId: string;
  cityName: string;
  difficulty: string;
  currentTurn: number;
  status: SessionStatus;
  happiness: number;
  envHealth: number;
  economy: number;
  carbonFootprint: number;
  budget: number;
  population: number;
  finalScore: number | null;
  resultTier: string | null;
  lossReason: string | null;
  state: SessionState;
  pendingProjects: ProjectOption[];
  pendingEvent: EventCard | null;
  startedAt: string;
  completedAt: string | null;
}

export interface PlayerProfile {
  playerId: string;
  username: string;
  email: string;
  totalGames: number;
  bestScore: number;
  achievements: string[];
}
