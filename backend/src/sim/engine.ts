import type {
  EventCard,
  MetricsDelta,
  ProjectDecision,
  ProjectOption,
  SessionMetrics,
  SessionRecord,
  SessionState,
  Tile,
  TurnAction,
  TurnDecisionRecord,
} from "../types/index.ts";

type ZoneDef = {
  label: string;
  cost: number;
  deltas: MetricsDelta;
  populationCap: number;
};

type InfrastructureDef = {
  label: string;
  cost: number;
  deltas: MetricsDelta;
  maxCount?: number;
};

type EventDef = {
  code: string;
  title: string;
  description: string;
  eligible: (metrics: SessionMetrics) => boolean;
  options: EventCard["options"];
};

export const MAX_TURNS = 15;
export const MAX_ACTIONS_PER_TURN = 3;
const BASE_TURN_GRANT = 12000;

export const ZONES: Record<string, ZoneDef> = {
  residential: {
    label: "Residential",
    cost: 6000,
    deltas: { happiness: 6, envHealth: -1, economy: 2, carbonFootprint: 20, population: 1200 },
    populationCap: 500,
  },
  commercial: {
    label: "Commercial",
    cost: 9000,
    deltas: { happiness: 3, envHealth: -3, economy: 10, carbonFootprint: 55, population: 300 },
    populationCap: 100,
  },
  industrial: {
    label: "Industrial",
    cost: 12000,
    deltas: { happiness: -2, envHealth: -7, economy: 14, carbonFootprint: 110, population: 200 },
    populationCap: 50,
  },
  green_space: {
    label: "Green Space",
    cost: 3500,
    deltas: { happiness: 9, envHealth: 13, economy: 0, carbonFootprint: -70, population: 150 },
    populationCap: 0,
  },
  mixed_use: {
    label: "Mixed Use",
    cost: 14000,
    deltas: { happiness: 7, envHealth: -2, economy: 12, carbonFootprint: 35, population: 900 },
    populationCap: 300,
  },
  solar_farm: {
    label: "Solar Farm",
    cost: 15000,
    deltas: { happiness: 4, envHealth: 12, economy: 7, carbonFootprint: -260 },
    populationCap: 0,
  },
};

export const INFRASTRUCTURE: Record<string, InfrastructureDef> = {
  road_network: {
    label: "Road Network",
    cost: 7000,
    deltas: { happiness: 4, envHealth: -2, carbonFootprint: 70 },
  },
  public_transit: {
    label: "Public Transit",
    cost: 18000,
    deltas: { happiness: 12, envHealth: 7, carbonFootprint: -380, population: 400 },
  },
  water_treatment: {
    label: "Water Treatment Plant",
    cost: 13000,
    deltas: { happiness: 7, envHealth: 10, carbonFootprint: 25, population: 500 },
  },
  wind_turbine: {
    label: "Wind Turbine",
    cost: 15000,
    deltas: { happiness: 4, envHealth: 14, carbonFootprint: -320 },
    maxCount: 3,
  },
  waste_management: {
    label: "Waste Management",
    cost: 10000,
    deltas: { happiness: 6, envHealth: 12, carbonFootprint: -120 },
  },
  bike_lane: {
    label: "Bike Lane Network",
    cost: 5000,
    deltas: { happiness: 8, envHealth: 5, carbonFootprint: -150, population: 250 },
  },
};

export const PROJECTS: ProjectOption[] = [
  {
    code: "corporate_hq",
    label: "Corporate HQ",
    cost: 18000,
    deltas: { happiness: -3, envHealth: -5, economy: 15, population: 300 },
    rejectPenalty: { economy: -1 },
  },
  {
    code: "community_centre",
    label: "Community Centre",
    cost: 9000,
    deltas: { happiness: 14, envHealth: 4, economy: 1, population: 450 },
    rejectPenalty: { happiness: -1 },
  },
  {
    code: "coal_power_plant",
    label: "Coal Power Plant",
    cost: 22000,
    deltas: { happiness: -2, envHealth: -14, economy: 18, carbonFootprint: 140 },
    rejectPenalty: { economy: -2 },
  },
  {
    code: "affordable_housing",
    label: "Affordable Housing Block",
    cost: 12000,
    deltas: { happiness: 16, envHealth: -2, economy: 4, population: 1800 },
    rejectPenalty: { happiness: -2 },
  },
  {
    code: "tech_campus",
    label: "Tech Campus",
    cost: 20000,
    deltas: { happiness: 6, envHealth: -3, economy: 18, population: 500 },
    rejectPenalty: { economy: -2 },
  },
  {
    code: "urban_farm",
    label: "Urban Farm",
    cost: 8000,
    deltas: { happiness: 9, envHealth: 16, economy: 4, carbonFootprint: -90, population: 300 },
    rejectPenalty: { envHealth: -1 },
  },
];

