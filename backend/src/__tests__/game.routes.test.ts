import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { signToken } from "../auth.ts";
import { buildInitialState, ZONES, INFRASTRUCTURE, PROJECTS } from "../sim/engine.ts";

const { mockQuery, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockConnect: vi.fn(),
}));

vi.mock("../db.ts", () => ({
  pool: { query: mockQuery, connect: mockConnect },
}));

const { default: gameRoutes } = await import("../routes/game.routes.ts");

const app = express();
app.use(express.json());
app.use("/api/v1/game", gameRoutes);

const testAuth = { playerId: "test-player-id", email: "test@test.com", username: "testuser" };
const testToken = signToken(testAuth);

function sessionRow(overrides: Record<string, unknown> = {}) {
  return {
    session_id: "sess-1",
    player_id: "test-player-id",
    city_name: "TestVille",
    difficulty: "normal",
    current_turn: 1,
    status: "active",
    happiness: 55,
    env_health: 72,
    economy: 55,
    carbon_footprint: 900,
    budget: 160000,
    population: 12000,
    final_score: null,
    result_tier: null,
    loss_reason: null,
    state_json: buildInitialState(),
    pending_projects: [],
    pending_event: null,
    started_at: new Date().toISOString(),
    completed_at: null,
    ...overrides,
  };
}

let mockClient: { query: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.clearAllMocks();
  mockClient = { query: vi.fn(), release: vi.fn() };
  mockConnect.mockResolvedValue(mockClient);
});

/* ------------------------------------------------------------------ */
/*  Authentication guard                                               */
/* ------------------------------------------------------------------ */
describe("authentication guard", () => {
  it("returns 401 for requests without Authorization header", async () => {
    const res = await request(app).get("/api/v1/game/catalog");
    expect(res.status).toBe(401);
  });

  it("returns 401 for requests with invalid token", async () => {
    const res = await request(app)
      .get("/api/v1/game/catalog")
      .set("Authorization", "Bearer bad.token.here");
    expect(res.status).toBe(401);
  });
});

