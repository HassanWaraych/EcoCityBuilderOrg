"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchLeaderboard } from "../../lib/api";
import { getStoredPlayer } from "../../lib/auth";
import { difficultyLabel, tierMedal } from "../../lib/performance";
import type { Difficulty, LeaderboardEntry } from "../../lib/types";

type DiffFilter = "all" | Difficulty;

export default function LeaderboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DiffFilter>("all");
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);

  useEffect(() => {
    const player = getStoredPlayer();
    if (!player) {
      router.replace("/auth/login");
      return;
    }
    setMyPlayerId(player.playerId);

    fetchLeaderboard()
      .then((result) => setEntries(result.leaderboard))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load leaderboard"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <main className="app-shell panel">Loading leaderboard...</main>;
  }

  if (error) {
    return <main className="app-shell panel error-text">{error}</main>;
  }

  const filtered =
    filter === "all" ? entries : entries.filter((e) => e.difficulty === filter);

  const FILTERS: { label: string; value: DiffFilter }[] = [
    { label: "All", value: "all" },
    { label: "🟢 Easy", value: "easy" },
    { label: "🟡 Normal", value: "normal" },
    { label: "🔴 Hard", value: "hard" },
  ];

  function rankMedal(rank: number) {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  }

  return (
    <main className="app-shell stack">
      <section className="panel leaderboard-hero">
        <div className="split">
          <div>
            <p className="small-kicker">Global leaderboard</p>
            <h1 className="route-title">Top city runs</h1>
            <p className="muted">Compare finished sessions by score, tier, and difficulty across the whole project.</p>
          </div>
          <div className="inline-row">
            <Link className="btn-ghost" href="/dashboard">
              Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Top 3 podium */}
      {filtered.length >= 1 && (
        <section className="dashboard-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {filtered.slice(0, 3).map((entry) => {
            const medal = tierMedal(entry.resultTier);
            const isMe = entry.playerId === myPlayerId;
            return (
              <div
                key={entry.sessionId}
                className={`metric-card`}
                style={{
                  padding: "20px 18px",
                  borderRadius: 24,
                  border: isMe ? "2px solid rgba(214,90,49,0.5)" : undefined,
                  background: entry.rank === 1
                    ? "linear-gradient(135deg, rgba(255,215,0,0.14), rgba(180,140,0,0.08))"
                    : entry.rank === 2
                      ? "linear-gradient(135deg, rgba(190,190,200,0.12), rgba(100,100,120,0.06))"
                      : "linear-gradient(135deg, rgba(180,100,50,0.12), rgba(120,60,20,0.06))",
                }}
              >
                <div style={{ fontSize: "2.4rem", marginBottom: 4 }}>{rankMedal(entry.rank)}</div>
                <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 2 }}>
                  {entry.username} {isMe && <span className="pill" style={{ fontSize: "0.7rem" }}>You</span>}
                </div>
                <div className="muted" style={{ fontSize: "0.85rem", marginBottom: 10 }}>
                  {entry.cityName} · {difficultyLabel(entry.difficulty)}
                </div>
                <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#f08963" }}>
                  {entry.finalScore.toLocaleString()}
                </div>
                {entry.resultTier && (
                  <div style={{ marginTop: 6, fontSize: "0.85rem" }}>
                    {medal.emoji} {medal.label}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      <section className="table-card">
        {/* Filters */}
        <div className="leaderboard-filters">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`filter-tab ${filter === f.value ? "tab-active" : ""}`}
              type="button"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
          <span className="muted" style={{ marginLeft: "auto", alignSelf: "center", fontSize: "0.88rem" }}>
            {filtered.length} run{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>City</th>
              <th>Difficulty</th>
              <th>Score</th>
              <th>Tier</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => {
              const isMe = entry.playerId === myPlayerId;
              const medal = tierMedal(entry.resultTier);
              return (
                <tr key={entry.sessionId} className={isMe ? "leaderboard-row--me" : ""}>
                  <td>
                    <span className="rank-medal">{rankMedal(entry.rank)}</span>
                  </td>
                  <td>
                    {entry.username}
                    {isMe && (
                      <>
                        {" "}
                        <span className="pill" style={{ fontSize: "0.7rem" }}>You</span>
                      </>
                    )}
                  </td>
                  <td>{entry.cityName}</td>
                  <td>
                    <span className={`difficulty-chip difficulty-${entry.difficulty}`}>
                      {difficultyLabel(entry.difficulty)}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{entry.finalScore.toLocaleString()}</td>
                  <td>
                    {entry.resultTier ? `${medal.emoji} ${medal.label}` : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="muted" style={{ padding: "16px 8px" }}>
            {filter === "all"
              ? "No finished sessions yet. Complete a run to populate the leaderboard."
              : `No ${difficultyLabel(filter)} runs on the board yet.`}
          </p>
        )}
      </section>
    </main>
  );
}
