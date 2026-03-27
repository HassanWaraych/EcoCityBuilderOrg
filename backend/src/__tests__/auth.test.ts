import { describe, it, expect, vi } from "vitest";
import { hashPassword, verifyPassword, signToken, requireAuth } from "../auth.ts";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";

/* ------------------------------------------------------------------ */
/*  hashPassword & verifyPassword                                      */
/* ------------------------------------------------------------------ */
describe("hashPassword", () => {
  it("returns a bcrypt hash string", async () => {
    const hash = await hashPassword("secureP@ss123");
    expect(hash).toBeTruthy();
    expect(hash).not.toBe("secureP@ss123");
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("produces different hashes for the same input (salted)", async () => {
    const hash1 = await hashPassword("samePassword");
    const hash2 = await hashPassword("samePassword");
    expect(hash1).not.toBe(hash2);
  });
});

describe("verifyPassword", () => {
  it("returns true for correct password", async () => {
    const hash = await hashPassword("myPassword99");
    const valid = await verifyPassword("myPassword99", hash);
    expect(valid).toBe(true);
  });

  it("returns false for wrong password", async () => {
    const hash = await hashPassword("myPassword99");
    const valid = await verifyPassword("wrongPassword", hash);
    expect(valid).toBe(false);
  });

  it("returns false for empty password against a valid hash", async () => {
    const hash = await hashPassword("realPassword");
    const valid = await verifyPassword("", hash);
    expect(valid).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  signToken                                                          */
/* ------------------------------------------------------------------ */
describe("signToken", () => {
  it("returns a valid JWT string", () => {
    const token = signToken({
      playerId: "abc-123",
      email: "player@test.com",
      username: "testplayer",
    });
    expect(token).toBeTruthy();
    expect(token.split(".")).toHaveLength(3);
  });

  it("encodes the claims in the payload", () => {
    const claims = {
      playerId: "abc-123",
      email: "player@test.com",
      username: "testplayer",
    };
    const token = signToken(claims);
    const decoded = jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
    expect(decoded.playerId).toBe("abc-123");
    expect(decoded.email).toBe("player@test.com");
    expect(decoded.username).toBe("testplayer");
  });

  it("sets a 24h expiry", () => {
    const token = signToken({
      playerId: "abc-123",
      email: "player@test.com",
      username: "testplayer",
    });
    const decoded = jwt.decode(token) as { exp: number; iat: number };
    expect(decoded.exp - decoded.iat).toBe(24 * 60 * 60);
  });
});

/* ------------------------------------------------------------------ */
/*  requireAuth middleware                                              */
/* ------------------------------------------------------------------ */
describe("requireAuth", () => {
  function mockReqResNext(authHeader?: string) {
    const req = {
      header: vi.fn((name: string) =>
        name.toLowerCase() === "authorization" ? authHeader : undefined,
      ),
      auth: undefined,
    } as unknown as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    return { req, res, next };
  }

  it("calls next() and attaches claims with a valid token", () => {
    const token = signToken({
      playerId: "p-1",
      email: "test@test.com",
      username: "tester",
    });
    const { req, res, next } = mockReqResNext(`Bearer ${token}`);

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.auth).toBeDefined();
    expect(req.auth!.playerId).toBe("p-1");
    expect(req.auth!.email).toBe("test@test.com");
  });

  it("returns 401 when no Authorization header is present", () => {
    const { req, res, next } = mockReqResNext(undefined);

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing bearer token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization header does not start with Bearer", () => {
    const { req, res, next } = mockReqResNext("Basic abc123");

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid", () => {
    const { req, res, next } = mockReqResNext("Bearer invalid.token.here");

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is expired", () => {
    const expiredToken = jwt.sign(
      { playerId: "p-1", email: "test@test.com", username: "tester" },
      JWT_SECRET,
      { expiresIn: "0s" },
    );
    const { req, res, next } = mockReqResNext(`Bearer ${expiredToken}`);

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
