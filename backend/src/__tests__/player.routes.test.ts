import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { signToken } from "../auth.ts";

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock("../db.ts", () => ({
  pool: { query: mockQuery },
}));

const { default: playerRoutes } = await import("../routes/player.routes.ts");

const app = express();
app.use(express.json());
app.use("/api/v1/players", playerRoutes);

const testAuth = { playerId: "player-1", email: "test@test.com", username: "testuser" };
const testToken = signToken(testAuth);

beforeEach(() => {
  vi.clearAllMocks();
});

/* ------------------------------------------------------------------ */
/*  GET /players/:id/profile                                           */
/* ------------------------------------------------------------------ */
describe("GET /api/v1/players/:id/profile", () => {
  it("returns the player profile with achievements", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            player_id: "player-1",
            username: "testuser",
            email: "test@test.com",
            total_games: 3,
            best_score: 90000,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { achievement_type: "green_city", earned_at: "2026-03-10T00:00:00Z" },
          { achievement_type: "eco_conscious", earned_at: "2026-03-08T00:00:00Z" },
        ],
      });

    const res = await request(app)
      .get("/api/v1/players/player-1/profile")
      .set("Authorization", `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.profile.username).toBe("testuser");
    expect(res.body.profile.totalGames).toBe(3);
    expect(res.body.profile.bestScore).toBe(90000);
    expect(res.body.profile.achievements).toHaveLength(2);
    expect(res.body.profile.achievements[0].code).toBe("green_city");
  });

  it("returns 403 when requesting another player's profile", async () => {
    const res = await request(app)
      .get("/api/v1/players/other-player-id/profile")
      .set("Authorization", `Bearer ${testToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Forbidden");
  });

  it("returns 404 when player does not exist", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/v1/players/player-1/profile")
      .set("Authorization", `Bearer ${testToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Player not found");
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app).get("/api/v1/players/player-1/profile");
    expect(res.status).toBe(401);
  });
});

/* ------------------------------------------------------------------ */
/*  GET /players/:id/scores                                            */
/* ------------------------------------------------------------------ */
describe("GET /api/v1/players/:id/scores", () => {
  it("returns score history for the authenticated player", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          session_id: "s-1",
          city_name: "GreenVille",
          difficulty: "normal",
          status: "completed",
          final_score: 85000,
          result_tier: "A - Sustainable City",
          completed_at: "2026-03-15T00:00:00Z",
          current_turn: 15,
        },
        {
          session_id: "s-2",
          city_name: "LostTown",
          difficulty: "hard",
          status: "lost",
          final_score: null,
          result_tier: null,
          completed_at: null,
          current_turn: 8,
        },
      ],
    });

    const res = await request(app)
      .get("/api/v1/players/player-1/scores")
      .set("Authorization", `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.scores).toHaveLength(2);
    expect(res.body.scores[0].finalScore).toBe(85000);
    expect(res.body.scores[1].status).toBe("lost");
  });

  it("returns 403 when requesting another player's scores", async () => {
    const res = await request(app)
      .get("/api/v1/players/other-player-id/scores")
      .set("Authorization", `Bearer ${testToken}`);

    expect(res.status).toBe(403);
  });

  it("returns empty array if no games played", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/v1/players/player-1/scores")
      .set("Authorization", `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.scores).toEqual([]);
  });
});
