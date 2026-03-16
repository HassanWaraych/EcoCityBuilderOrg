import { describe, it, expect, beforeEach } from "vitest";
import { saveAuth, getToken, getStoredPlayer, clearAuth } from "../auth";
import type { Player } from "../types";

const mockPlayer: Player = {
  playerId: "p-123",
  username: "testplayer",
  email: "test@ecocity.com",
  totalGames: 5,
  bestScore: 75000,
};

beforeEach(() => {
  localStorage.clear();
});

/* ------------------------------------------------------------------ */
/*  saveAuth                                                           */
/* ------------------------------------------------------------------ */
describe("saveAuth", () => {
  it("stores token in localStorage", () => {
    saveAuth("my-jwt-token", mockPlayer);
    expect(localStorage.getItem("ecocity_token")).toBe("my-jwt-token");
  });

  it("stores player JSON in localStorage", () => {
    saveAuth("my-jwt-token", mockPlayer);
    const stored = localStorage.getItem("ecocity_player");
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toEqual(mockPlayer);
  });
});

/* ------------------------------------------------------------------ */
/*  getToken                                                           */
/* ------------------------------------------------------------------ */
describe("getToken", () => {
  it("returns the stored token", () => {
    localStorage.setItem("ecocity_token", "saved-token");
    expect(getToken()).toBe("saved-token");
  });

  it("returns null when no token is stored", () => {
    expect(getToken()).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  getStoredPlayer                                                    */
/* ------------------------------------------------------------------ */
describe("getStoredPlayer", () => {
  it("returns the parsed player object", () => {
    localStorage.setItem("ecocity_player", JSON.stringify(mockPlayer));
    const player = getStoredPlayer();
    expect(player).toEqual(mockPlayer);
  });

  it("returns null when no player is stored", () => {
    expect(getStoredPlayer()).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  clearAuth                                                          */
/* ------------------------------------------------------------------ */
describe("clearAuth", () => {
  it("removes token and player from localStorage", () => {
    saveAuth("token-to-clear", mockPlayer);
    expect(getToken()).toBe("token-to-clear");
    expect(getStoredPlayer()).toEqual(mockPlayer);

    clearAuth();

    expect(getToken()).toBeNull();
    expect(getStoredPlayer()).toBeNull();
  });

  it("does not throw when localStorage is already empty", () => {
    expect(() => clearAuth()).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/*  Round-trip: save → get → clear                                     */
/* ------------------------------------------------------------------ */
describe("auth round-trip", () => {
  it("saves, retrieves, and clears auth data correctly", () => {
    saveAuth("round-trip-token", mockPlayer);

    expect(getToken()).toBe("round-trip-token");
    expect(getStoredPlayer()?.playerId).toBe("p-123");

    clearAuth();

    expect(getToken()).toBeNull();
    expect(getStoredPlayer()).toBeNull();
  });
});
