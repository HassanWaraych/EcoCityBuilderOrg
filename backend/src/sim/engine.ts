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

type BuildRequirement = {
  minPopulation?: number;
  localRadius?: number;
  minNearbyRoads?: number;
  minNearbyBikeLanes?: number;
  minNearbyWaste?: number;
  minNearbyTransit?: number;
  minNearbyWater?: number;
  minNearbyResidential?: number;
  minNearbyCommercial?: number;
  minNearbyIndustrial?: number;
  minNearbyGreenSpace?: number;
  description: string;
};

type ZoneDef = {
  label: string;
  cost: number;
  deltas: MetricsDelta;
  populationCap: number;
  requires?: BuildRequirement;
};

type InfrastructureDef = {
  label: string;
  cost: number;
  deltas: MetricsDelta;
  maxCount?: number;
  requires?: BuildRequirement;
};

type EventDef = {
  code: string;
  title: string;
  description: string;
  eligible: (metrics: SessionMetrics) => boolean;
  options: EventCard["options"];
};

export type Difficulty = "easy" | "normal" | "hard";

type DifficultySettings = {
  startingMetrics: SessionMetrics;
  baseTurnGrant: number;
  taxRate: number;
  eventStartTurn: number;
  eventChance: number;
};

export const MAX_TURNS = 15;
export const MAX_ACTIONS_PER_TURN = 3;

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  easy: {
    startingMetrics: {
      happiness: 62,
      envHealth: 78,
      economy: 60,
      carbonFootprint: 780,
      budget: 165000,
      population: 13000,
    },
    baseTurnGrant: 7000,
    taxRate: 0.0048,
    eventStartTurn: 4,
    eventChance: 0.3,
  },
  normal: {
    startingMetrics: {
      happiness: 55,
      envHealth: 72,
      economy: 55,
      carbonFootprint: 900,
      budget: 135000,
      population: 12000,
    },
    baseTurnGrant: 5500,
    taxRate: 0.0044,
    eventStartTurn: 3,
    eventChance: 0.45,
  },
  hard: {
    startingMetrics: {
      happiness: 48,
      envHealth: 66,
      economy: 49,
      carbonFootprint: 1100,
      budget: 105000,
      population: 11000,
    },
    baseTurnGrant: 4000,
    taxRate: 0.0038,
    eventStartTurn: 2,
    eventChance: 0.6,
  },
};

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
    requires: {
      localRadius: 2,
      minNearbyRoads: 2,
      description: "Needs 2 road tiles within 2 tiles for customer access",
    },
  },
  industrial: {
    label: "Industrial",
    cost: 12000,
    deltas: { happiness: -2, envHealth: -7, economy: 14, carbonFootprint: 110, population: 200 },
    populationCap: 50,
    requires: {
      localRadius: 2,
      minNearbyRoads: 2,
      minNearbyWaste: 1,
      description: "Needs 2 nearby road tiles and 1 nearby waste facility within 2 tiles",
    },
  },
  green_space: {
    label: "Green Space",
    cost: 3500,
    deltas: { happiness: 9, envHealth: 13, economy: 0, carbonFootprint: -70, population: 150 },
    populationCap: 0,
    requires: {
      localRadius: 2,
      minNearbyRoads: 1,
      minNearbyResidential: 1,
      description: "Needs 1 nearby road tile and 1 nearby residential zone within 2 tiles",
    },
  },
  mixed_use: {
    label: "Mixed Use",
    cost: 14000,
    deltas: { happiness: 7, envHealth: -2, economy: 12, carbonFootprint: 35, population: 900 },
    populationCap: 300,
    requires: {
      localRadius: 2,
      minNearbyRoads: 2,
      minNearbyTransit: 1,
      description: "Needs 2 nearby road tiles and 1 nearby transit line within 2 tiles",
    },
  },
  solar_farm: {
    label: "Solar Farm",
    cost: 15000,
    deltas: { happiness: 4, envHealth: 12, economy: 7, carbonFootprint: -260 },
    populationCap: 0,
    requires: {
      localRadius: 2,
      minNearbyRoads: 1,
      description: "Needs 1 nearby road tile within 2 tiles for maintenance access",
    },
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
    requires: {
      localRadius: 2,
      minNearbyRoads: 2,
      minNearbyCommercial: 1,
      description: "Needs 2 nearby road tiles and 1 nearby commercial zone within 2 tiles",
    },
  },
  water_treatment: {
    label: "Water Treatment Plant",
    cost: 13000,
    deltas: { happiness: 7, envHealth: 10, carbonFootprint: 25, population: 500 },
    requires: {
      localRadius: 2,
      minNearbyRoads: 1,
      minPopulation: 25000,
      description: "Needs 1 nearby road tile within 2 tiles and population over 25,000",
    },
  },
  wind_turbine: {
    label: "Wind Turbine",
    cost: 15000,
    deltas: { happiness: 4, envHealth: 14, carbonFootprint: -320 },
    maxCount: 3,
    requires: {
      localRadius: 2,
      minNearbyRoads: 1,
      minNearbyGreenSpace: 1,
      description: "Needs 1 nearby road tile and 1 nearby green space within 2 tiles (max 3 total)",
    },
  },
  waste_management: {
    label: "Waste Management",
    cost: 10000,
    deltas: { happiness: 6, envHealth: 12, carbonFootprint: -120 },
    requires: {
      localRadius: 2,
      minNearbyRoads: 1,
      minNearbyIndustrial: 1,
      description: "Needs 1 nearby road tile and 1 nearby industrial zone within 2 tiles",
    },
  },
  bike_lane: {
    label: "Bike Lane Network",
    cost: 5000,
    deltas: { happiness: 8, envHealth: 5, carbonFootprint: -150, population: 250 },
    requires: {
      localRadius: 1,
      minNearbyRoads: 1,
      description: "Must connect to a road tile within 1 tile",
    },
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
  const gridW = 8;
  const gridH = 8;
  const tiles: Tile[][] = Array.from({ length: gridH }, () =>
    Array.from({ length: gridW }, () => ({ terrain: "plain", zone: null, infrastructure: null })),
  );
  const rocks = [
    [1, 1],
    [2, 6],
    [5, 3],
    [6, 6],
    [6, 2],
  ];
  for (const [row, col] of rocks) {
    tiles[row][col] = { terrain: "rock", zone: null, infrastructure: null };
  }

  return {
    gridW,
    gridH,
    tiles,
    projectMarkers: [],
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

function getDifficultySettings(difficulty: string): DifficultySettings {
  return DIFFICULTY_SETTINGS[(difficulty as Difficulty) in DIFFICULTY_SETTINGS ? (difficulty as Difficulty) : "normal"];
}

export function drawEvent(
  turn: number,
  metrics: SessionMetrics,
  seed: number,
  difficulty: string = "normal",
): EventCard | null {
  const settings = getDifficultySettings(difficulty);
  if (turn < settings.eventStartTurn) return null;

  const roll = (seed % 100) / 100;
  if (roll >= settings.eventChance) return null;

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

export function achievementsForScore(
  score: number,
  metrics: SessionMetrics,
  difficulty: string,
  turnsCompleted: number,
): string[] {
  const earned: string[] = [];

  // Every completed run earns First Victory
  earned.push("first_win");

  // Score-based badges
  if (metrics.envHealth >= 70 && metrics.carbonFootprint <= 3000) earned.push("green_city");
  if (metrics.economy >= 70 && metrics.budget >= 50000) earned.push("budget_master");
  if (metrics.happiness >= 75) earned.push("happy_citizens");
  if (metrics.envHealth >= 80 && metrics.carbonFootprint <= 2000) earned.push("eco_champion");
  if (score >= 70000) earned.push("urban_planner");
  if (difficulty === "hard") earned.push("hard_mode_win");
  if (metrics.carbonFootprint <= 1000) earned.push("carbon_neutral");
  if (score >= 85000) earned.push("infrastructure_king");
  if (metrics.population >= 100000) earned.push("population_boom");
  if (turnsCompleted >= 15) earned.push("survivor");
  if (turnsCompleted <= 10 && score >= 50000) earned.push("speed_builder");

  return earned;
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
    zones: Object.entries(ZONES).map(([code, def]) => ({
      code,
      label: def.label,
      cost: def.cost,
      deltas: def.deltas,
      populationCap: def.populationCap,
      requires: def.requires ?? null,
    })),
    infrastructure: Object.entries(INFRASTRUCTURE).map(([code, def]) => ({
      code,
      label: def.label,
      cost: def.cost,
      deltas: def.deltas,
      maxCount: def.maxCount ?? null,
      requires: def.requires ?? null,
    })),
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

function countNearbyMatches(
  state: SessionState,
  tileIndex: number,
  radius: number,
  predicate: (tile: Tile) => boolean,
): number {
  const target = getTile(state, tileIndex);
  if (!target) return 0;

  let count = 0;
  for (let row = Math.max(0, target.row - radius); row <= Math.min(state.gridH - 1, target.row + radius); row += 1) {
    for (let col = Math.max(0, target.col - radius); col <= Math.min(state.gridW - 1, target.col + radius); col += 1) {
      if (row === target.row && col === target.col) continue;
      if (predicate(state.tiles[row][col])) count += 1;
    }
  }

  return count;
}

function checkBuildRequirements(
  label: string,
  requires: BuildRequirement | undefined,
  state: SessionState,
  metrics: SessionMetrics,
  tileIndex: number,
): void {
  if (!requires) return;

  const radius = requires.localRadius ?? 0;
  const localChecks = [
    {
      needed: requires.minNearbyRoads,
      noun: "road tile",
      count: countNearbyMatches(state, tileIndex, radius, (tile) => tile.infrastructure === "road_network"),
    },
    {
      needed: requires.minNearbyBikeLanes,
      noun: "bike lane",
      count: countNearbyMatches(state, tileIndex, radius, (tile) => tile.infrastructure === "bike_lane"),
    },
    {
      needed: requires.minNearbyWaste,
      noun: "waste management facility",
      count: countNearbyMatches(state, tileIndex, radius, (tile) => tile.infrastructure === "waste_management"),
    },
    {
      needed: requires.minNearbyTransit,
      noun: "public transit line",
      count: countNearbyMatches(state, tileIndex, radius, (tile) => tile.infrastructure === "public_transit"),
    },
    {
      needed: requires.minNearbyWater,
      noun: "water treatment plant",
      count: countNearbyMatches(state, tileIndex, radius, (tile) => tile.infrastructure === "water_treatment"),
    },
    {
      needed: requires.minNearbyResidential,
      noun: "residential zone",
      count: countNearbyMatches(state, tileIndex, radius, (tile) => tile.zone === "residential"),
    },
    {
      needed: requires.minNearbyCommercial,
      noun: "commercial zone",
      count: countNearbyMatches(state, tileIndex, radius, (tile) => tile.zone === "commercial"),
    },
    {
      needed: requires.minNearbyIndustrial,
      noun: "industrial zone",
      count: countNearbyMatches(state, tileIndex, radius, (tile) => tile.zone === "industrial"),
    },
    {
      needed: requires.minNearbyGreenSpace,
      noun: "green space",
      count: countNearbyMatches(state, tileIndex, radius, (tile) => tile.zone === "green_space"),
    },
  ];

  for (const check of localChecks) {
    if (!check.needed) continue;
    if (check.count < check.needed) {
      throw new Error(
        label + " needs " + check.needed + " nearby " + check.noun + (check.needed > 1 ? "s" : "") +
        " within " + radius + " tile" + (radius === 1 ? "" : "s") +
        " of this location (found " + check.count + ")",
      );
    }
  }
  if (requires.minPopulation && metrics.population < requires.minPopulation) {
    throw new Error(
      label + " unlocks once population exceeds " + requires.minPopulation.toLocaleString() +
      " (currently " + metrics.population.toLocaleString() + ")"
    );
  }
}

function applyPassiveTurn(
  metrics: SessionMetrics,
  difficulty: string,
): { nextMetrics: SessionMetrics; delta: MetricsDelta } {
  const settings = getDifficultySettings(difficulty);
  const delta: MetricsDelta = {};

  const taxIncome = Math.floor(metrics.population * settings.taxRate);
  delta.budget = (delta.budget ?? 0) + settings.baseTurnGrant + taxIncome;

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
    checkBuildRequirements(def.label, def.requires, state, metrics, action.tileIndex);
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
  checkBuildRequirements(def.label, def.requires, state, metrics, action.tileIndex);
  if (def.maxCount && state.windTurbinesBuilt >= def.maxCount && action.code === "wind_turbine") {
    throw new Error("Wind turbine cap reached (max 3)");
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

function validateProjectPlacement(state: SessionState, tileIndex: number, label: string): void {
  const target = getTile(state, tileIndex);
  if (!target) {
    throw new Error(`Select an empty tile for ${label}`);
  }
  if (target.tile.terrain === "rock") {
    throw new Error(`Select an empty tile for ${label}`);
  }
  if (target.tile.zone || target.tile.infrastructure) {
    throw new Error(`Select an empty tile for ${label}`);
  }
  if (state.projectMarkers.some((marker) => marker.tileIndex === tileIndex)) {
    throw new Error(`Select an empty tile for ${label}`);
  }
}

function applyProjects(
  state: SessionState,
  metrics: SessionMetrics,
  pendingProjects: ProjectOption[],
  decisions: ProjectDecision[],
  turnNumber: number,
): { state: SessionState; metrics: SessionMetrics; records: TurnDecisionRecord[] } {
  if (pendingProjects.length !== 2) {
    return { state, metrics, records: [] };
  }

  if (decisions.length !== pendingProjects.length) {
    throw new Error("Each turn requires decisions for both proposals");
  }

  const map = new Map(decisions.map((decision) => [decision.code, decision]));
  const nextState: SessionState = structuredClone(state);
  let nextMetrics = metrics;
  const records: TurnDecisionRecord[] = [];

  for (const project of pendingProjects) {
    const decision = map.get(project.code);
    if (!decision) {
      throw new Error("Missing proposal decision");
    }

    if (decision.decision === "approve") {
      if (nextMetrics.budget < project.cost) {
        throw new Error(`Insufficient budget to approve ${project.label}`);
      }
      if (decision.tileIndex == null) {
        throw new Error(`Select an empty tile for ${project.label}`);
      }
      validateProjectPlacement(nextState, decision.tileIndex, project.label);
      nextState.projectMarkers.push({ code: project.code, status: "approve", tileIndex: decision.tileIndex, turnNumber });
      const delta = { ...project.deltas, budget: -project.cost };
      nextMetrics = applyDelta(nextMetrics, delta);
      records.push({
        actionType: "project_approve",
        detail: { code: project.code, label: project.label, tileIndex: decision.tileIndex },
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

  return { state: nextState, metrics: nextMetrics, records };
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

  const passive = applyPassiveTurn(metrics, session.difficulty);
  metrics = passive.nextMetrics;
  records.push({ actionType: "passive", detail: { turn: session.currentTurn }, delta: passive.delta, cost: 0 });

  for (const action of actions) {
    const resolved = applyAction(state, metrics, action);
    state = resolved.state;
    metrics = resolved.metrics;
    records.push(resolved.record);
  }

  const projects = applyProjects(state, metrics, session.pendingProjects, projectDecisions, session.currentTurn);
  state = projects.state;
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
  const achievements = finalScore != null ? achievementsForScore(finalScore, metrics, session.difficulty, session.currentTurn) : [];

  const nextTurn = status === "active" ? session.currentTurn + 1 : session.currentTurn;
  const pendingProjects = status === "active" ? drawProjects(nextTurn + metrics.population) : [];
  const pendingEvent =
    status === "active"
      ? drawEvent(nextTurn, metrics, metrics.population + metrics.carbonFootprint, session.difficulty)
      : null;

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
