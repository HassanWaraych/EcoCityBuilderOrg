import "dotenv/config";
import express from "express";
import { ping } from "./db.ts";
import cityRoutes from "./routes/city.routes.ts";

const app = express();

// Minimal CORS so the Next.js frontend (localhost:3000) can call the API.
app.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || "http://localhost:3000";
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  return next();
});

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ app: "EcoCity Builder API", health: "/health" });
});

app.get("/health", async (_req, res) => {
  const dbOk = await ping();
  res.status(dbOk ? 200 : 503).json({ ok: dbOk, db: dbOk });
});

app.use("/api", cityRoutes);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`Backend on http://localhost:${port}`));
