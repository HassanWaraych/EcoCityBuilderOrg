import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth.ts";
import { pool } from "../db.ts";
import {
  DIFFICULTY_SETTINGS,
  MAX_TURNS,
  buildInitialState,
  drawEvent,
  drawProjects,
  listCatalog,
  resolveTurn,
} from "../sim/engine.ts";
import type { SessionRecord } from "../types/index.ts";

const router = Router();

router.use(requireAuth);

const createSessionSchema = z.object({
  cityName: z.string().trim().min(2).max(100),
  difficulty: z.enum(["easy", "normal", "hard"]).default("normal"),
});

const turnSchema = z.object({
  actions: z
    .array(
      z.object({
        category: z.enum(["zone", "infrastructure"]),
        code: z.string().min(1),
        tileIndex: z.number().int().min(0),
      }),
    )
    .max(3),
  projectDecisions: z.array(
    z.object({
      code: z.string().min(1),
      decision: z.enum(["approve", "reject"]),
    }),
  ),
  eventResponseIndex: z.number().int().min(0).optional(),
});

function mapSessionRow(row: Record<string, unknown>): SessionRecord {
  return {
    sessionId: row.session_id as string,
    playerId: row.player_id as string,
    cityName: row.city_name as string,
    difficulty: row.difficulty as string,
    currentTurn: Number(row.current_turn),
    status: row.status as SessionRecord["status"],
    happiness: Number(row.happiness),
    envHealth: Number(row.env_health),
    economy: Number(row.economy),
    carbonFootprint: Number(row.carbon_footprint),
    budget: Number(row.budget),
    population: Number(row.population),
    finalScore: row.final_score == null ? null : Number(row.final_score),
    resultTier: (row.result_tier as string | null) ?? null,
    lossReason: (row.loss_reason as string | null) ?? null,
    state: row.state_json as SessionRecord["state"],
    pendingProjects: (row.pending_projects as SessionRecord["pendingProjects"]) ?? [],
    pendingEvent: (row.pending_event as SessionRecord["pendingEvent"]) ?? null,
    startedAt: String(row.started_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
  };
}

async function loadOwnedSession(sessionId: string, playerId: string, forUpdate = false) {
  const suffix = forUpdate ? " FOR UPDATE" : "";
  const result = await pool.query(
    `SELECT *
     FROM game_sessions
     WHERE session_id=$1 AND player_id=$2${suffix}`,
    [sessionId, playerId],
  );
  return result.rows[0] ? mapSessionRow(result.rows[0]) : null;
}

router.get("/catalog", (_req, res) => {
  res.json(listCatalog());
});

router.get("/sessions", async (req, res) => {
  const result = await pool.query(
    `SELECT session_id, city_name, difficulty, current_turn, status, final_score, result_tier, started_at
     FROM game_sessions
     WHERE player_id=$1
     ORDER BY started_at DESC`,
    [req.auth!.playerId],
  );
  res.json({
    sessions: result.rows.map((row) => ({
      sessionId: row.session_id,
      cityName: row.city_name,
      difficulty: row.difficulty,
      currentTurn: row.current_turn,
      status: row.status,
      finalScore: row.final_score,
      resultTier: row.result_tier,
      startedAt: row.started_at,
    })),
  });
});

router.post("/sessions", async (req, res) => {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid session payload" });
    return;
  }

  const state = buildInitialState();
  const settings = DIFFICULTY_SETTINGS[parsed.data.difficulty];
  const startingMetrics = settings.startingMetrics;
  const pendingProjects = drawProjects(Date.now());
  const pendingEvent = drawEvent(
    1,
    startingMetrics,
    Date.now(),
    parsed.data.difficulty,
  );

  const created = await pool.query(
    `INSERT INTO game_sessions (
      player_id, city_name, difficulty, current_turn, status,
      happiness, env_health, economy, carbon_footprint, budget, population,
      state_json, pending_projects, pending_event
    ) VALUES (
      $1, $2, $3, 1, 'active',
      $4, $5, $6, $7, $8, $9,
      $10, $11, $12
    )
    RETURNING *`,
    [
      req.auth!.playerId,
      parsed.data.cityName,
      parsed.data.difficulty,
      startingMetrics.happiness,
      startingMetrics.envHealth,
      startingMetrics.economy,
      startingMetrics.carbonFootprint,
      startingMetrics.budget,
      startingMetrics.population,
      JSON.stringify(state),
      JSON.stringify(pendingProjects),
      pendingEvent ? JSON.stringify(pendingEvent) : null,
    ],
  );

  res.status(201).json({ session: mapSessionRow(created.rows[0]) });
});