const EVENTS: EventDef[] = [
  {
    code: "flash_flood",
    title: "Flash Flood",
    description: "A heavy storm is pushing local waterways beyond capacity.",
    eligible: (metrics) => metrics.envHealth < 50,
    options: [
      { label: "Deploy emergency barriers", deltas: { envHealth: 7, economy: -3 }, budgetDelta: -12000 },
      { label: "Ignore the warning", deltas: { happiness: -15, envHealth: -10 } },
    ],
  },
  {
    code: "economic_boom",
    title: "Economic Boom",
    description: "Private investors want to capitalize on your city's momentum.",
    eligible: (metrics) => metrics.economy >= 70,
    options: [
      { label: "Invest in green infrastructure", deltas: { envHealth: 10, economy: 2 }, budgetDelta: -10000 },
      { label: "Pocket the surplus", deltas: { envHealth: -2, economy: 2 }, budgetDelta: 16000 },
    ],
  },
  {
    code: "citizen_protest",
    title: "Citizen Protest",
    description: "Residents are demanding better quality of life.",
    eligible: (metrics) => metrics.happiness < 40,
    options: [
      { label: "Build a park", deltas: { happiness: 12, envHealth: 3 }, budgetDelta: -5000 },
      { label: "Increase policing", deltas: { happiness: -3 }, budgetDelta: -3000 },
    ],
  },
  {
    code: "drought",
    title: "Drought",
    description: "A dry season is straining water reserves across the city.",
    eligible: () => true,
    options: [
      { label: "Enforce water rationing", deltas: { happiness: -8, envHealth: 5 } },
      { label: "Sink emergency wells", deltas: { envHealth: -6, population: 200 }, budgetDelta: -7000 },
    ],
  },
  {
    code: "tech_investment_offer",
    title: "Tech Investment Offer",
    description: "A major technology firm proposes a rapid-growth expansion.",
    eligible: (metrics) => metrics.economy >= 60,
    options: [
      { label: "Accept the offer", deltas: { economy: 20, envHealth: -8, population: 400 }, budgetDelta: 22000 },
      { label: "Decline", deltas: {} },
    ],
  },
  {
    code: "disease_outbreak",
    title: "Disease Outbreak",
    description: "Hospitals are reporting a surge in preventable illness.",
    eligible: (metrics) => metrics.happiness < 50,
    options: [
      { label: "Launch a public health campaign", deltas: { happiness: 14, population: 250 }, budgetDelta: -9000 },
      { label: "Impose a harsh quarantine", deltas: { happiness: -12, envHealth: 4 } },
    ],
  },
];

