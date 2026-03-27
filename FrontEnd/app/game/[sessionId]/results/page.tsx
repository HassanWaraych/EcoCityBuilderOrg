"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchHistory, fetchSession } from "../../../../lib/api";
import { getStoredPlayer } from "../../../../lib/auth";
import {
  difficultyLabel,
  formatLossReason,
  performanceBrief,
  tierMedal,
} from "../../../../lib/performance";
import type { Session } from "../../../../lib/types";

export default function ResultsPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [history, setHistory] = useState<
    {
      decisionId: string;
      turnNumber: number;
      actionType: string;
      actionDetail: Record<string, unknown>;
      deltas: Record<string, number>;
      cost: number;
      createdAt: string;
    }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getStoredPlayer()) {
      router.replace("/auth/login");
      return;
    }
    Promise.all([fetchSession(params.sessionId), fetchHistory(params.sessionId)])
      .then(([sessionResult, historyResult]) => {
        setSession(sessionResult.session);
        setHistory(historyResult.history);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load results"));
  }, [params.sessionId, router]);

  if (error) {
    return <main className="app-shell panel error-text">{error}</main>;
  }

  if (!session) {
    return <main className="app-shell panel">Loading results...</main>;
  }

  const brief = performanceBrief(session);
  const medal = tierMedal(session.resultTier);
  const hasTier = session.resultTier != null;

  const METRIC_ICONS: Record<string, string> = {
    Happiness: "😊",
    "Environmental Health": "🌿",
    Economy: "💰",
  };

  return (
    <main className="app-shell stack">
      <section className="panel results-banner">
        <p className="small-kicker">Session results</p>
        <h1 className="route-title">{session.cityName}</h1>
        <p className="muted">
          {difficultyLabel(session.difficulty)} difficulty · {session.status}
          {session.lossReason ? ` · ${formatLossReason(session.lossReason)}` : ""}
        </p>

        {/* Tier medal block */}
        {hasTier && (
          <div className={`tier-medal-block ${medal.className}`}>
            <span className="tier-emoji">{medal.emoji}</span>
            <div>
              <div className="tier-label">{medal.label}</div>
              <div className="tier-sublabel">Result tier</div>
            </div>
          </div>
        )}

        {/* Big score */}
        {session.finalScore != null && (
          <div style={{ marginBottom: 18 }}>
            <p className="small-kicker" style={{ marginBottom: 6 }}>Final score</p>
            <div className="final-score-big">{session.finalScore.toLocaleString()}</div>
          </div>
        )}

        <div className="inline-row" style={{ marginBottom: 8 }}>
          <span className="pill">Turn reached: {session.currentTurn}</span>
          {session.finalScore == null && <span className="pill">Score not awarded</span>}
        </div>
        <div className="cta-row" style={{ marginTop: 18 }}>
          {session.status === "active" && (
            <Link className="btn" href={`/game/${session.sessionId}`}>
              Resume session
            </Link>
          )}
          <Link className="btn-secondary" href="/dashboard">
            Back to dashboard
          </Link>
          <Link className="btn-ghost" href="/leaderboard">
            Leaderboard
          </Link>
        </div>
      </section>

      <section className="dashboard-grid" style={{ gridTemplateColumns: "1.05fr 0.95fr" }}>
        <div className="table-card stack">
          <div>
            <p className="small-kicker">Performance feedback</p>
            <h2 className="section-title">{brief.headline}</h2>
          </div>
          <p className="muted">{brief.summary}</p>
          <p className="muted">{brief.recommendation}</p>
        </div>
        <div className="table-card stack">
          <h2 className="section-title">Improvement tips</h2>
          <div className="tip-grid">
            {brief.tips.map((t) => (
              <div className="tip-card" key={t.label}>
                <span className="tip-icon">{METRIC_ICONS[t.label] ?? "💡"}</span>
                <div>
                  <div className="tip-label">{t.label}</div>
                  <div className="tip-text">{t.tip}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="hud">
        <Metric label="Happiness" value={session.happiness} />
        <Metric label="Env Health" value={session.envHealth} />
        <Metric label="Economy" value={session.economy} />
        <Metric label="Carbon" value={session.carbonFootprint} />
        <Metric label="Budget" value={session.budget} />
        <Metric label="Population" value={session.population} />
      </section>

      <section className="dashboard-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="brief-card">
          <strong>Strongest area</strong>
          <p className="muted">
            {brief.strongest.label}: {brief.strongest.value}
          </p>
        </div>
        <div className="brief-card">
          <strong>Weakest area</strong>
          <p className="muted">
            {brief.weakest.label}: {brief.weakest.value}
          </p>
        </div>
      </section>

      <section className="table-card">
        <h2 className="section-title">Decision history</h2>
        <table>
          <thead>
            <tr>
              <th>Turn</th>
              <th>Action</th>
              <th>Details</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry) => (
              <tr key={entry.decisionId}>
                <td>{entry.turnNumber}</td>
                <td>{friendlyActionName(entry.actionType)}</td>
                <td>{friendlyActionDetail(entry.actionType, entry.actionDetail)}</td>
                <td>{formatCost(entry.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-card">
      <span className="small-kicker">{label}</span>
      <strong>{typeof value === "number" ? value.toLocaleString() : value}</strong>
    </div>
  );
}

function friendlyActionName(actionType: string) {
  switch (actionType) {
    case "passive": return "Passive update";
    case "project_approve": return "Project approved";
    case "project_reject": return "Project rejected";
    case "event_response": return "Event response";
    case "infrastructure": return "Infrastructure built";
    case "zone": return "Zone built";
    default: return actionType.replaceAll("_", " ");
  }
}

function friendlyActionDetail(actionType: string, detail: Record<string, unknown>) {
  const label = typeof detail.label === "string" ? detail.label : null;
  const tileIndex = typeof detail.tileIndex === "number" ? detail.tileIndex : null;
  const response = typeof detail.response === "string" ? detail.response : null;
  const eventCode = typeof detail.eventCode === "string" ? detail.eventCode : null;
  const turn = typeof detail.turn === "number" ? detail.turn : null;

  switch (actionType) {
    case "passive":
      return turn != null
        ? `Automatic turn effects were applied at the start of turn ${turn}.`
        : "Automatic turn effects were applied.";
    case "project_approve":
      return label ? `You approved ${label}.` : "You approved a project.";
    case "project_reject":
      return label ? `You rejected ${label}.` : "You rejected a project.";
    case "event_response":
      if (response && eventCode) return `For ${friendlyEventName(eventCode)}, you chose "${response}".`;
      if (response) return `You chose "${response}" for the event.`;
      return "You responded to an event.";
    case "infrastructure":
      if (label && tileIndex != null) return `Built ${label} on tile ${tileIndex + 1}.`;
      if (label) return `Built ${label}.`;
      return "Built infrastructure.";
    case "zone":
      if (label && tileIndex != null) return `Placed ${label} on tile ${tileIndex + 1}.`;
      if (label) return `Placed ${label}.`;
      return "Placed a zone.";
    default:
      return label ?? JSON.stringify(detail);
  }
}

function friendlyEventName(eventCode: string) {
  return eventCode
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCost(cost: number) {
  if (cost === 0) return "No direct cost";
  return `$${cost.toLocaleString()}`;
}
