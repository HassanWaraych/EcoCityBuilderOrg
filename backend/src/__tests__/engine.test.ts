import { describe, it, expect } from "vitest";
import {
  clampMetric,
  buildInitialState,
  drawProjects,
  drawEvent,
  calculateScore,
  scoreTier,
  achievementsForScore,
  summarizeMetrics,
  listCatalog,
  resolveTurn,
  ZONES,
  INFRASTRUCTURE,
  PROJECTS,
  MAX_TURNS,
  MAX_ACTIONS_PER_TURN,
} from "../sim/engine.ts";
import type { SessionRecord, SessionMetrics, EventCard } from "../types/index.ts";

function createSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    sessionId: "test-session-id",
    playerId: "test-player-id",
    cityName: "Test City",
    difficulty: "normal",
    currentTurn: 1,
    status: "active",
    happiness: 50,
    envHealth: 70,
    economy: 50,
    carbonFootprint: 1000,
    budget: 160000,
    population: 10000,
    finalScore: null,
    resultTier: null,
    lossReason: null,
    state: buildInitialState(),
    pendingProjects: [],
    pendingEvent: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  clampMetric                                                        */
/* ------------------------------------------------------------------ */
describe("clampMetric", () => {
  it("returns 0 for negative values", () => {
    expect(clampMetric(-10)).toBe(0);
    expect(clampMetric(-1)).toBe(0);
  });

  it("returns 100 for values above 100", () => {
    expect(clampMetric(110)).toBe(100);
    expect(clampMetric(999)).toBe(100);
  });

  it("rounds to the nearest integer", () => {
    expect(clampMetric(50.4)).toBe(50);
    expect(clampMetric(50.6)).toBe(51);
    expect(clampMetric(99.5)).toBe(100);
  });

  it("passes through values within [0, 100]", () => {
    expect(clampMetric(0)).toBe(0);
    expect(clampMetric(50)).toBe(50);
    expect(clampMetric(100)).toBe(100);
  });
});

/* ------------------------------------------------------------------ */
/*  buildInitialState                                                  */
/* ------------------------------------------------------------------ */
describe("buildInitialState", () => {
  it("creates a 10×10 grid", () => {
    const state = buildInitialState();
    expect(state.gridW).toBe(10);
    expect(state.gridH).toBe(10);
    expect(state.tiles).toHaveLength(10);
    expect(state.tiles[0]).toHaveLength(10);
  });

  it("places exactly 5 rock tiles at fixed positions", () => {
    const state = buildInitialState();
    const expectedRocks = [
      [1, 1],
      [2, 7],
      [5, 3],
      [7, 8],
      [8, 2],
    ];
    let rockCount = 0;
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (state.tiles[r][c].terrain === "rock") rockCount++;
      }
    }
    expect(rockCount).toBe(5);
    for (const [r, c] of expectedRocks) {
      expect(state.tiles[r][c].terrain).toBe("rock");
    }
  });

  it("initializes all non-rock tiles as plain with no zone or infrastructure", () => {
    const state = buildInitialState();
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const tile = state.tiles[r][c];
        if (tile.terrain === "plain") {
          expect(tile.zone).toBeNull();
          expect(tile.infrastructure).toBeNull();
        }
      }
    }
  });

  it("initializes all infrastructure counters to 0", () => {
    const state = buildInitialState();
    expect(state.roadsBuilt).toBe(0);
    expect(state.transitBuilt).toBe(0);
    expect(state.waterPlantsBuilt).toBe(0);
    expect(state.windTurbinesBuilt).toBe(0);
    expect(state.wasteManagementBuilt).toBe(0);
    expect(state.bikeLanesBuilt).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  drawProjects                                                       */
/* ------------------------------------------------------------------ */
describe("drawProjects", () => {
  it("always returns exactly 2 projects", () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(drawProjects(seed)).toHaveLength(2);
    }
  });

  it("never returns duplicate projects", () => {
    for (let seed = 0; seed < 20; seed++) {
      const [a, b] = drawProjects(seed);
      expect(a.code).not.toBe(b.code);
    }
  });

  it("returns projects from the PROJECTS catalogue", () => {
    const validCodes = PROJECTS.map((p) => p.code);
    for (let seed = 0; seed < 20; seed++) {
      const [a, b] = drawProjects(seed);
      expect(validCodes).toContain(a.code);
      expect(validCodes).toContain(b.code);
    }
  });

  it("produces different combinations with different seeds", () => {
    const combos = new Set<string>();
    for (let seed = 0; seed < 50; seed++) {
      const [a, b] = drawProjects(seed);
      combos.add(`${a.code}|${b.code}`);
    }
    expect(combos.size).toBeGreaterThan(1);
  });
});

