"use client";

import { useEffect, useMemo, useState } from "react";
import startScreenBg from "../art/StartScreen.png";
import introScreenBg from "../art/intro_screen.png";
import Typewriter from "../components/typewriter";
import roadTexture from "../art/road.png";
import rockTexture from "../art/rock.png";

type Metrics = {
  happiness: number;
  envHealth: number;
  econStability: number;
  carbon: number;
};

type CityState = {
  geography: string;
  gridW: number;
  gridH: number;
  tiles: { zone: string; building: string; floodplain: boolean }[][];
  metrics: Metrics;
  activePolicies: unknown[];
  lastEventTurn: number;
};

type City = {
  id: string;
  name: string;
  difficulty: string;
  seed: number;
  turn: number;
  budget: number;
  state: CityState;
};

type Action = {
  code: string;
  label: string;
  cost: number;
  delta: Partial<Metrics>;
  requiresTile?: boolean;
};

type Screen = "start" | "intro" | "game";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const LOCAL_KEY = "ecocity-city-id";

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>("start");
  const [city, setCity] = useState<City | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSavedCity, setHasSavedCity] = useState(false);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [lastDelta, setLastDelta] = useState<{
    metrics: Partial<Metrics> | null;
    budget: number;
  }>({ metrics: null, budget: 0 });
  const [showOverlay, setShowOverlay] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [customIntroText, setCustomIntroText] = useState<string | null>(null);

  // Fetch available actions and resume saved city on mount
  useEffect(() => {
    fetch(`${API_BASE}/actions`)
      .then((r) => r.json())
      .then((data) => setActions(data.actions ?? []))
      .catch(() => setActions([]));

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(LOCAL_KEY);
      setHasSavedCity(Boolean(saved));
      if (saved) resumeCity(saved);
    }
  }, []);

  const resumeCity = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/city/${id}`);
      if (!res.ok) throw new Error("City not found");
      const data = await res.json();
      setCity(data);
      setHasSavedCity(true);
      setScreen("game");
    } catch (err) {
      setError((err as Error).message);
      localStorage.removeItem(LOCAL_KEY);
    } finally {
      setLoading(false);
    }
  };

  const createCity = async () => {
    setLoading(true);
    setError(null);
    try {
      setGameOver(false);
      setCustomIntroText(null);
      const res = await fetch(`${API_BASE}/city`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Eden", difficulty: "normal" }),
      });
      if (!res.ok) throw new Error("Failed to create city");
      const data = await res.json();
      setCity(data);
      localStorage.setItem(LOCAL_KEY, data.id);
      setHasSavedCity(true);
      setScreen("game");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const takeAction = async (actionCode: string) => {
    if (!city) return;
    if (gameOver || city.turn >= 10) {
      setError("Game over. Start a new city.");
      return;
    }
    const def = actions.find((a) => a.code === actionCode);
    if (def?.requiresTile && selectedTile == null) {
      setError("Select a tile first");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const prevMetrics = city.state.metrics;
      const prevBudget = city.budget;
      const res = await fetch(`${API_BASE}/city/${city.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: actionCode,
          payload: def?.requiresTile ? { tileIndex: selectedTile } : undefined,
        }),
      });
      if (res.status === 409) {
        const data = await res.json();
        setError(data.error ?? "Action blocked");
        return;
      }
      if (!res.ok) throw new Error("Action failed");
      const data = await res.json();
      setCity((prev) => (prev ? { ...prev, ...data } : data));
      const label = def?.label ?? actionCode;
      setToast(`Turn ${data.turn}: ${label}`);
      setTimeout(() => setToast(null), 2200);
      const metricDelta =
        data.metricsDelta ??
        ({
          happiness: data.metrics.happiness - prevMetrics.happiness,
          envHealth: data.metrics.envHealth - prevMetrics.envHealth,
          econStability: data.metrics.econStability - prevMetrics.econStability,
          carbon: data.metrics.carbon - prevMetrics.carbon,
        } satisfies Metrics);
      setLastDelta({ metrics: metricDelta, budget: data.budget - prevBudget });
      setShowOverlay(true);

      if (data.turn >= 10) {
        setGameOver(true);
        const summary = `Game Over at Turn 10.
Final metrics:
Happiness ${data.metrics.happiness}
Environment ${data.metrics.envHealth}
Economy ${data.metrics.econStability}
Carbon ${data.metrics.carbon}
Budget ${data.budget}`;
        setCustomIntroText(summary);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetCity = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(LOCAL_KEY);
      setHasSavedCity(false);
    }
    setCity(null);
    setScreen("start");
  };

  const introText = useMemo(
    () => `Welcome, City Planner.

You have been given control of this growing city.
Your decisions will shape how people live, how the economy grows, and how the environment changes.

Balance people, planet, and profit. Keep carbon in check.`,
    [],
  );

  if (screen === "start") {
    return (
      <div
        className="start-screen"
        style={{ backgroundImage: `url(${startScreenBg.src})` }}
      >
        <h1 className="start-screen-title">Eco City Builder</h1>
        <div className="start-screen-btn-wrap">
          <button
            type="button"
            className="start-screen-btn"
            onClick={() => setScreen("intro")}
            disabled={loading}
          >
            {loading ? "Loading..." : "Start Game"}
          </button>
        </div>
        {hasSavedCity && (
          <p style={{ color: "#fff", zIndex: 1 }}>
            Resume last city available on next screen.
          </p>
        )}
      </div>
    );
  }

  if (screen === "intro") {
    return (
      <div
        className="intro-screen"
        style={{ backgroundImage: `url(${introScreenBg.src})` }}
      >
        <div className="intro-text-box">
          <Typewriter text={customIntroText ?? introText} speed={45} />
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
            <button
              type="button"
              className="intro-continue"
              onClick={createCity}
              disabled={loading}
            >
              {loading ? "Creating..." : "Start New City"}
            </button>
            {hasSavedCity && (
              <button
                type="button"
                className="intro-continue"
                style={{ background: "#0ea5e9" }}
                onClick={() => {
                  const id = typeof window !== "undefined" ? localStorage.getItem(LOCAL_KEY) : null;
                  if (id) resumeCity(id);
                }}
              >
                Resume Saved City
              </button>
            )}
          </div>
          {error && <p style={{ color: "crimson", marginTop: "0.5rem" }}>{error}</p>}
        </div>
      </div>
    );
  }

  if (!city) {
    return (
      <main className="game-shell">
        <p>Loading city...</p>
      </main>
    );
  }

  return (
    <main className="game-shell">
      {toast && <div className="turn-toast">{toast}</div>}
      {showOverlay && lastDelta.metrics && (
        <div className="turn-overlay">
          <div className="turn-card">
            <h2>{gameOver ? "Game Over" : "Turn Complete"}</h2>
            <p className="muted">
              {gameOver ? "Reached turn 10. Final city status:" : "Here’s what changed this turn:"}
            </p>
            <div className="delta-grid">
              {[
                ["Happiness", lastDelta.metrics.happiness ?? 0],
                ["Environment", lastDelta.metrics.envHealth ?? 0],
                ["Economy", lastDelta.metrics.econStability ?? 0],
                ["Carbon", lastDelta.metrics.carbon ?? 0],
                ["Budget", lastDelta.budget],
              ].map(([label, val]) => (
                <div key={label as string} className="delta-chip">
                  <span>{label as string}</span>
                  <strong className={Number(val) > 0 ? "pos" : Number(val) < 0 ? "neg" : ""}>
                    {Number(val) > 0 ? "+" : ""}
                    {val as number}
                  </strong>
                </div>
              ))}
            </div>
            <button
              className="overlay-btn"
              onClick={() => {
                setShowOverlay(false);
                if (gameOver) {
                  setScreen("intro");
                  setSelectedTile(null);
                }
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}
      <header className="topbar">
        <div>
          <h1>{city.name}</h1>
          <p className="muted">
            Turn {city.turn} · Budget {city.budget} · Difficulty {city.difficulty}
          </p>
        </div>
        <div className="topbar-actions">
          <button onClick={resetCity} className="ghost">
            Reset
          </button>
        </div>
      </header>

      <section className="grid-metrics">
        <div className="city-card">
          <h3>City Grid</h3>
          <div
            className="city-grid"
            style={{
              gridTemplateColumns: `repeat(${city.state.gridW}, minmax(0, 1fr))`,
            }}
          >
            {city.state.tiles.flat().map((tile, idx) => (
              <button
                key={idx}
                type="button"
                className={`tile ${selectedTile === idx ? "selected" : ""} zone-${tile.zone}`}
                data-zone={tile.zone}
                title={
                  tile.zone === "empty"
                    ? "Empty lot"
                    : `${tile.zone} • ${tile.building || "structure"}`
                }
                onClick={() => setSelectedTile(idx)}
                style={
                  tile.zone === "road"
                    ? {
                        backgroundImage: `url(${roadTexture.src})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        borderColor: "#cbd5e1",
                        transform:
                          idx >= city.state.gridW * Math.floor(city.state.gridH / 2) &&
                          idx < city.state.gridW * Math.floor(city.state.gridH / 2) + city.state.gridW
                            ? "rotate(90deg)"
                            : undefined,
                      }
                    : tile.zone === "rock"
                      ? {
                          backgroundImage: `url(${rockTexture.src})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                          borderColor: "#94a3b8",
                        }
                      : undefined
                }
              >
                <span className="tile-icon" aria-hidden>
                  {tileIcon(tile.zone, tile.building)}
                </span>
              </button>
            ))}
          </div>
          <p className="muted">Geography: {city.state.geography}</p>
        </div>

        <div className="metrics-card">
          <h3>City Health</h3>
          <MetricBar label="Happiness" value={city.state.metrics.happiness} color="#22c55e" />
          <MetricBar label="Environment" value={city.state.metrics.envHealth} color="#10b981" />
          <MetricBar label="Economy" value={city.state.metrics.econStability} color="#f59e0b" />
          <MetricBar label="Carbon" value={city.state.metrics.carbon} color="#ef4444" inverse />
        </div>
      </section>

      <section className="actions-card">
        <div>
          <h3>Choose an Action</h3>
          <p className="muted">Spends budget, shifts metrics, advances the turn.</p>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="actions-grid">
          {actions.map((action) => (
            <button
              key={action.code}
              className="action-btn"
              onClick={() => takeAction(action.code)}
              disabled={loading || gameOver}
            >
              <div className="action-top">
                <span>{action.label}</span>
                <span className="cost">
                  {action.cost >= 0 ? `-${action.cost} budget` : `+${Math.abs(action.cost)} budget`}
                </span>
              </div>
              {action.requiresTile && (
                <div className="requires">Select a tile</div>
              )}
              <div className="delta-row">
                {["happiness", "envHealth", "econStability", "carbon"].map((k) => {
                  const val = action.delta[k as keyof Metrics];
                  if (val === undefined) return null;
                  const sign = val > 0 ? "+" : "";
                  return (
                    <span key={k} className="delta">
                      {k === "econStability" ? "econ" : k.replace("envHealth", "env")} {sign}
                      {val}
                    </span>
                  );
                })}
              </div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function tileIcon(zone: string, building: string) {
  if (zone === "empty") return "·";
  if (building === "housing") return "🏠";
  if (building === "park") return "🌳";
  if (building === "transit_hub") return "🚉";
  if (building === "factory") return "🏭";
  if (building === "road") return "";
  if (building === "rock") return "";
  // Fallbacks by zone
  if (zone === "residential") return "🏘️";
  if (zone === "green") return "🌲";
  if (zone === "infrastructure") return "🚏";
  if (zone === "industrial") return "🏭";
  if (zone === "road") return "";
  if (zone === "rock") return "";
  return "❓";
}

function MetricBar({
  label,
  value,
  color,
  inverse = false,
}: {
  label: string;
  value: number;
  color: string;
  inverse?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const barStyle = inverse
    ? { background: `linear-gradient(90deg, ${color} ${pct}%, #1f2937 ${pct}%)` }
    : { background: `linear-gradient(90deg, ${color} ${pct}%, #e5e7eb ${pct}%)` };
  return (
    <div className="metric">
      <div className="metric-label">
        <span>{label}</span>
        <span>{pct}</span>
      </div>
      <div className="metric-bar" style={barStyle} />
    </div>
  );
}
