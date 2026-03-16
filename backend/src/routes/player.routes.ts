import { Router } from "express";
import { requireAuth } from "../auth.ts";
import { pool } from "../db.ts";

const router = Router();

router.use(requireAuth);

router.get("/:id/profile", async (req, res) => {
  if (req.params.id !== req.auth!.playerId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const playerResult = await pool.query(
    `SELECT player_id, username, email, total_games, best_score
     FROM players
     WHERE player_id=$1`,
    [req.params.id],
  );
  const achievementResult = await pool.query(
    `SELECT achievement_type, earned_at
     FROM achievements
     WHERE player_id=$1
     ORDER BY earned_at DESC`,
    [req.params.id],
  );

  if (!playerResult.rows[0]) {
    res.status(404).json({ error: "Player not found" });
    return;
  }

  const row = playerResult.rows[0];
  res.json({
    profile: {
      playerId: row.player_id,
      username: row.username,
      email: row.email,
      totalGames: row.total_games,
      bestScore: row.best_score,
      achievements: achievementResult.rows.map((entry) => ({
        code: entry.achievement_type,
        earnedAt: entry.earned_at,
      })),
    },
  });
});

router.get("/:id/scores", async (req, res) => {
  if (req.params.id !== req.auth!.playerId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const result = await pool.query(
    `SELECT session_id, city_name, difficulty, status, final_score, result_tier, completed_at, current_turn
     FROM game_sessions
     WHERE player_id=$1
     ORDER BY started_at DESC`,
    [req.params.id],
  );

  res.json({
    scores: result.rows.map((row) => ({
      sessionId: row.session_id,
      cityName: row.city_name,
      difficulty: row.difficulty,
      status: row.status,
      finalScore: row.final_score,
      resultTier: row.result_tier,
      completedAt: row.completed_at,
      currentTurn: row.current_turn,
    })),
  });
});

export default router;