/* ------------------------------------------------------------------ */
/*  GET /catalog                                                       */
/* ------------------------------------------------------------------ */
describe("GET /api/v1/game/catalog", () => {
  it("returns zones, infrastructure, and projects", async () => {
    const res = await request(app)
      .get("/api/v1/game/catalog")
      .set("Authorization", `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.zones).toBeDefined();
    expect(res.body.infrastructure).toBeDefined();
    expect(res.body.projects).toBeDefined();
    expect(res.body.zones.length).toBe(Object.keys(ZONES).length);
    expect(res.body.infrastructure.length).toBe(Object.keys(INFRASTRUCTURE).length);
    expect(res.body.projects.length).toBe(PROJECTS.length);
  });
});

/* ------------------------------------------------------------------ */
/*  POST /sessions                                                     */
/* ------------------------------------------------------------------ */
describe("POST /api/v1/game/sessions", () => {
  it("creates a new game session", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [sessionRow()] });

    const res = await request(app)
      .post("/api/v1/game/sessions")
      .set("Authorization", `Bearer ${testToken}`)
      .send({ cityName: "TestVille", difficulty: "normal" });

    expect(res.status).toBe(201);
    expect(res.body.session).toBeDefined();
    expect(res.body.session.cityName).toBe("TestVille");
    expect(res.body.session.status).toBe("active");
    expect(res.body.session.currentTurn).toBe(1);
  });

  it("returns 400 for invalid session payload", async () => {
    const res = await request(app)
      .post("/api/v1/game/sessions")
      .set("Authorization", `Bearer ${testToken}`)
      .send({ cityName: "A" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid session payload");
  });

  it("defaults difficulty to normal if not provided", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [sessionRow()] });

    const res = await request(app)
      .post("/api/v1/game/sessions")
      .set("Authorization", `Bearer ${testToken}`)
      .send({ cityName: "DefaultCity" });

    expect(res.status).toBe(201);
  });
});

/* ------------------------------------------------------------------ */
/*  GET /sessions                                                      */
/* ------------------------------------------------------------------ */
describe("GET /api/v1/game/sessions", () => {
  it("lists all sessions for the authenticated player", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          session_id: "s-1",
          city_name: "City A",
          difficulty: "normal",
          current_turn: 5,
          status: "active",
          final_score: null,
          result_tier: null,
          started_at: new Date().toISOString(),
        },
        {
          session_id: "s-2",
          city_name: "City B",
          difficulty: "hard",
          current_turn: 15,
          status: "completed",
          final_score: 85000,
          result_tier: "A - Sustainable City",
          started_at: new Date().toISOString(),
        },
      ],
    });

    const res = await request(app)
      .get("/api/v1/game/sessions")
      .set("Authorization", `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.sessions).toHaveLength(2);
    expect(res.body.sessions[0].sessionId).toBe("s-1");
    expect(res.body.sessions[1].status).toBe("completed");
  });

  it("returns empty array if no sessions exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/v1/game/sessions")
      .set("Authorization", `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.sessions).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  GET /sessions/:id                                                  */
/* ------------------------------------------------------------------ */
describe("GET /api/v1/game/sessions/:id", () => {
  it("returns a specific session by ID", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [sessionRow()] });

    const res = await request(app)
      .get("/api/v1/game/sessions/sess-1")
      .set("Authorization", `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.session.sessionId).toBe("sess-1");
    expect(res.body.session.state).toBeDefined();
  });

  it("returns 404 for non-existent session", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/v1/game/sessions/nonexistent")
      .set("Authorization", `Bearer ${testToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Session not found");
  });
});

/* ------------------------------------------------------------------ */
/*  POST /sessions/:id/turn                                            */
/* ------------------------------------------------------------------ */
describe("POST /api/v1/game/sessions/:id/turn", () => {
  it("submits a valid turn with zone placement", async () => {
    const row = sessionRow();

    mockClient.query.mockImplementation((sql: string) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return {};
      if (sql.includes("SELECT * FROM game_sessions")) return { rows: [row] };
      if (sql.includes("UPDATE game_sessions")) return { rowCount: 1 };
      if (sql.includes("INSERT INTO decisions")) return { rowCount: 1 };
      return { rows: [] };
    });

    const res = await request(app)
      .post("/api/v1/game/sessions/sess-1/turn")
      .set("Authorization", `Bearer ${testToken}`)
      .send({
        actions: [{ category: "zone", code: "residential", tileIndex: 0 }],
        projectDecisions: [],
      });

    expect(res.status).toBe(200);
    expect(res.body.session).toBeDefined();
    expect(res.body.records).toBeDefined();
    expect(res.body.maxTurns).toBe(15);
  });

  it("returns 404 when session does not exist", async () => {
    mockClient.query.mockImplementation((sql: string) => {
      if (sql === "BEGIN" || sql === "ROLLBACK") return {};
      if (sql.includes("SELECT")) return { rows: [] };
      return {};
    });

    const res = await request(app)
      .post("/api/v1/game/sessions/nonexistent/turn")
      .set("Authorization", `Bearer ${testToken}`)
      .send({ actions: [], projectDecisions: [] });

    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid turn payload", async () => {
    const res = await request(app)
      .post("/api/v1/game/sessions/sess-1/turn")
      .set("Authorization", `Bearer ${testToken}`)
      .send({ actions: "not-an-array" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid turn payload");
  });
});

/* ------------------------------------------------------------------ */
/*  GET /sessions/:id/history                                          */
/* ------------------------------------------------------------------ */
describe("GET /api/v1/game/sessions/:id/history", () => {
  it("returns decision history for a session", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [sessionRow()] })
      .mockResolvedValueOnce({
        rows: [
          {
            decision_id: "d-1",
            turn_number: 1,
            action_type: "zone",
            action_detail: { code: "residential" },
            delta_happiness: 6,
            delta_env: -1,
            delta_economy: 2,
            delta_carbon: 20,
            cost: 6000,
            created_at: new Date().toISOString(),
          },
        ],
      });

    const res = await request(app)
      .get("/api/v1/game/sessions/sess-1/history")
      .set("Authorization", `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.history).toHaveLength(1);
    expect(res.body.history[0].actionType).toBe("zone");
    expect(res.body.history[0].deltas.happiness).toBe(6);
  });

  it("returns 404 for non-existent session history", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/v1/game/sessions/nonexistent/history")
      .set("Authorization", `Bearer ${testToken}`);

    expect(res.status).toBe(404);
  });
});
