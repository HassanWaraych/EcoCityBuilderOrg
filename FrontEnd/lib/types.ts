export type SessionStatus = "active" | "completed" | "abandoned" | "lost";

export type Tile = {
  terrain: "plain" | "rock";
  zone: string | null;
  infrastructure: string | null;
};

export type SessionState = {
  gridW: number;
  gridH: number;
  tiles: Tile[][];
  roadsBuilt: number;
  transitBuilt: number;
  waterPlantsBuilt: number;
  windTurbinesBuilt: number;
  wasteManagementBuilt: number;
  bikeLanesBuilt: number;
};

export type MetricsDelta = {
  happiness?: number;
  envHealth?: number;
  economy?: number;
  carbonFootprint?: number;
  budget?: number;
  population?: number;
};

export type Project = {
  code: string;
  label: string;
  cost: number;
  deltas: MetricsDelta;
  rejectPenalty: Partial<MetricsDelta>;
};

export type EventOption = {
  label: string;
  deltas: MetricsDelta;
  budgetDelta?: number;
};

export type EventCard = {
  code: string;
  title: string;
  description: string;
  options: EventOption[];
};

export type Session = {
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
  pendingProjects: Project[];
  pendingEvent: EventCard | null;
  startedAt: string;
  completedAt: string | null;
};

export type Player = {
  playerId: string;
  username: string;
  email: string;
  totalGames: number;
  bestScore: number;
};

export type CatalogAction = {
  code: string;
  label: string;
  cost: number;
  deltas: MetricsDelta;
};
