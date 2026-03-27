import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

export type AuthClaims = {
  playerId: string;
  email: string;
  username: string;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthClaims;
    }
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(claims: AuthClaims): string {
  return jwt.sign(claims, JWT_SECRET, { expiresIn: "24h" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  try {
    const token = header.slice("Bearer ".length);
    const decoded = jwt.verify(token, JWT_SECRET) as AuthClaims;
    req.auth = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