export function clampMetric(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildInitialState(): SessionState {
  const gridW = 10;
  const gridH = 10;
  const tiles: Tile[][] = Array.from({ length: gridH }, () =>
    Array.from({ length: gridW }, () => ({ terrain: "plain", zone: null, infrastructure: null })),
  );
  const rocks = [
    [1, 1],
    [2, 7],
    [5, 3],
    [7, 8],
    [8, 2],
  ];
  for (const [row, col] of rocks) {
    tiles[row][col] = { terrain: "rock", zone: null, infrastructure: null };
  }

  return {
    gridW,
    gridH,
    tiles,
    roadsBuilt: 0,
    transitBuilt: 0,
    waterPlantsBuilt: 0,
    windTurbinesBuilt: 0,
    wasteManagementBuilt: 0,
    bikeLanesBuilt: 0,
  };
}

export function drawProjects(seed: number): ProjectOption[] {
  const first = PROJECTS[seed % PROJECTS.length];
  const second = PROJECTS[(seed + 3) % PROJECTS.length];
  return first.code === second.code ? [first, PROJECTS[(seed + 1) % PROJECTS.length]] : [first, second];
}

export function drawEvent(turn: number, metrics: SessionMetrics, seed: number): EventCard | null {
  if (turn < 3) return null;
  if (seed % 10 >= 3) return null;

  const eligible = EVENTS.filter((event) => event.eligible(metrics));
  if (eligible.length === 0) return null;

  const selected = eligible[seed % eligible.length];
  return {
    code: selected.code,
    title: selected.title,
    description: selected.description,
    options: selected.options,
  };
}

export function calculateScore(metrics: SessionMetrics, turnsSurvived: number): number {
  const score =
    metrics.happiness * 400 +
    metrics.envHealth * 400 +
    metrics.economy * 200 -
    metrics.carbonFootprint * 0.05 +
    metrics.budget * 0.001 +
    turnsSurvived * 500;
  return Math.max(0, Math.round(score));
}

export function scoreTier(score: number): string {
  if (score >= 95000) return "S - Utopian City";
  if (score >= 85000) return "A - Sustainable City";
  if (score >= 70000) return "B - Thriving City";
  if (score >= 50000) return "C - Developing City";
  if (score >= 25000) return "D - Struggling City";
  return "F - Collapsed City";
}

export function achievementsForScore(score: number): string[] {
  if (score >= 95000) return ["eco_hero"];
  if (score >= 85000) return ["green_city"];
  if (score >= 70000) return ["eco_conscious"];
  if (score >= 50000) return ["city_planner"];
  return [];
}

function applyDelta(metrics: SessionMetrics, delta: MetricsDelta): SessionMetrics {
  return {
    happiness: clampMetric(metrics.happiness + (delta.happiness ?? 0)),
    envHealth: clampMetric(metrics.envHealth + (delta.envHealth ?? 0)),
    economy: clampMetric(metrics.economy + (delta.economy ?? 0)),
    carbonFootprint: Math.max(0, metrics.carbonFootprint + (delta.carbonFootprint ?? 0)),
    budget: Math.max(0, metrics.budget + (delta.budget ?? 0)),
    population: Math.max(0, metrics.population + (delta.population ?? 0)),
  };
}

export function summarizeMetrics(session: SessionRecord): SessionMetrics {
  return {
    happiness: session.happiness,
    envHealth: session.envHealth,
    economy: session.economy,
    carbonFootprint: session.carbonFootprint,
    budget: session.budget,
    population: session.population,
  };
}

export function listCatalog() {
  return {
    zones: Object.entries(ZONES).map(([code, def]) => ({ code, ...def })),
    infrastructure: Object.entries(INFRASTRUCTURE).map(([code, def]) => ({ code, ...def })),
    projects: PROJECTS,
  };
}

function getTile(state: SessionState, tileIndex: number): { row: number; col: number; tile: Tile } | null {
  const tileCount = state.gridW * state.gridH;
  if (!Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex >= tileCount) return null;
  const row = Math.floor(tileIndex / state.gridW);
  const col = tileIndex % state.gridW;
  return { row, col, tile: state.tiles[row][col] };
}

function requireRoadsFor(code: string): boolean {
  return code === "commercial" || code === "industrial" || code === "bike_lane";
}

function applyPassiveTurn(metrics: SessionMetrics): { nextMetrics: SessionMetrics; delta: MetricsDelta } {
  const delta: MetricsDelta = {};

  const taxIncome = Math.floor(metrics.population * 0.006);
  delta.budget = (delta.budget ?? 0) + BASE_TURN_GRANT + taxIncome;

  if (metrics.happiness >= 60) {
    const growth = Math.max(250, Math.floor(metrics.population * 0.05));
    delta.population = (delta.population ?? 0) + growth;
  } else if (metrics.happiness < 30) {
    const decline = Math.max(120, Math.floor(metrics.population * 0.008)) * -1;
    delta.population = (delta.population ?? 0) + decline;
  }

  if (metrics.carbonFootprint > 5000) {
    delta.envHealth = (delta.envHealth ?? 0) - 2;
  }

  if (metrics.envHealth >= 80) {
    delta.happiness = (delta.happiness ?? 0) + 1;
  }

  return { nextMetrics: applyDelta(metrics, delta), delta };
}

function applyAction(
  state: SessionState,
  metrics: SessionMetrics,
  action: TurnAction,
): { state: SessionState; metrics: SessionMetrics; record: TurnDecisionRecord } {
  const target = getTile(state, action.tileIndex);
  if (!target) {
    throw new Error("Invalid tile selected");
  }
  if (target.tile.terrain === "rock") {
    throw new Error("That tile is blocked by rock");
  }

  const nextState: SessionState = structuredClone(state);

  if (action.category === "zone") {
    const def = ZONES[action.code];
    if (!def) throw new Error("Unknown zone action");
    if (metrics.budget < def.cost) throw new Error("Insufficient budget");
    if (requireRoadsFor(action.code) && state.roadsBuilt === 0) {
      throw new Error("Roads are required before this build");
    }
    if (target.tile.zone || target.tile.infrastructure) {
      throw new Error("Select an empty buildable tile");
    }

    nextState.tiles[target.row][target.col].zone = action.code;
    const nextMetrics = applyDelta(metrics, { ...def.deltas, budget: -def.cost });
    return {
      state: nextState,
      metrics: nextMetrics,
      record: {
        actionType: "zone",
        detail: { code: action.code, tileIndex: action.tileIndex, label: def.label },
        delta: { ...def.deltas, budget: -def.cost },
        cost: def.cost,
      },
    };
  }

  const def = INFRASTRUCTURE[action.code];
  if (!def) throw new Error("Unknown infrastructure action");
  if (metrics.budget < def.cost) throw new Error("Insufficient budget");
  if (action.code === "bike_lane" && state.roadsBuilt === 0) {
    throw new Error("Bike lanes require roads");
  }
  if (action.code === "water_treatment" && metrics.population <= 25000) {
    throw new Error("Water treatment unlocks once population exceeds 25,000");
  }
  if (def.maxCount && action.code === "wind_turbine" && state.windTurbinesBuilt >= def.maxCount) {
    throw new Error("Wind turbine cap reached");
  }
  if (target.tile.infrastructure) {
    throw new Error("Select a tile without infrastructure");
  }

  nextState.tiles[target.row][target.col].infrastructure = action.code;
  nextState.roadsBuilt += action.code === "road_network" ? 1 : 0;
  nextState.transitBuilt += action.code === "public_transit" ? 1 : 0;
  nextState.waterPlantsBuilt += action.code === "water_treatment" ? 1 : 0;
  nextState.windTurbinesBuilt += action.code === "wind_turbine" ? 1 : 0;
  nextState.wasteManagementBuilt += action.code === "waste_management" ? 1 : 0;
  nextState.bikeLanesBuilt += action.code === "bike_lane" ? 1 : 0;

  const nextDelta: MetricsDelta = { ...def.deltas, budget: -def.cost };
  if (action.code === "bike_lane" && metrics.envHealth >= 60) {
    nextDelta.happiness = (nextDelta.happiness ?? 0) + 2;
  }
  if (action.code === "waste_management") {
    nextDelta.envHealth = (nextDelta.envHealth ?? 0) + 2;
  }

  const nextMetrics = applyDelta(metrics, nextDelta);
  return {
    state: nextState,
    metrics: nextMetrics,
    record: {
      actionType: "infrastructure",
      detail: { code: action.code, tileIndex: action.tileIndex, label: def.label },
      delta: nextDelta,
      cost: def.cost,
    },
  };
}

function applyProjects(
  metrics: SessionMetrics,
  pendingProjects: ProjectOption[],
  decisions: ProjectDecision[],
): { metrics: SessionMetrics; records: TurnDecisionRecord[] } {
  if (pendingProjects.length !== 2) {
    return { metrics, records: [] };
  }

  if (decisions.length !== pendingProjects.length) {
    throw new Error("Each turn requires decisions for both proposals");
  }

  const map = new Map(decisions.map((decision) => [decision.code, decision.decision]));
  let nextMetrics = metrics;
  const records: TurnDecisionRecord[] = [];

  for (const project of pendingProjects) {
    const decision = map.get(project.code);
    if (!decision) {
      throw new Error("Missing proposal decision");
    }

    if (decision === "approve") {
      if (nextMetrics.budget < project.cost) {
        throw new Error(`Insufficient budget to approve ${project.label}`);
      }
      const delta = { ...project.deltas, budget: -project.cost };
      nextMetrics = applyDelta(nextMetrics, delta);
      records.push({
        actionType: "project_approve",
        detail: { code: project.code, label: project.label },
        delta,
        cost: project.cost,
      });
    } else {
      nextMetrics = applyDelta(nextMetrics, project.rejectPenalty);
      records.push({
        actionType: "project_reject",
        detail: { code: project.code, label: project.label },
        delta: project.rejectPenalty,
        cost: 0,
      });
    }
  }

  return { metrics: nextMetrics, records };
}

function applyEvent(metrics: SessionMetrics, event: EventCard | null, responseIndex?: number) {
  if (!event) {
    return { metrics, record: null as TurnDecisionRecord | null };
  }
  if (responseIndex == null || !event.options[responseIndex]) {
    throw new Error("A valid event response is required");
  }

  const option = event.options[responseIndex];
  const delta: MetricsDelta = { ...option.deltas, budget: option.budgetDelta ?? 0 };
  const nextMetrics = applyDelta(metrics, delta);
  return {
    metrics: nextMetrics,
    record: {
      actionType: "event_response",
      detail: { eventCode: event.code, response: option.label, optionIndex: responseIndex },
      delta,
      cost: Math.max(0, -(option.budgetDelta ?? 0)),
    },
  };
}

function deriveLossReason(metrics: SessionMetrics): string | null {
  if (metrics.happiness <= 0) return "city_revolt";
  if (metrics.envHealth <= 0) return "ecological_collapse";
  if (metrics.economy <= 0) return "bankruptcy";
  if (metrics.budget <= 0) return "budget_depleted";
  return null;
}

export function resolveTurn(
  session: SessionRecord,
  actions: TurnAction[],
  projectDecisions: ProjectDecision[],
  eventResponseIndex?: number,
): {
  metrics: SessionMetrics;
  state: SessionState;
  records: TurnDecisionRecord[];
  pendingProjects: ProjectOption[];
  pendingEvent: EventCard | null;
  nextTurn: number;
  status: SessionRecord["status"];
  finalScore: number | null;
  resultTier: string | null;
  lossReason: string | null;
  achievements: string[];
} {
  if (session.status !== "active") {
    throw new Error("This session is no longer active");
  }
  if (actions.length > MAX_ACTIONS_PER_TURN) {
    throw new Error("You can submit at most 3 build actions per turn");
  }

  let state = structuredClone(session.state);
  let metrics = summarizeMetrics(session);
  const records: TurnDecisionRecord[] = [];

  const passive = applyPassiveTurn(metrics);
  metrics = passive.nextMetrics;
  records.push({ actionType: "passive", detail: { turn: session.currentTurn }, delta: passive.delta, cost: 0 });

  for (const action of actions) {
    const resolved = applyAction(state, metrics, action);
    state = resolved.state;
    metrics = resolved.metrics;
    records.push(resolved.record);
  }

  const projects = applyProjects(metrics, session.pendingProjects, projectDecisions);
  metrics = projects.metrics;
  records.push(...projects.records);

  const event = applyEvent(metrics, session.pendingEvent, eventResponseIndex);
  metrics = event.metrics;
  if (event.record) {
    records.push(event.record);
  }

  const lossReason = deriveLossReason(metrics);
  const completed = !lossReason && session.currentTurn >= MAX_TURNS;
  const status = lossReason ? "lost" : completed ? "completed" : "active";
  const finalScore = completed ? calculateScore(metrics, MAX_TURNS) : null;
  const resultTier = finalScore != null ? scoreTier(finalScore) : null;
  const achievements = finalScore != null ? achievementsForScore(finalScore) : [];

  const nextTurn = status === "active" ? session.currentTurn + 1 : session.currentTurn;
  const pendingProjects = status === "active" ? drawProjects(nextTurn + metrics.population) : [];
  const pendingEvent =
    status === "active" ? drawEvent(nextTurn, metrics, metrics.population + metrics.carbonFootprint) : null;

  return {
    metrics,
    state,
    records,
    pendingProjects,
    pendingEvent,
    nextTurn,
    status,
    finalScore,
    resultTier,
    lossReason,
    achievements,
  };
}