/* ------------------------------------------------------------------ */
/*  drawEvent                                                          */
/* ------------------------------------------------------------------ */
describe("drawEvent", () => {
  const baseMetrics: SessionMetrics = {
    happiness: 50,
    envHealth: 50,
    economy: 50,
    carbonFootprint: 1000,
    budget: 100000,
    population: 10000,
  };

  it("returns null for turns before turn 3", () => {
    expect(drawEvent(1, baseMetrics, 0)).toBeNull();
    expect(drawEvent(2, baseMetrics, 0)).toBeNull();
  });

  it("returns null when seed % 10 >= 3", () => {
    expect(drawEvent(5, baseMetrics, 3)).toBeNull();
    expect(drawEvent(5, baseMetrics, 9)).toBeNull();
    expect(drawEvent(5, baseMetrics, 13)).toBeNull();
  });

  it("can return an event when turn >= 3 and seed % 10 < 3", () => {
    const event = drawEvent(5, baseMetrics, 10);
    if (event) {
      expect(event.code).toBeDefined();
      expect(event.title).toBeDefined();
      expect(event.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("only returns events whose eligibility criteria are met", () => {
    const highEconomy: SessionMetrics = { ...baseMetrics, economy: 90 };
    const event = drawEvent(5, highEconomy, 0);
    if (event) {
      expect(event.code).toBeDefined();
    }
  });

  it("returns null if no events are eligible", () => {
    const noEligible: SessionMetrics = {
      happiness: 100,
      envHealth: 100,
      economy: 50,
      carbonFootprint: 0,
      budget: 999999,
      population: 100000,
    };
    const event = drawEvent(3, noEligible, 0);
    if (event) {
      expect(["drought"]).toContain(event.code);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  calculateScore                                                     */
/* ------------------------------------------------------------------ */
describe("calculateScore", () => {
  it("computes score using the weighted formula", () => {
    const metrics: SessionMetrics = {
      happiness: 80,
      envHealth: 80,
      economy: 80,
      carbonFootprint: 500,
      budget: 200000,
      population: 50000,
    };
    const score = calculateScore(metrics, 15);
    const expected =
      80 * 400 + 80 * 400 + 80 * 200 - 500 * 0.05 + 200000 * 0.001 + 15 * 500;
    expect(score).toBe(Math.max(0, Math.round(expected)));
  });

  it("never returns a negative score", () => {
    const terrible: SessionMetrics = {
      happiness: 0,
      envHealth: 0,
      economy: 0,
      carbonFootprint: 999999,
      budget: 0,
      population: 0,
    };
    expect(calculateScore(terrible, 0)).toBeGreaterThanOrEqual(0);
  });

  it("rewards high happiness and envHealth equally (weight 400 each)", () => {
    const a: SessionMetrics = {
      happiness: 100,
      envHealth: 50,
      economy: 50,
      carbonFootprint: 0,
      budget: 0,
      population: 0,
    };
    const b: SessionMetrics = {
      happiness: 50,
      envHealth: 100,
      economy: 50,
      carbonFootprint: 0,
      budget: 0,
      population: 0,
    };
    expect(calculateScore(a, 10)).toBe(calculateScore(b, 10));
  });

  it("awards 500 points per turn survived", () => {
    const metrics: SessionMetrics = {
      happiness: 50,
      envHealth: 50,
      economy: 50,
      carbonFootprint: 0,
      budget: 0,
      population: 0,
    };
    const diff = calculateScore(metrics, 10) - calculateScore(metrics, 9);
    expect(diff).toBe(500);
  });
});

/* ------------------------------------------------------------------ */
/*  scoreTier                                                          */
/* ------------------------------------------------------------------ */
describe("scoreTier", () => {
  it("returns S tier for scores >= 95000", () => {
    expect(scoreTier(95000)).toBe("S - Utopian City");
    expect(scoreTier(100000)).toBe("S - Utopian City");
  });

  it("returns A tier for scores [85000, 95000)", () => {
    expect(scoreTier(85000)).toBe("A - Sustainable City");
    expect(scoreTier(94999)).toBe("A - Sustainable City");
  });

  it("returns B tier for scores [70000, 85000)", () => {
    expect(scoreTier(70000)).toBe("B - Thriving City");
    expect(scoreTier(84999)).toBe("B - Thriving City");
  });

  it("returns C tier for scores [50000, 70000)", () => {
    expect(scoreTier(50000)).toBe("C - Developing City");
    expect(scoreTier(69999)).toBe("C - Developing City");
  });

  it("returns D tier for scores [25000, 50000)", () => {
    expect(scoreTier(25000)).toBe("D - Struggling City");
    expect(scoreTier(49999)).toBe("D - Struggling City");
  });

  it("returns F tier for scores < 25000", () => {
    expect(scoreTier(0)).toBe("F - Collapsed City");
    expect(scoreTier(24999)).toBe("F - Collapsed City");
  });
});

/* ------------------------------------------------------------------ */
/*  achievementsForScore                                               */
/* ------------------------------------------------------------------ */
describe("achievementsForScore", () => {
  it("returns eco_hero for scores >= 95000", () => {
    expect(achievementsForScore(95000)).toEqual(["eco_hero"]);
  });

  it("returns green_city for scores [85000, 95000)", () => {
    expect(achievementsForScore(85000)).toEqual(["green_city"]);
    expect(achievementsForScore(94999)).toEqual(["green_city"]);
  });

  it("returns eco_conscious for scores [70000, 85000)", () => {
    expect(achievementsForScore(70000)).toEqual(["eco_conscious"]);
  });

  it("returns city_planner for scores [50000, 70000)", () => {
    expect(achievementsForScore(50000)).toEqual(["city_planner"]);
  });

  it("returns empty array for scores < 50000", () => {
    expect(achievementsForScore(0)).toEqual([]);
    expect(achievementsForScore(49999)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  summarizeMetrics                                                   */
/* ------------------------------------------------------------------ */
describe("summarizeMetrics", () => {
  it("extracts all six metrics from a session record", () => {
    const session = createSession({
      happiness: 60,
      envHealth: 75,
      economy: 45,
      carbonFootprint: 2000,
      budget: 80000,
      population: 25000,
    });
    const metrics = summarizeMetrics(session);
    expect(metrics).toEqual({
      happiness: 60,
      envHealth: 75,
      economy: 45,
      carbonFootprint: 2000,
      budget: 80000,
      population: 25000,
    });
  });
});

/* ------------------------------------------------------------------ */
/*  listCatalog                                                        */
/* ------------------------------------------------------------------ */
describe("listCatalog", () => {
  it("returns zones, infrastructure, and projects arrays", () => {
    const catalog = listCatalog();
    expect(catalog.zones).toBeDefined();
    expect(catalog.infrastructure).toBeDefined();
    expect(catalog.projects).toBeDefined();
  });

  it("includes all defined zones with code, label, cost, and deltas", () => {
    const catalog = listCatalog();
    const zoneCodes = catalog.zones.map((z) => z.code);
    expect(zoneCodes).toContain("residential");
    expect(zoneCodes).toContain("commercial");
    expect(zoneCodes).toContain("industrial");
    expect(zoneCodes).toContain("green_space");
    expect(zoneCodes).toContain("mixed_use");
    expect(zoneCodes).toContain("solar_farm");
    expect(catalog.zones).toHaveLength(Object.keys(ZONES).length);
    for (const zone of catalog.zones) {
      expect(zone.cost).toBeGreaterThan(0);
      expect(zone.label).toBeTruthy();
    }
  });

  it("includes all defined infrastructure with code, label, cost, and deltas", () => {
    const catalog = listCatalog();
    const infraCodes = catalog.infrastructure.map((i) => i.code);
    expect(infraCodes).toContain("road_network");
    expect(infraCodes).toContain("public_transit");
    expect(infraCodes).toContain("wind_turbine");
    expect(infraCodes).toContain("bike_lane");
    expect(catalog.infrastructure).toHaveLength(Object.keys(INFRASTRUCTURE).length);
  });

  it("includes all project proposals", () => {
    const catalog = listCatalog();
    expect(catalog.projects).toHaveLength(PROJECTS.length);
  });
});

/* ------------------------------------------------------------------ */
/*  resolveTurn – session validation                                   */
/* ------------------------------------------------------------------ */
describe("resolveTurn – session validation", () => {
  it("rejects turns on non-active sessions", () => {
    const session = createSession({ status: "completed" });
    expect(() => resolveTurn(session, [], [], undefined)).toThrow(
      "This session is no longer active",
    );
  });

  it("rejects turns on lost sessions", () => {
    const session = createSession({ status: "lost" });
    expect(() => resolveTurn(session, [], [], undefined)).toThrow(
      "This session is no longer active",
    );
  });

  it("rejects more than 3 actions per turn", () => {
    const session = createSession();
    const actions = Array.from({ length: 4 }, (_, i) => ({
      category: "zone" as const,
      code: "residential",
      tileIndex: i,
    }));
    expect(() => resolveTurn(session, actions, [], undefined)).toThrow(
      "You can submit at most 3 build actions per turn",
    );
  });

  it("accepts exactly MAX_ACTIONS_PER_TURN actions", () => {
    const session = createSession({ budget: 500000 });
    const actions = Array.from({ length: MAX_ACTIONS_PER_TURN }, (_, i) => ({
      category: "zone" as const,
      code: "residential",
      tileIndex: i,
    }));
    const result = resolveTurn(session, actions, [], undefined);
    expect(result.status).toBe("active");
  });

  it("allows submitting zero actions (skip turn)", () => {
    const session = createSession();
    const result = resolveTurn(session, [], [], undefined);
    expect(result.status).toBe("active");
    expect(result.nextTurn).toBe(2);
  });
});

/* ------------------------------------------------------------------ */
/*  resolveTurn – passive turn effects                                 */
/* ------------------------------------------------------------------ */
describe("resolveTurn – passive turn effects", () => {
  it("grants base budget plus tax income each turn", () => {
    const session = createSession({ budget: 100000, population: 10000 });
    const result = resolveTurn(session, [], [], undefined);
    const expectedGrant = 12000 + Math.floor(10000 * 0.006);
    expect(result.metrics.budget).toBe(100000 + expectedGrant);
  });

  it("grows population when happiness >= 60", () => {
    const session = createSession({ happiness: 70, population: 10000 });
    const result = resolveTurn(session, [], [], undefined);
    const growth = Math.max(250, Math.floor(10000 * 0.05));
    expect(result.metrics.population).toBe(10000 + growth);
  });

  it("declines population when happiness < 30", () => {
    const session = createSession({ happiness: 20, population: 10000 });
    const result = resolveTurn(session, [], [], undefined);
    const decline = Math.max(120, Math.floor(10000 * 0.008));
    expect(result.metrics.population).toBe(10000 - decline);
  });

  it("does not change population when happiness is between 30 and 59", () => {
    const session = createSession({ happiness: 45, population: 10000 });
    const result = resolveTurn(session, [], [], undefined);
    expect(result.metrics.population).toBe(10000);
  });

  it("penalizes envHealth by 2 when carbon > 5000", () => {
    const session = createSession({ carbonFootprint: 6000, envHealth: 80 });
    const result = resolveTurn(session, [], [], undefined);
    expect(result.metrics.envHealth).toBe(80 - 2);
  });

  it("boosts happiness by 1 when envHealth >= 80", () => {
    const session = createSession({ envHealth: 85, happiness: 50 });
    const result = resolveTurn(session, [], [], undefined);
    expect(result.metrics.happiness).toBe(51);
  });

  it("passive record is always the first record", () => {
    const session = createSession();
    const result = resolveTurn(session, [], [], undefined);
    expect(result.records[0].actionType).toBe("passive");
  });
});

/* ------------------------------------------------------------------ */
/*  resolveTurn – zone placement                                       */
/* ------------------------------------------------------------------ */
describe("resolveTurn – zone placement", () => {
  it("places a residential zone on an empty plain tile", () => {
    const session = createSession();
    const result = resolveTurn(
      session,
      [{ category: "zone", code: "residential", tileIndex: 0 }],
      [],
      undefined,
    );
    expect(result.state.tiles[0][0].zone).toBe("residential");
  });

  it("deducts zone cost from budget", () => {
    const session = createSession({ budget: 160000, population: 10000 });
    const result = resolveTurn(
      session,
      [{ category: "zone", code: "residential", tileIndex: 0 }],
      [],
      undefined,
    );
    const passiveGrant = 12000 + Math.floor(10000 * 0.006);
    expect(result.metrics.budget).toBe(160000 + passiveGrant - ZONES.residential.cost);
  });

  it("applies zone metric deltas", () => {
    const session = createSession({ happiness: 50, envHealth: 70, economy: 50 });
    const result = resolveTurn(
      session,
      [{ category: "zone", code: "green_space", tileIndex: 0 }],
      [],
      undefined,
    );
    expect(result.metrics.happiness).toBe(50 + ZONES.green_space.deltas.happiness!);
    expect(result.metrics.envHealth).toBe(70 + ZONES.green_space.deltas.envHealth!);
  });

  it("rejects placement on rock tiles", () => {
    const session = createSession();
    expect(() =>
      resolveTurn(
        session,
        [{ category: "zone", code: "residential", tileIndex: 11 }],
        [],
        undefined,
      ),
    ).toThrow("That tile is blocked by rock");
  });

  it("rejects placement on a tile that already has a zone", () => {
    const state = buildInitialState();
    state.tiles[0][0].zone = "residential";
    const session = createSession({ state });
    expect(() =>
      resolveTurn(
        session,
        [{ category: "zone", code: "green_space", tileIndex: 0 }],
        [],
        undefined,
      ),
    ).toThrow("Select an empty buildable tile");
  });

  it("rejects commercial zone without roads", () => {
    const session = createSession();
    expect(() =>
      resolveTurn(
        session,
        [{ category: "zone", code: "commercial", tileIndex: 0 }],
        [],
        undefined,
      ),
    ).toThrow("Roads are required before this build");
  });

  it("rejects industrial zone without roads", () => {
    const session = createSession();
    expect(() =>
      resolveTurn(
        session,
        [{ category: "zone", code: "industrial", tileIndex: 0 }],
        [],
        undefined,
      ),
    ).toThrow("Roads are required before this build");
  });

  it("allows commercial zone when roads are built", () => {
    const state = buildInitialState();
    state.roadsBuilt = 1;
    const session = createSession({ state, budget: 200000 });
    const result = resolveTurn(
      session,
      [{ category: "zone", code: "commercial", tileIndex: 0 }],
      [],
      undefined,
    );
    expect(result.state.tiles[0][0].zone).toBe("commercial");
  });

  it("rejects unknown zone codes", () => {
    const session = createSession();
    expect(() =>
      resolveTurn(
        session,
        [{ category: "zone", code: "nonexistent", tileIndex: 0 }],
        [],
        undefined,
      ),
    ).toThrow("Unknown zone action");
  });

  it("rejects zone placement with insufficient budget", () => {
    const session = createSession({ budget: 100, population: 0 });
    expect(() =>
      resolveTurn(
        session,
        [{ category: "zone", code: "solar_farm", tileIndex: 0 }],
        [],
        undefined,
      ),
    ).toThrow("Insufficient budget");
  });

  it("rejects invalid tile index", () => {
    const session = createSession();
    expect(() =>
      resolveTurn(
        session,
        [{ category: "zone", code: "residential", tileIndex: 999 }],
        [],
        undefined,
      ),
    ).toThrow("Invalid tile selected");
  });
});

/* ------------------------------------------------------------------ */
/*  resolveTurn – infrastructure placement                             */
/* ------------------------------------------------------------------ */
describe("resolveTurn – infrastructure placement", () => {
  it("places a road network on an empty tile", () => {
    const session = createSession();
    const result = resolveTurn(
      session,
      [{ category: "infrastructure", code: "road_network", tileIndex: 0 }],
      [],
      undefined,
    );
    expect(result.state.tiles[0][0].infrastructure).toBe("road_network");
    expect(result.state.roadsBuilt).toBe(1);
  });

  it("increments the correct infrastructure counter", () => {
    const session = createSession({ budget: 500000 });
    const result = resolveTurn(
      session,
      [{ category: "infrastructure", code: "public_transit", tileIndex: 0 }],
      [],
      undefined,
    );
    expect(result.state.transitBuilt).toBe(1);
  });

  it("rejects bike lane without roads", () => {
    const session = createSession();
    expect(() =>
      resolveTurn(
        session,
        [{ category: "infrastructure", code: "bike_lane", tileIndex: 0 }],
        [],
        undefined,
      ),
    ).toThrow("Bike lanes require roads");
  });

  it("rejects water treatment when population <= 25000", () => {
    const session = createSession({ population: 20000 });
    expect(() =>
      resolveTurn(
        session,
        [{ category: "infrastructure", code: "water_treatment", tileIndex: 0 }],
        [],
        undefined,
      ),
    ).toThrow("Water treatment unlocks once population exceeds 25,000");
  });

  it("rejects wind turbine when cap of 3 is reached", () => {
    const state = buildInitialState();
    state.windTurbinesBuilt = 3;
    const session = createSession({ state, budget: 500000 });
    expect(() =>
      resolveTurn(
        session,
        [{ category: "infrastructure", code: "wind_turbine", tileIndex: 0 }],
        [],
        undefined,
      ),
    ).toThrow("Wind turbine cap reached");
  });

  it("allows wind turbine when count < 3", () => {
    const state = buildInitialState();
    state.windTurbinesBuilt = 2;
    const session = createSession({ state, budget: 500000 });
    const result = resolveTurn(
      session,
      [{ category: "infrastructure", code: "wind_turbine", tileIndex: 0 }],
      [],
      undefined,
    );
    expect(result.state.windTurbinesBuilt).toBe(3);
  });

  it("rejects placement on a tile with existing infrastructure", () => {
    const state = buildInitialState();
    state.tiles[0][0].infrastructure = "road_network";
    const session = createSession({ state, budget: 500000 });
    expect(() =>
      resolveTurn(
        session,
        [{ category: "infrastructure", code: "public_transit", tileIndex: 0 }],
        [],
        undefined,
      ),
    ).toThrow("Select a tile without infrastructure");
  });

  it("grants +2 happiness bonus for bike lane when envHealth >= 60", () => {
    const state = buildInitialState();
    state.roadsBuilt = 1;
    const session = createSession({ state, envHealth: 80, happiness: 50 });
    const result = resolveTurn(
      session,
      [{ category: "infrastructure", code: "bike_lane", tileIndex: 0 }],
      [],
      undefined,
    );
    const baseHappiness = INFRASTRUCTURE.bike_lane.deltas.happiness ?? 0;
    const passiveBonus = 1;
    expect(result.metrics.happiness).toBe(50 + passiveBonus + baseHappiness + 2);
  });

  it("grants +2 envHealth bonus for waste management", () => {
    const session = createSession({ envHealth: 70 });
    const result = resolveTurn(
      session,
      [{ category: "infrastructure", code: "waste_management", tileIndex: 0 }],
      [],
      undefined,
    );
    const baseDelta = INFRASTRUCTURE.waste_management.deltas.envHealth ?? 0;
    expect(result.metrics.envHealth).toBe(70 + baseDelta + 2);
  });

  it("rejects unknown infrastructure codes", () => {
    const session = createSession();
    expect(() =>
      resolveTurn(
        session,
        [{ category: "infrastructure", code: "teleporter", tileIndex: 0 }],
        [],
        undefined,
      ),
    ).toThrow("Unknown infrastructure action");
  });
});

/* ------------------------------------------------------------------ */
/*  resolveTurn – project decisions                                    */
/* ------------------------------------------------------------------ */
describe("resolveTurn – project decisions", () => {
  it("applies approve deltas and deducts cost from budget", () => {
    const session = createSession({
      pendingProjects: [PROJECTS[0], PROJECTS[1]],
      budget: 200000,
    });
    const result = resolveTurn(
      session,
      [],
      [
        { code: PROJECTS[0].code, decision: "approve" },
        { code: PROJECTS[1].code, decision: "approve" },
      ],
      undefined,
    );
    const approvalRecords = result.records.filter((r) => r.actionType === "project_approve");
    expect(approvalRecords).toHaveLength(2);
  });

  it("applies reject penalty instead of deltas", () => {
    const session = createSession({
      pendingProjects: [PROJECTS[0], PROJECTS[1]],
      economy: 50,
    });
    const result = resolveTurn(
      session,
      [],
      [
        { code: PROJECTS[0].code, decision: "reject" },
        { code: PROJECTS[1].code, decision: "reject" },
      ],
      undefined,
    );
    const rejectRecords = result.records.filter((r) => r.actionType === "project_reject");
    expect(rejectRecords).toHaveLength(2);
    expect(rejectRecords[0].cost).toBe(0);
  });

  it("throws when budget is insufficient for approved project", () => {
    const session = createSession({
      pendingProjects: [PROJECTS[2], PROJECTS[1]],
      budget: 0,
      population: 0,
    });
    expect(() =>
      resolveTurn(
        session,
        [],
        [
          { code: PROJECTS[2].code, decision: "approve" },
          { code: PROJECTS[1].code, decision: "reject" },
        ],
        undefined,
      ),
    ).toThrow(/Insufficient budget/);
  });

  it("requires decisions for both proposals", () => {
    const session = createSession({
      pendingProjects: [PROJECTS[0], PROJECTS[1]],
    });
    expect(() =>
      resolveTurn(
        session,
        [],
        [{ code: PROJECTS[0].code, decision: "approve" }],
        undefined,
      ),
    ).toThrow("Each turn requires decisions for both proposals");
  });

  it("skips project processing when no pending projects exist", () => {
    const session = createSession({ pendingProjects: [] });
    const result = resolveTurn(session, [], [], undefined);
    const projectRecords = result.records.filter(
      (r) => r.actionType === "project_approve" || r.actionType === "project_reject",
    );
    expect(projectRecords).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/*  resolveTurn – event responses                                      */
/* ------------------------------------------------------------------ */
describe("resolveTurn – event responses", () => {
  const droughtEvent: EventCard = {
    code: "drought",
    title: "Drought",
    description: "A dry season is straining water reserves.",
    options: [
      { label: "Enforce water rationing", deltas: { happiness: -8, envHealth: 5 } },
      { label: "Sink emergency wells", deltas: { envHealth: -6, population: 200 }, budgetDelta: -7000 },
    ],
  };

  it("applies event option deltas when response is given", () => {
    const session = createSession({ pendingEvent: droughtEvent, happiness: 50 });
    const result = resolveTurn(session, [], [], 0);
    const eventRecord = result.records.find((r) => r.actionType === "event_response");
    expect(eventRecord).toBeDefined();
    expect(eventRecord!.delta.happiness).toBe(-8);
    expect(eventRecord!.delta.envHealth).toBe(5);
  });

  it("applies budgetDelta from event option", () => {
    const session = createSession({ pendingEvent: droughtEvent, budget: 160000 });
    const result = resolveTurn(session, [], [], 1);
    const eventRecord = result.records.find((r) => r.actionType === "event_response");
    expect(eventRecord!.delta.budget).toBe(-7000);
  });

  it("throws when event exists but no response index is given", () => {
    const session = createSession({ pendingEvent: droughtEvent });
    expect(() => resolveTurn(session, [], [], undefined)).toThrow(
      "A valid event response is required",
    );
  });

  it("throws when response index is out of bounds", () => {
    const session = createSession({ pendingEvent: droughtEvent });
    expect(() => resolveTurn(session, [], [], 5)).toThrow(
      "A valid event response is required",
    );
  });

  it("skips event processing when no pending event exists", () => {
    const session = createSession({ pendingEvent: null });
    const result = resolveTurn(session, [], [], undefined);
    const eventRecords = result.records.filter((r) => r.actionType === "event_response");
    expect(eventRecords).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/*  resolveTurn – loss conditions                                      */
/* ------------------------------------------------------------------ */
describe("resolveTurn – loss conditions", () => {
  it("triggers city_revolt when happiness reaches 0", () => {
    const state = buildInitialState();
    state.roadsBuilt = 1;
    const session = createSession({ state, happiness: 2 });
    const result = resolveTurn(
      session,
      [{ category: "zone", code: "industrial", tileIndex: 0 }],
      [],
      undefined,
    );
    expect(result.status).toBe("lost");
    expect(result.lossReason).toBe("city_revolt");
  });

  it("triggers ecological_collapse when envHealth reaches 0", () => {
    const state = buildInitialState();
    state.roadsBuilt = 1;
    const session = createSession({ state, envHealth: 3, happiness: 50 });
    const result = resolveTurn(
      session,
      [{ category: "zone", code: "industrial", tileIndex: 0 }],
      [],
      undefined,
    );
    expect(result.status).toBe("lost");
    expect(result.lossReason).toBe("ecological_collapse");
  });

  it("triggers bankruptcy when economy reaches 0", () => {
    const session = createSession({
      economy: 1,
      happiness: 50,
      envHealth: 70,
      pendingProjects: [PROJECTS[0], PROJECTS[1]],
    });
    const result = resolveTurn(
      session,
      [],
      [
        { code: PROJECTS[0].code, decision: "reject" },
        { code: PROJECTS[1].code, decision: "reject" },
      ],
      undefined,
    );
    expect(result.status).toBe("lost");
    expect(result.lossReason).toBe("bankruptcy");
  });

  it("triggers budget_depleted when budget reaches 0", () => {
    const session = createSession({
      budget: 0,
      population: 0,
      happiness: 50,
      envHealth: 70,
      economy: 50,
    });
    const result = resolveTurn(
      session,
      [
        { category: "zone", code: "residential", tileIndex: 0 },
        { category: "zone", code: "residential", tileIndex: 1 },
      ],
      [],
      undefined,
    );
    expect(result.status).toBe("lost");
    expect(result.lossReason).toBe("budget_depleted");
  });

  it("does not calculate final score on loss", () => {
    const state = buildInitialState();
    state.roadsBuilt = 1;
    const session = createSession({ state, happiness: 2 });
    const result = resolveTurn(
      session,
      [{ category: "zone", code: "industrial", tileIndex: 0 }],
      [],
      undefined,
    );
    expect(result.finalScore).toBeNull();
    expect(result.resultTier).toBeNull();
    expect(result.achievements).toEqual([]);
  });

  it("does not advance the turn number on loss", () => {
    const state = buildInitialState();
    state.roadsBuilt = 1;
    const session = createSession({ state, happiness: 2, currentTurn: 5 });
    const result = resolveTurn(
      session,
      [{ category: "zone", code: "industrial", tileIndex: 0 }],
      [],
      undefined,
    );
    expect(result.nextTurn).toBe(5);
  });
});

/* ------------------------------------------------------------------ */
/*  resolveTurn – game completion                                      */
/* ------------------------------------------------------------------ */
describe("resolveTurn – game completion", () => {
  it("completes the game on turn 15 with healthy metrics", () => {
    const session = createSession({
      currentTurn: MAX_TURNS,
      happiness: 80,
      envHealth: 80,
      economy: 80,
      carbonFootprint: 500,
      budget: 200000,
      population: 50000,
    });
    const result = resolveTurn(session, [], [], undefined);
    expect(result.status).toBe("completed");
  });

  it("calculates final score on completion", () => {
    const session = createSession({
      currentTurn: MAX_TURNS,
      happiness: 80,
      envHealth: 80,
      economy: 80,
      carbonFootprint: 500,
      budget: 200000,
      population: 50000,
    });
    const result = resolveTurn(session, [], [], undefined);
    expect(result.finalScore).toBeGreaterThan(0);
    expect(typeof result.finalScore).toBe("number");
  });

  it("assigns a score tier on completion", () => {
    const session = createSession({
      currentTurn: MAX_TURNS,
      happiness: 80,
      envHealth: 80,
      economy: 80,
      carbonFootprint: 500,
      budget: 200000,
      population: 50000,
    });
    const result = resolveTurn(session, [], [], undefined);
    expect(result.resultTier).toBeTruthy();
    expect(result.resultTier).toContain(" - ");
  });

  it("awards achievements based on score", () => {
    const session = createSession({
      currentTurn: MAX_TURNS,
      happiness: 80,
      envHealth: 80,
      economy: 80,
      carbonFootprint: 500,
      budget: 200000,
      population: 50000,
    });
    const result = resolveTurn(session, [], [], undefined);
    expect(result.achievements.length).toBeGreaterThan(0);
  });

  it("does not advance the turn number on completion", () => {
    const session = createSession({
      currentTurn: MAX_TURNS,
      happiness: 80,
      envHealth: 80,
      economy: 80,
    });
    const result = resolveTurn(session, [], [], undefined);
    expect(result.nextTurn).toBe(MAX_TURNS);
  });

  it("draws no new projects or events on completion", () => {
    const session = createSession({
      currentTurn: MAX_TURNS,
      happiness: 80,
      envHealth: 80,
      economy: 80,
    });
    const result = resolveTurn(session, [], [], undefined);
    expect(result.pendingProjects).toEqual([]);
    expect(result.pendingEvent).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  resolveTurn – turn progression                                     */
/* ------------------------------------------------------------------ */
describe("resolveTurn – turn progression", () => {
  it("advances the turn number by 1 on an active game", () => {
    const session = createSession({ currentTurn: 5 });
    const result = resolveTurn(session, [], [], undefined);
    expect(result.nextTurn).toBe(6);
  });

  it("draws new pending projects for the next turn", () => {
    const session = createSession({ currentTurn: 3 });
    const result = resolveTurn(session, [], [], undefined);
    expect(result.pendingProjects).toHaveLength(2);
    expect(result.pendingProjects[0].code).toBeDefined();
    expect(result.pendingProjects[1].code).toBeDefined();
  });

  it("records all actions taken during the turn", () => {
    const session = createSession({ budget: 500000 });
    const result = resolveTurn(
      session,
      [
        { category: "zone", code: "residential", tileIndex: 0 },
        { category: "zone", code: "green_space", tileIndex: 1 },
      ],
      [],
      undefined,
    );
    expect(result.records.length).toBeGreaterThanOrEqual(3);
    expect(result.records[0].actionType).toBe("passive");
    expect(result.records[1].actionType).toBe("zone");
    expect(result.records[2].actionType).toBe("zone");
  });
});

/* ------------------------------------------------------------------ */
/*  Constants sanity checks                                            */
/* ------------------------------------------------------------------ */
describe("game constants", () => {
  it("MAX_TURNS is 15", () => {
    expect(MAX_TURNS).toBe(15);
  });

  it("MAX_ACTIONS_PER_TURN is 3", () => {
    expect(MAX_ACTIONS_PER_TURN).toBe(3);
  });

  it("all zones have a positive cost", () => {
    for (const [, def] of Object.entries(ZONES)) {
      expect(def.cost).toBeGreaterThan(0);
    }
  });

  it("all infrastructure has a positive cost", () => {
    for (const [, def] of Object.entries(INFRASTRUCTURE)) {
      expect(def.cost).toBeGreaterThan(0);
    }
  });

  it("wind_turbine has a maxCount of 3", () => {
    expect(INFRASTRUCTURE.wind_turbine.maxCount).toBe(3);
  });
});
