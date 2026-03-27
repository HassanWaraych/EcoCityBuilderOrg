"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { fetchCatalog, fetchSession, submitTurn } from "../../../lib/api";
import { getStoredPlayer } from "../../../lib/auth";
import { difficultyLabel, difficultyNote } from "../../../lib/performance";
import type { CatalogAction, Session, Tile } from "../../../lib/types";

type Catalog = {
  zones: CatalogAction[];
  infrastructure: CatalogAction[];
};

type ToastDelta = { label: string; value: number };

export default function GamePage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [catalog, setCatalog] = useState<Catalog>({ zones: [], infrastructure: [] });
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [queuedActions, setQueuedActions] = useState<
    { category: "zone" | "infrastructure"; code: string; tileIndex: number }[]
  >([]);
  const [projectDecisions, setProjectDecisions] = useState<Record<string, "approve" | "reject">>({});
  const [eventResponseIndex, setEventResponseIndex] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toastDeltas, setToastDeltas] = useState<ToastDelta[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!getStoredPlayer()) {
      router.replace("/auth/login");
      return;
    }

    Promise.all([fetchSession(params.sessionId), fetchCatalog()])
      .then(([sessionResult, catalogResult]) => {
        if (sessionResult.session.status !== "active") {
          router.replace(`/game/${params.sessionId}/results`);
          return;
        }
        setSession(sessionResult.session);
        setCatalog({
          zones: catalogResult.zones,
          infrastructure: catalogResult.infrastructure,
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load game");
      })
      .finally(() => setLoading(false));
  }, [params.sessionId, router]);

  function showToast(prev: Session, next: Session) {
    const keys: (keyof Session)[] = ["happiness", "envHealth", "economy", "carbonFootprint", "budget", "population"];
    const labels: Record<string, string> = {
      happiness: "😊 Happiness",
      envHealth: "🌿 Env",
      economy: "💰 Economy",
      carbonFootprint: "☁️ Carbon",
      budget: "🏦 Budget",
      population: "👥 Pop",
    };
    const deltas: ToastDelta[] = keys
      .map((k) => ({ label: labels[k]!, value: (next[k] as number) - (prev[k] as number) }))
      .filter((d) => d.value !== 0);
    if (deltas.length === 0) return;
    setToastDeltas(deltas);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 4500);
  }

  function queueAction(category: "zone" | "infrastructure", code: string) {
    if (selectedTile == null) {
      setError("Select a tile first");
      return;
    }
    if (queuedActions.length >= 3) {
      setError("You can queue up to 3 actions");
      return;
    }
    setQueuedActions((current) => [...current, { category, code, tileIndex: selectedTile }]);
    setError(null);
  }

  async function resolveTurn() {
    if (!session) return;
    if (session.pendingProjects.some((project) => !projectDecisions[project.code])) {
      setError("Approve or reject both proposals before ending the turn");
      return;
    }
    if (session.pendingEvent && eventResponseIndex == null) {
      setError("Choose an event response before ending the turn");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await submitTurn(session.sessionId, {
        actions: queuedActions,
        projectDecisions: session.pendingProjects.map((project) => ({
          code: project.code,
          decision: projectDecisions[project.code],
        })),
        ...(session.pendingEvent ? { eventResponseIndex } : {}),
      });
      showToast(session, result.session);
      setSession(result.session);
      setQueuedActions([]);
      setProjectDecisions({});
      setEventResponseIndex(undefined);
      setNotice(`Turn resolved with ${result.records.length} decision records.`);

      if (result.session.status !== "active") {
        router.push(`/game/${session.sessionId}/results`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Turn resolution failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !session) {
    return <main className="app-shell panel">Loading session...</main>;
  }

  const turnPct = Math.min(100, ((session.currentTurn - 1) / 15) * 100);
  const budgetOk = session.budget > 0;
  const metricsOk = session.happiness > 0 && session.envHealth > 0 && session.economy > 0;
  const completed = session.status !== "active";

  return (
    <main className="app-shell">
      {/* Turn progress bar */}
      <div className="turn-progress-wrap">
        <div className="turn-progress-header">
          <span className="small-kicker">Turn {session.currentTurn} of 15</span>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            {session.currentTurn <= 5 ? "🌱 Early game" : session.currentTurn <= 10 ? "⚡ Mid game" : "🔥 Late game"}
          </span>
        </div>
        <div className="turn-progress-track">
          <div className="turn-progress-fill" style={{ width: `${turnPct}%` }} />
        </div>
      </div>

      <div className="split" style={{ marginBottom: 18 }}>
        <div>
          <h1 className="route-title">{session.cityName}</h1>
          <p className="muted">
            <span className={`difficulty-chip difficulty-${session.difficulty}`}>{difficultyLabel(session.difficulty)}</span>
            {" "}
            {difficultyNote(session.difficulty)}
          </p>
        </div>
        <div className="inline-row">
          <Link className="btn-ghost" href="/dashboard">
            Dashboard
          </Link>
          <Link className="btn-secondary" href={`/game/${session.sessionId}/results`}>
            Results
          </Link>
        </div>
      </div>

      {/* HUD — metric bars */}
      <section className="hud">
        <HudMetric label="Happiness" value={session.happiness} icon="😊" />
        <HudMetric label="Env Health" value={session.envHealth} icon="🌿" />
        <HudMetric label="Economy" value={session.economy} icon="💰" />
        <HudMetric label="Carbon" value={session.carbonFootprint} icon="☁️" isInverse />
        <HudMetric label="Budget" value={session.budget} icon="🏦" isMoney />
        <HudMetric label="Population" value={session.population} icon="👥" isMoney />
      </section>

      <section className="game-grid">
        <div className="play-area">
          <div className="grid-card">
            <div className="split">
              <div>
                <h2 className="section-title">City grid</h2>
                <p className="muted">Select a tile, queue up to three build actions, answer both proposals, and survive all 15 turns.</p>
              </div>
              <span className="pill">Queued {queuedActions.length}/3</span>
            </div>
            <div
              className="city-grid"
              style={{ gridTemplateColumns: `repeat(${session.state.gridW}, minmax(0, 1fr))` }}
            >
              {session.state.tiles.flat().map((tile, index) => {
                const previewTile = tileWithQueuedAction(tile, index, queuedActions);
                const art = tileArt(previewTile.zone, previewTile.infrastructure, previewTile.terrain);

                return (
                  <button
                    className="tile-button"
                    key={index}
                    type="button"
                    data-zone={previewTile.zone ?? undefined}
                    data-terrain={previewTile.terrain}
                    data-selected={selectedTile === index}
                    data-preview={previewTile.isPreview ? "true" : "false"}
                    onClick={() => setSelectedTile(index)}
                  >
                    <span className="tile-floor" />
                    <span
                      className={`mini-structure ${structureClass(
                        previewTile.zone,
                        previewTile.infrastructure,
                        previewTile.terrain,
                      )}`}
                    >
                      {art ? (
                        <img className="tile-sprite" src={art} alt="" />
                      ) : (
                        <>
                          <span className="mini-roof" />
                          <span className="mini-body" />
                          <span className="mini-detail" />
                        </>
                      )}
                    </span>
                    <span className="tile-icon">
                      {tileGlyph(previewTile.zone, previewTile.infrastructure, previewTile.terrain)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="table-card">
            <h2 className="section-title">Queued actions</h2>
            <div className="history-list">
              {queuedActions.map((action, index) => (
                <div className="history-item" key={`${action.code}-${index}`}>
                  <div className="split">
                    <strong>{action.code.replaceAll("_", " ")}</strong>
                    <button
                      className="btn-ghost"
                      type="button"
                      onClick={() =>
                        setQueuedActions((current) => current.filter((_, currentIndex) => currentIndex !== index))
                      }
                    >
                      Remove
                    </button>
                  </div>
                  <p className="muted">
                    {action.category} on tile {action.tileIndex + 1}
                  </p>
                </div>
              ))}
              {queuedActions.length === 0 && <p className="muted">No actions queued yet.</p>}
            </div>
            <div className="history-item" style={{ marginTop: 12 }}>
              <strong>Selected tile preview</strong>
              <p className="muted">
                {selectedTile == null
                  ? "Choose a tile to build on it."
                  : tilePreviewText(selectedTile, queuedActions)}
              </p>
            </div>
          </div>
        </div>

        <aside className="sidebar-card">
          {/* Objectives panel */}
          <section className="stack">
            <h2 className="section-title">Objectives</h2>
            <div className="objectives-panel">
              <ObjectiveItem
                done={budgetOk}
                failed={!budgetOk}
                label="Keep budget above zero"
              />
              <ObjectiveItem
                done={metricsOk}
                failed={!metricsOk}
                label="All core metrics above zero"
              />
              <ObjectiveItem
                done={completed}
                failed={false}
                label="Survive all 15 turns"
              />
            </div>
          </section>

          <section className="stack">
            <div className="split">
              <h2 className="section-title">Zones</h2>
              <span className="muted">Selected tile: {selectedTile == null ? "-" : selectedTile + 1}</span>
            </div>
            <div className="action-list">
              {catalog.zones.map((zone) => (
                <button className="action-card" key={zone.code} type="button" onClick={() => queueAction("zone", zone.code)}>
                  <div className="card-head">
                    <img className="card-thumb" src={actionArt(zone.code, "zone")} alt="" />
                    <div className="card-meta">
                      <div className="split">
                        <strong>{zone.label}</strong>
                        <span className="pill">${zone.cost.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <p className="muted">{formatDelta(zone.deltas)}</p>
                  {zone.requires && (
                    <p style={{ fontSize: "0.78rem", color: "#f08963", marginTop: 4 }}>
                      🔒 {zone.requires.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section className="stack">
            <h2 className="section-title">Infrastructure</h2>
            <div className="action-list">
              {catalog.infrastructure.map((item) => (
                <button
                  className="action-card"
                  key={item.code}
                  type="button"
                  onClick={() => queueAction("infrastructure", item.code)}
                >
                  <div className="card-head">
                    <img className="card-thumb" src={actionArt(item.code, "infrastructure")} alt="" />
                    <div className="card-meta">
                      <div className="split">
                        <strong>{item.label}</strong>
                        <span className="pill">${item.cost.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <p className="muted">{formatDelta(item.deltas)}</p>
                  {item.requires && (
                    <p style={{ fontSize: "0.78rem", color: "#f08963", marginTop: 4 }}>
                      🔒 {item.requires.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section className="stack">
            <h2 className="section-title">Proposals</h2>
            <div className="proposal-list">
              {session.pendingProjects.map((project) => (
                <div className="proposal-card" key={project.code}>
                  <div className="card-head">
                    <img className="card-thumb" src={projectArt(project.code)} alt="" />
                    <div className="card-meta">
                      <strong>{project.label}</strong>
                    </div>
                  </div>
                  <p className="muted">Approve: {formatDelta(project.deltas)} · Cost ${project.cost.toLocaleString()}</p>
                  <p className="muted">Reject: {formatDelta(project.rejectPenalty)}</p>
                  <div className="inline-row">
                    <button
                      className={projectDecisions[project.code] === "approve" ? "btn" : "btn-secondary"}
                      type="button"
                      onClick={() =>
                        setProjectDecisions((current) => ({ ...current, [project.code]: "approve" }))
                      }
                    >
                      Approve
                    </button>
                    <button
                      className={projectDecisions[project.code] === "reject" ? "btn" : "btn-ghost"}
                      type="button"
                      onClick={() =>
                        setProjectDecisions((current) => ({ ...current, [project.code]: "reject" }))
                      }
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {session.pendingEvent && (
            <section className="stack">
              <h2 className="section-title">{session.pendingEvent.title}</h2>
              <p className="muted">{session.pendingEvent.description}</p>
              {session.pendingEvent.options.map((option, index) => (
                <button
                  className={eventResponseIndex === index ? "action-card" : "proposal-card"}
                  key={`${session.pendingEvent?.code}-${index}`}
                  type="button"
                  onClick={() => setEventResponseIndex(index)}
                >
                  <div className="card-head">
                    <img
                      className="card-thumb"
                      src={eventArt(session.pendingEvent?.code ?? "", index)}
                      alt=""
                    />
                    <div className="card-meta">
                      <strong>{option.label}</strong>
                    </div>
                  </div>
                  <p className="muted">
                    {formatDelta(option.deltas)}
                    {option.budgetDelta ? ` · Budget ${signedNumber(option.budgetDelta)}` : ""}
                  </p>
                </button>
              ))}
            </section>
          )}

          {error && <p className="error-text">{error}</p>}
          {notice && <p className="success-text">{notice}</p>}
          <button className="btn" type="button" onClick={resolveTurn} disabled={submitting}>
            {submitting ? "Resolving..." : "Resolve turn"}
          </button>
        </aside>
      </section>

      {/* Turn toast */}
      <div className={`turn-toast ${toastVisible ? "toast-visible" : ""}`}>
        <span style={{ fontSize: "1.2rem" }}>📊</span>
        <div className="toast-delta">
          {toastDeltas.map((d) => (
            <span
              key={d.label}
              className={`toast-delta-item ${d.value > 0 ? "pos" : d.value < 0 ? "neg" : "neu"}`}
            >
              {d.label} {d.value > 0 ? "+" : ""}{d.value}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}

function HudMetric({
  label,
  value,
  icon,
  isInverse = false,
  isMoney = false,
}: {
  label: string;
  value: number;
  icon: string;
  isInverse?: boolean;
  isMoney?: boolean;
}) {
  const pct = isMoney ? Math.min(100, Math.max(0, (value / 50000) * 100)) : Math.min(100, Math.max(0, value));
  const effectivePct = isInverse ? 100 - pct : pct;
  const barClass =
    effectivePct >= 60 ? "bar-green" : effectivePct >= 30 ? "bar-amber" : "bar-red";

  return (
    <div className="metric-card hud-metric">
      <div className="hud-metric-header">
        <span className="small-kicker">{icon} {label}</span>
      </div>
      <div className="hud-metric-value">{typeof value === "number" ? value.toLocaleString() : value}</div>
      <div className="metric-bar-track">
        <div className={`metric-bar-fill ${barClass}`} style={{ width: `${effectivePct}%` }} />
      </div>
    </div>
  );
}

function ObjectiveItem({ done, failed, label }: { done: boolean; failed: boolean; label: string }) {
  const cls = done ? "obj-done" : failed ? "obj-failed" : "";
  const icon = done ? "✅" : failed ? "❌" : "⭕";
  return (
    <div className={`objective-item ${cls}`}>
      <span className="objective-icon">{icon}</span>
      <span className="objective-label">{label}</span>
    </div>
  );
}

function tileGlyph(zone: string | null, infrastructure: string | null, terrain: string) {
  if (terrain === "rock") return "R";
  if (infrastructure === "road_network") return "RD";
  if (infrastructure === "public_transit") return "TR";
  if (infrastructure === "water_treatment") return "WT";
  if (infrastructure === "wind_turbine") return "WN";
  if (infrastructure === "waste_management") return "WM";
  if (infrastructure === "bike_lane") return "BK";
  if (zone === "residential") return "H";
  if (zone === "commercial") return "C";
  if (zone === "industrial") return "I";
  if (zone === "green_space") return "P";
  if (zone === "mixed_use") return "M";
  if (zone === "solar_farm") return "S";
  return "·";
}

function structureClass(zone: string | null, infrastructure: string | null, terrain: string) {
  if (terrain === "rock") return "structure-rock";
  if (infrastructure === "road_network") return "structure-road";
  if (infrastructure === "public_transit") return "structure-transit";
  if (infrastructure === "water_treatment") return "structure-water";
  if (infrastructure === "wind_turbine") return "structure-wind";
  if (infrastructure === "waste_management") return "structure-waste";
  if (infrastructure === "bike_lane") return "structure-bike";
  if (zone === "residential") return "structure-house";
  if (zone === "commercial") return "structure-apartment";
  if (zone === "industrial") return "structure-power";
  if (zone === "green_space") return "structure-park";
  if (zone === "mixed_use") return "structure-mixed";
  if (zone === "solar_farm") return "structure-solar";
  return "structure-empty";
}

function tileArt(zone: string | null, infrastructure: string | null, terrain: string) {
  if (terrain === "rock") return null;
  if (zone === "residential") return "/game-icons-png/house.png";
  if (zone === "commercial") return "/game-icons-png/apartment.png";
  if (zone === "industrial") return "/game-icons-png/factory.png";
  if (zone === "green_space") return "/game-icons-png/park.png";
  if (zone === "mixed_use") return "/game-icons-png/civic.png";
  if (zone === "solar_farm") return "/game-icons-png/solar.png";
  if (infrastructure === "public_transit") return "/game-icons-png/transit.png";
  if (infrastructure === "water_treatment") return "/game-icons-png/water-tower.png";
  if (infrastructure === "waste_management") return "/game-icons-png/waste.png";
  if (infrastructure === "road_network") return "/game-icons-png/road.png";
  if (infrastructure === "wind_turbine") return "/game-icons-png/wind.png";
  if (infrastructure === "bike_lane") return "/game-icons-png/bike.png";
  return null;
}

function tilePreviewText(
  tileIndex: number,
  queuedActions: { category: "zone" | "infrastructure"; code: string; tileIndex: number }[],
) {
  const queued = [...queuedActions].reverse().find((action) => action.tileIndex === tileIndex);
  if (!queued) {
    return `Tile ${tileIndex + 1} is ready for your next zone or infrastructure action.`;
  }

  return `Tile ${tileIndex + 1} will preview ${queued.code.replaceAll("_", " ")} when this turn resolves.`;
}

function tileWithQueuedAction(
  tile: Tile,
  tileIndex: number,
  queuedActions: { category: "zone" | "infrastructure"; code: string; tileIndex: number }[],
) {
  const previewTile: Tile & { isPreview?: boolean } = { ...tile };
  const queuedForTile = queuedActions.filter((action) => action.tileIndex === tileIndex);

  for (const action of queuedForTile) {
    if (action.category === "zone") {
      previewTile.zone = action.code;
    } else {
      previewTile.infrastructure = action.code;
    }
    previewTile.isPreview = true;
  }

  return previewTile;
}

function actionArt(code: string, category: "zone" | "infrastructure") {
  if (category === "zone") {
    if (code === "residential") return "/game-icons-png/house.png";
    if (code === "commercial") return "/game-icons-png/apartment.png";
    if (code === "industrial") return "/game-icons-png/factory.png";
    if (code === "mixed_use") return "/game-icons-png/civic.png";
    if (code === "solar_farm") return "/game-icons-png/solar.png";
    if (code === "green_space") return "/game-icons-png/park.png";
  }

  if (code === "water_treatment") return "/game-icons-png/water-tower.png";
  if (code === "public_transit") return "/game-icons-png/transit.png";
  if (code === "road_network") return "/game-icons-png/road.png";
  if (code === "waste_management") return "/game-icons-png/waste.png";
  if (code === "wind_turbine") return "/game-icons-png/wind.png";
  if (code === "bike_lane") return "/game-icons-png/bike.png";
  return "/game-icons-png/civic.png";
}

function projectArt(code: string) {
  if (code === "corporate_hq") return "/game-icons-png/apartment.png";
  if (code === "community_centre") return "/game-icons-png/civic.png";
  if (code === "coal_power_plant") return "/game-icons-png/factory.png";
  if (code === "affordable_housing") return "/game-icons-png/house.png";
  if (code === "tech_campus") return "/game-icons-png/civic.png";
  if (code === "urban_farm") return "/game-icons-png/park.png";
  return "/game-icons-png/civic.png";
}

function eventArt(eventCode: string, optionIndex: number) {
  if (eventCode === "flash_flood" || eventCode === "drought") return "/game-icons-png/water-tower.png";
  if (eventCode === "economic_boom" || eventCode === "tech_investment_offer") {
    return optionIndex === 0 ? "/game-icons-png/civic.png" : "/game-icons-png/apartment.png";
  }
  if (eventCode === "citizen_protest") return "/game-icons-png/park.png";
  if (eventCode === "disease_outbreak") return "/game-icons-png/water-tower.png";
  return "/game-icons-png/civic.png";
}

function formatDelta(delta: Record<string, number | undefined>) {
  return Object.entries(delta)
    .filter(([, value]) => value != null && value !== 0)
    .map(([key, value]) => `${key}: ${signedNumber(value ?? 0)}`)
    .join(" · ");
}

function signedNumber(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString()}`;
}
