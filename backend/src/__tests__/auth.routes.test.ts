import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import express from "express";
import request from "supertest";
import { hashPassword } from "../auth.ts";

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock("../db.ts", () => ({
  pool: { query: mockQuery },
}));

const { default: authRoutes } = await import("../routes/auth.routes.ts");

const app = express();
app.use(express.json());
app.use("/api/v1/auth", authRoutes);

let validHash: string;

beforeAll(async () => {
  validHash = await hashPassword("password123");
});

beforeEach(() => {
  vi.clearAllMocks();
});

/* ------------------------------------------------------------------ */
/*  POST /register                                                     */
/* ------------------------------------------------------------------ */
describe("POST /api/v1/auth/register", () => {
  it("registers a new player and returns token + player", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ player_id: "new-player-uuid" }] });

    const res = await request(app).post("/api/v1/auth/register").send({
      username: "newplayer",
      email: "new@test.com",
      password: "securePass1",
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.player.playerId).toBe("new-player-uuid");
    expect(res.body.player.username).toBe("newplayer");
  });

  it("returns 400 for invalid payload", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      username: "ab",
      email: "not-an-email",
      password: "short",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid registration payload");
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      username: "player",
    });

    expect(res.status).toBe(400);
  });

  it("returns 409 when username or email already exists", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ player_id: "existing-id" }] });

    const res = await request(app).post("/api/v1/auth/register").send({
      username: "existinguser",
      email: "existing@test.com",
      password: "securePass1",
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Username or email already exists");
  });
});

/* ------------------------------------------------------------------ */
/*  POST /login                                                        */
/* ------------------------------------------------------------------ */
describe("POST /api/v1/auth/login", () => {
  it("logs in with valid credentials and returns token + player", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          player_id: "player-uuid",
          username: "testuser",
          email: "test@test.com",
          password_hash: validHash,
          total_games: 5,
          best_score: 80000,
        },
      ],
    });

    const res = await request(app).post("/api/v1/auth/login").send({
      email: "test@test.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.player.playerId).toBe("player-uuid");
    expect(res.body.player.totalGames).toBe(5);
  });

  it("returns 401 for wrong password", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          player_id: "player-uuid",
          username: "testuser",
          email: "test@test.com",
          password_hash: validHash,
          total_games: 0,
          best_score: 0,
        },
      ],
    });

    const res = await request(app).post("/api/v1/auth/login").send({
      email: "test@test.com",
      password: "wrongPassword",
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  it("returns 401 for non-existent email", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post("/api/v1/auth/login").send({
      email: "nobody@test.com",
      password: "password123",
    });

    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid login payload", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "not-valid",
      password: "short",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid login payload");
  });
});
