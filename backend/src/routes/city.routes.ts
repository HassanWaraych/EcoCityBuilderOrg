import { Router } from "express";
import { randomUUID } from "crypto";
import { pool } from "../db.ts";
import type {
  CityState,
  Metrics,
  MetricsDelta,
  TakeActionBody,
  ValidationResult,
} from "../types/index.ts";
import { applyAction, clampMetrics, listActions } from "../sim/engine.ts";

const router = Router();

const DEMO_EMAIL = "demo@ecocity.local";

async function getOrCreateDemoPlayer(): Promise<string> {
  const existing = await pool.query<{ id: string }>(
    "SELECT id FROM players WHERE email=$1 LIMIT 1",
    [DEMO_EMAIL],
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const insert = await pool.query<{ id: string }>(
    `INSERT INTO players (email, password_hash, display_name)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [DEMO_EMAIL, "demo", "Demo Player"],
  );
  return insert.rows[0].id;
}

function initialMetrics(): Metrics {
  return { happiness: 55, envHealth: 55, econStability: 55, carbon: 45 };
}

function initialState(): CityState {
  const gridW = 8;
  const gridH = 8;
  const tiles = Array.from({ length: gridH }, () =>
    Array.from({ length: gridW }, () => ({ zone: "empty", building: "", floodplain: false })),
  );

  // Scatter rocks (non-buildable)
  const rockSpots = [
    [1, 1],
    [2, gridW - 2],
    [gridH - 2, 2],
    [gridH - 2, gridW - 2],
  ];
  for (const [r, c] of rockSpots) {
    tiles[r][c] = { zone: "rock", building: "rock", floodplain: false };
  }

  return {
    geography: "temperate",
    gridW,
    gridH,
    tiles,
    metrics: initialMetrics(),
    activePolicies: [],
    lastEventTurn: 0,
  };
}

router.post("/city", async (req, res) => {
  const playerId = await getOrCreateDemoPlayer();
  const name = (req.body?.name as string) || "New City";
  const difficulty = (req.body?.difficulty as string) || "normal";
  const seed = Number(req.body?.seed ?? Date.now());

  const state = initialState();
  const budget = 100;

  const result = await pool.query<{ id: string }>(
    `INSERT INTO cities (player_id, name, difficulty, seed, turn, budget, state_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [playerId, name, difficulty, seed, 0, budget, state],
  );

  const cityId = result.rows[0].id;
  res.status(201).json({ id: cityId, name, difficulty, seed, turn: 0, budget, state });
});

router.get("/actions", (_req, res) => {
  res.json({ actions: listActions() });
});

router.get("/city/:id", async (req, res) => {
  const id = req.params.id;
  const city = await pool.query(
    "SELECT id, name, difficulty, seed, turn, budget, state_json FROM cities WHERE id=$1",
    [id],
  );
  if (!city.rows[0]) return res.status(404).json({ error: "City not found" });
  const row = city.rows[0];
  res.json({
    id: row.id,
    name: row.name,
    difficulty: row.difficulty,
    seed: row.seed,
    turn: row.turn,
    budget: row.budget,
    state: row.state_json as CityState,
  });
});

router.post("/city/:id/action", async (req, res) => {
  const cityId = req.params.id;
  const body = req.body as TakeActionBody;
  const action = body.kind;

  if (!action) return res.status(400).json({ error: "kind is required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const city = await client.query(
      "SELECT id, turn, budget, state_json FROM cities WHERE id=$1 FOR UPDATE",
      [cityId],
    );
    if (!city.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "City not found" });
    }

    const { turn, budget, state_json } = city.rows[0];
    const state = state_json as CityState;
    const result: ValidationResult<{
      state: CityState;
      metricsDelta: MetricsDelta;
      budget: number;
      cost: number;
    }> = applyAction(state, budget, action, body.payload ?? {});

    if (!result.ok) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: result.message });
    }

    const nextTurn = turn + 1;
    const updatedState = { ...result.data.state };
    updatedState.metrics = clampMetrics(updatedState.metrics);

    await client.query(
      `UPDATE cities
       SET turn=$1, budget=$2, state_json=$3, updated_at=now()
       WHERE id=$4`,
      [nextTurn, result.data.budget, updatedState, cityId],
    );

    await client.query(
      `INSERT INTO decisions (city_id, turn, kind, payload, delta)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        cityId,
        nextTurn,
        action,
        body.payload ?? {},
        { metrics: result.data.metricsDelta, budget: -result.data.cost },
      ],
    );

    await client.query("COMMIT");
    return res.json({
      id: cityId,
      turn: nextTurn,
      budget: result.data.budget,
      state: updatedState,
      metrics: updatedState.metrics,
      metricsDelta: result.data.metricsDelta,
      budgetDelta: result.data.budget - budget,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ error: "Unexpected error" });
  } finally {
    client.release();
  }
});

export default router;
