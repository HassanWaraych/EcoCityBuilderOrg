import type { CityState, Metrics, MetricsDelta, ValidationResult } from "../types/index.ts";

type ActionCode =
  | "build_housing"
  | "plant_trees"
  | "upgrade_transit"
  | "approve_factory"
  | "skip_turn"
  | "delete_tile";

type ActionDef = {
  label: string;
  cost: number;
  delta: MetricsDelta;
  requiresTile?: boolean;
  applyTile?: { zone?: string; building?: string };
};

const ACTIONS: Record<ActionCode, ActionDef> = {
  build_housing: {
    label: "Build Housing",
    cost: 15,
    delta: { happiness: 6, econStability: 4, envHealth: -2, carbon: 3 },
    requiresTile: true,
    applyTile: { zone: "residential", building: "housing" },
  },
  plant_trees: {
    label: "Plant Trees",
    cost: 8,
    delta: { happiness: 1, envHealth: 6, econStability: -1, carbon: -5 },
    requiresTile: true,
    applyTile: { zone: "green", building: "park" },
  },
  upgrade_transit: {
    label: "Upgrade Transit",
    cost: 12,
    delta: { happiness: 3, envHealth: 4, econStability: -1, carbon: -4 },
    requiresTile: true,
    applyTile: { zone: "infrastructure", building: "transit_hub" },
  },
  approve_factory: {
    label: "Approve Factory",
    cost: 18,
    delta: { happiness: -2, envHealth: -6, econStability: 8, carbon: 6 },
    requiresTile: true,
    applyTile: { zone: "industrial", building: "factory" },
  },
  skip_turn: {
    label: "Skip Turn",
    cost: 0,
    delta: {},
  },
  delete_tile: {
    label: "Clear Tile",
    cost: 0,
    delta: {},
    requiresTile: true,
  },
};

export function clampMetrics(metrics: Metrics): Metrics {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  return {
    happiness: clamp(metrics.happiness),
    envHealth: clamp(metrics.envHealth),
    econStability: clamp(metrics.econStability),
    carbon: clamp(metrics.carbon),
  };
}

function applyDelta(base: Metrics, delta: MetricsDelta): Metrics {
  return {
    happiness: base.happiness + (delta.happiness ?? 0),
    envHealth: base.envHealth + (delta.envHealth ?? 0),
    econStability: base.econStability + (delta.econStability ?? 0),
    carbon: base.carbon + (delta.carbon ?? 0),
  };
}

export function applyAction(
  state: CityState,
  budget: number,
  action: string,
  payload: Record<string, unknown>,
): ValidationResult<{
  state: CityState;
  metricsDelta: MetricsDelta;
  budget: number;
  cost: number;
}> {
  const def = ACTIONS[action as ActionCode];
  if (!def) return { ok: false, message: "Unknown action" };

  if (budget < def.cost) {
    return { ok: false, message: "Insufficient budget" };
  }

  // Tile targeting
  if (def.requiresTile) {
    const tileIndex = payload?.tileIndex;
    if (typeof tileIndex !== "number") {
      return { ok: false, message: "Select a tile first" };
    }
    const tileCount = state.gridW * state.gridH;
    if (tileIndex < 0 || tileIndex >= tileCount) {
      return { ok: false, message: "Invalid tile" };
    }
    const row = Math.floor(tileIndex / state.gridW);
    const col = tileIndex % state.gridW;
    const tile = state.tiles[row][col];
    if (tile.zone !== "empty") {
      // For delete action we handle below; for others block
      if (action === "delete_tile") {
        if (tile.zone === "rock") return { ok: false, message: "Cannot clear a rock tile" };
      } else {
        return { ok: false, message: "Tile unavailable" };
      }
    }
  }

  // Special handling for delete_tile
  if (action === "delete_tile") {
    const tileIndex = payload?.tileIndex as number;
    const row = Math.floor(tileIndex / state.gridW);
    const col = tileIndex % state.gridW;
    const tile = state.tiles[row][col];
    if (tile.zone === "empty") return { ok: false, message: "Nothing to clear" };
    const refundMap: Record<string, number> = {
      housing: 7,
      park: 4,
      transit_hub: 6,
      factory: 9,
    };
    const refund = refundMap[tile.building] ?? 0;
    const nextState: CityState = structuredClone(state);
    nextState.tiles[row][col] = { zone: "empty", building: "", floodplain: false };
    return {
      ok: true,
      data: {
        state: nextState,
        metricsDelta: {},
        budget: budget + refund,
        cost: -refund,
      },
    };
  }

  const nextBudget = budget - def.cost;
  const nextMetrics = clampMetrics(applyDelta(state.metrics, def.delta));

  // Copy state shallowly and mutate tile if needed
  const nextState: CityState = structuredClone(state);
  nextState.metrics = nextMetrics;

  if (def.requiresTile && def.applyTile) {
    const tileIndex = payload?.tileIndex as number;
    const row = Math.floor(tileIndex / state.gridW);
    const col = tileIndex % state.gridW;
    nextState.tiles[row][col] = {
      ...nextState.tiles[row][col],
      zone: def.applyTile.zone ?? nextState.tiles[row][col].zone,
      building: def.applyTile.building ?? nextState.tiles[row][col].building,
    };
  }

  return {
    ok: true,
    data: {
      state: nextState,
      metricsDelta: def.delta,
      budget: nextBudget,
      cost: def.cost,
    },
  };
}

export function listActions(): {
  code: ActionCode;
  label: string;
  cost: number;
  delta: MetricsDelta;
  requiresTile?: boolean;
}[] {
  return Object.entries(ACTIONS).map(([code, def]) => ({
    code: code as ActionCode,
    label: def.label,
    cost: def.cost,
    delta: def.delta,
    requiresTile: def.requiresTile,
  }));
}
