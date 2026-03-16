import "dotenv/config";
import express from "express";
import authRoutes from "./routes/auth.routes.ts";
import gameRoutes from "./routes/game.routes.ts";
import playerRoutes from "./routes/player.routes.ts";
import { ping, runMigrations } from "./db.ts";

const app = express();
const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ app: "EcoCity Builder API", version: "v1" });
});

app.get("/health", async (_req, res) => {
  const dbOk = await ping();
  res.status(dbOk ? 200 : 503).json({ ok: dbOk, db: dbOk });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/game", gameRoutes);
app.use("/api/v1/players", playerRoutes);

const port = Number(process.env.PORT || 4000);

runMigrations()
  .then(() => {
    app.listen(port, () => {
      console.log(`Backend on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start backend", error);
    process.exit(1);
  });
