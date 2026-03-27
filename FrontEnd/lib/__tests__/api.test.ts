import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("../auth", () => ({
  getToken: vi.fn(() => "mock-jwt-token"),
}));

const api = await import("../api");

function mockJsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

/* ------------------------------------------------------------------ */
/*  register                                                           */
/* ------------------------------------------------------------------ */
describe("register", () => {
  it("sends POST to /auth/register with username, email, password", async () => {
    const responseBody = {
      token: "new-token",
      player: { playerId: "p-1", username: "newuser", email: "new@test.com", totalGames: 0, bestScore: 0 },
    };
    mockFetch.mockResolvedValueOnce(mockJsonResponse(responseBody));

    const result = await api.register({
      username: "newuser",
      email: "new@test.com",
      password: "pass1234",
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/auth/register");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      username: "newuser",
      email: "new@test.com",
      password: "pass1234",
    });
    expect(result.token).toBe("new-token");
  });
});

/* ------------------------------------------------------------------ */
/*  login                                                              */
/* ------------------------------------------------------------------ */
describe("login", () => {
  it("sends POST to /auth/login with email and password", async () => {
    const responseBody = {
      token: "login-token",
      player: { playerId: "p-1", username: "user", email: "u@test.com", totalGames: 1, bestScore: 5000 },
    };
    mockFetch.mockResolvedValueOnce(mockJsonResponse(responseBody));

    const result = await api.login({ email: "u@test.com", password: "pass1234" });

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/auth/login");
    expect(init.method).toBe("POST");
    expect(result.player.username).toBe("user");
  });
});

/* ------------------------------------------------------------------ */
/*  Authorization header                                               */
/* ------------------------------------------------------------------ */
describe("request authorization", () => {
  it("adds Bearer token from getToken() to all requests", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ zones: [], infrastructure: [], projects: [] }),
    );

    await api.fetchCatalog();

    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer mock-jwt-token");
  });

  it("sets Content-Type to application/json", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ sessions: [] }));

    await api.fetchSessions();

    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
  });
});

/* ------------------------------------------------------------------ */
/*  Error handling                                                     */
/* ------------------------------------------------------------------ */
describe("error handling", () => {
  it("throws an error on non-OK response", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ error: "Session not found" }, 404),
    );

    await expect(api.fetchSession("bad-id")).rejects.toThrow("Session not found");
  });

  it("throws generic message when response has no error field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    await expect(api.fetchSessions()).rejects.toThrow("Request failed");
  });

  it("throws generic message when JSON parsing fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("bad json")),
    });

    await expect(api.fetchSessions()).rejects.toThrow("Request failed");
  });
});

/* ------------------------------------------------------------------ */
/*  API endpoint mapping                                               */
/* ------------------------------------------------------------------ */
describe("API endpoint mapping", () => {
  it("fetchProfile calls /players/:id/profile", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ profile: { playerId: "p-1" } }),
    );

    await api.fetchProfile("p-1");
    expect(mockFetch.mock.calls[0][0]).toContain("/players/p-1/profile");
  });

  it("fetchScores calls /players/:id/scores", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ scores: [] }));

    await api.fetchScores("p-1");
    expect(mockFetch.mock.calls[0][0]).toContain("/players/p-1/scores");
  });

  it("createSession sends POST to /game/sessions", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ session: {} }));

    await api.createSession({ cityName: "New City", difficulty: "easy" });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/game/sessions");
    expect(init.method).toBe("POST");
  });

  it("submitTurn sends POST to /game/sessions/:id/turn", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ session: {}, maxTurns: 15, records: [], achievements: [] }),
    );

    await api.submitTurn("sess-1", {
      actions: [{ category: "zone", code: "residential", tileIndex: 0 }],
      projectDecisions: [],
    });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/game/sessions/sess-1/turn");
    expect(init.method).toBe("POST");
  });

  it("fetchHistory calls /game/sessions/:id/history", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ history: [] }));

    await api.fetchHistory("sess-1");
    expect(mockFetch.mock.calls[0][0]).toContain("/game/sessions/sess-1/history");
  });
});
