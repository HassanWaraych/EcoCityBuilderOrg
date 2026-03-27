import { Router } from "express";
import { z } from "zod";
import { hashPassword, signToken, verifyPassword } from "../auth.ts";
import { pool } from "../db.ts";

const router = Router();

const registerSchema = z.object({
  username: z.string().trim().min(3).max(50),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid registration payload" });
    return;
  }

  const { username, email, password } = parsed.data;
  const existing = await pool.query<{ player_id: string }>(
    "SELECT player_id FROM players WHERE username=$1 OR email=$2 LIMIT 1",
    [username, email],
  );
  if (existing.rows[0]) {
    res.status(409).json({ error: "Username or email already exists" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const created = await pool.query<{ player_id: string }>(
    `INSERT INTO players (username, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING player_id`,
    [username, email, passwordHash],
  );

  const playerId = created.rows[0].player_id;
  const token = signToken({ playerId, email, username });
  res.status(201).json({
    token,
    player: { playerId, username, email, totalGames: 0, bestScore: 0 },
  });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid login payload" });
    return;
  }

  const { email, password } = parsed.data;
  const result = await pool.query<{
    player_id: string;
    username: string;
    email: string;
    password_hash: string;
    total_games: number;
    best_score: number;
  }>(
    `SELECT player_id, username, email, password_hash, total_games, best_score
     FROM players
     WHERE email=$1
     LIMIT 1`,
    [email],
  );

  const player = result.rows[0];
  if (!player || !(await verifyPassword(password, player.password_hash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({
    playerId: player.player_id,
    email: player.email,
    username: player.username,
  });

  res.json({
    token,
    player: {
      playerId: player.player_id,
      username: player.username,
      email: player.email,
      totalGames: player.total_games,
      bestScore: player.best_score,
    },
  });
});

export default router;
