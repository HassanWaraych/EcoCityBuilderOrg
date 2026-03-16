"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchHistory, fetchSession } from "../../../../lib/api";
import { getStoredPlayer } from "../../../../lib/auth";
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

  return (
    <main className="app-shell stack">
      <section className="panel results-banner">
        <p className="small-kicker">Session results</p>
        <h1 className="route-title">{session.cityName}</h1>
        <p className="muted">
          Status: {session.status}
          {session.resultTier ? ` · ${session.resultTier}` : ""}
          {session.lossReason ? ` · ${session.lossReason.replaceAll("_", " ")}` : ""}
        </p>
        <div className="inline-row">
          <span className="pill">Final score: {session.finalScore ?? "Not awarded"}</span>
          <span className="pill">Turn reached: {session.currentTurn}</span>
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
    case "passive":
      return "Passive update";
    case "project_approve":
      return "Project approved";
    case "project_reject":
      return "Project rejected";
    case "event_response":
      return "Event response";
    case "infrastructure":
      return "Infrastructure built";
    case "zone":
      return "Zone built";
    default:
      return actionType.replaceAll("_", " ");
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
      if (response && eventCode) {
        return `For ${friendlyEventName(eventCode)}, you chose "${response}".`;
      }
      if (response) return `You chose "${response}" for the event.`;
      return "You responded to an event.";
    case "infrastructure":
      if (label && tileIndex != null) {
        return `Built ${label} on tile ${tileIndex + 1}.`;
      }
      if (label) return `Built ${label}.`;
      return "Built infrastructure.";
    case "zone":
      if (label && tileIndex != null) {
        return `Placed ${label} on tile ${tileIndex + 1}.`;
      }
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