router.get("/sessions/:id", async (req, res) => {
  const session = await loadOwnedSession(req.params.id, req.auth!.playerId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json({ session });
});

router.post("/sessions/:id/turn", async (req, res) => {
  const parsed = turnSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid turn payload" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sessionResult = await client.query(
      "SELECT * FROM game_sessions WHERE session_id=$1 AND player_id=$2 FOR UPDATE",
      [req.params.id, req.auth!.playerId],
    );
    if (!sessionResult.rows[0]) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const session = mapSessionRow(sessionResult.rows[0]);
    const resolved = resolveTurn(
      session,
      parsed.data.actions,
      parsed.data.projectDecisions,
      parsed.data.eventResponseIndex,
    );
    const completedAt = resolved.status === "active" ? null : new Date().toISOString();

    await client.query(
      `UPDATE game_sessions
       SET current_turn=$1,
           status=$2,
           happiness=$3,
           env_health=$4,
           economy=$5,
           carbon_footprint=$6,
           budget=$7,
           population=$8,
           final_score=$9,
           result_tier=$10,
           loss_reason=$11,
           state_json=$12,
           pending_projects=$13,
           pending_event=$14,
           completed_at=$15
       WHERE session_id=$16`,
      [
        resolved.nextTurn,
        resolved.status,
        resolved.metrics.happiness,
        resolved.metrics.envHealth,
        resolved.metrics.economy,
        resolved.metrics.carbonFootprint,
        resolved.metrics.budget,
        resolved.metrics.population,
        resolved.finalScore,
        resolved.resultTier,
        resolved.lossReason,
        JSON.stringify(resolved.state),
        JSON.stringify(resolved.pendingProjects),
        resolved.pendingEvent ? JSON.stringify(resolved.pendingEvent) : null,
        completedAt,
        session.sessionId,
      ],
    );

    for (const record of resolved.records) {
      await client.query(
        `INSERT INTO decisions (
          session_id, turn_number, action_type, action_detail,
          delta_happiness, delta_env, delta_economy, delta_carbon, cost
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          session.sessionId,
          session.currentTurn,
          record.actionType,
          JSON.stringify(record.detail),
          record.delta.happiness ?? 0,
          record.delta.envHealth ?? 0,
          record.delta.economy ?? 0,
          record.delta.carbonFootprint ?? 0,
          record.cost,
        ],
      );
    }

    if (resolved.finalScore != null) {
      await client.query(
        `UPDATE players
         SET total_games = total_games + 1,
             best_score = GREATEST(best_score, $1)
         WHERE player_id=$2`,
        [resolved.finalScore, req.auth!.playerId],
      );

      for (const achievement of resolved.achievements) {
        await client.query(
          `INSERT INTO achievements (player_id, session_id, achievement_type)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [req.auth!.playerId, session.sessionId, achievement],
        );
      }
    } else if (resolved.status === "lost") {
      await client.query(
        `UPDATE players
         SET total_games = total_games + 1
         WHERE player_id=$1`,
        [req.auth!.playerId],
      );
    }

    const updatedResult = await client.query("SELECT * FROM game_sessions WHERE session_id=$1", [session.sessionId]);
    await client.query("COMMIT");

    res.json({
      session: mapSessionRow(updatedResult.rows[0]),
      maxTurns: MAX_TURNS,
      records: resolved.records,
      achievements: resolved.achievements,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: error instanceof Error ? error.message : "Turn resolution failed" });
  } finally {
    client.release();
  }
});

router.get("/sessions/:id/history", async (req, res) => {
  const session = await loadOwnedSession(req.params.id, req.auth!.playerId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const result = await pool.query(
    `SELECT decision_id, turn_number, action_type, action_detail,
            delta_happiness, delta_env, delta_economy, delta_carbon, cost, created_at
     FROM decisions
     WHERE session_id=$1
     ORDER BY created_at ASC`,
    [req.params.id],
  );

  res.json({
    history: result.rows.map((row) => ({
      decisionId: row.decision_id,
      turnNumber: row.turn_number,
      actionType: row.action_type,
      actionDetail: row.action_detail,
      deltas: {
        happiness: row.delta_happiness,
        envHealth: row.delta_env,
        economy: row.delta_economy,
        carbonFootprint: row.delta_carbon,
      },
      cost: row.cost,
      createdAt: row.created_at,
    })),
  });
});

export default router;
