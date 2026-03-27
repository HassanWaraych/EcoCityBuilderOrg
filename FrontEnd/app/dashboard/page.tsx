"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createSession, fetchLeaderboard, fetchProfile, fetchScores, fetchSessions } from "../../lib/api";
import { clearAuth, getStoredPlayer } from "../../lib/auth";
import { ALL_ACHIEVEMENTS, achievementLabel, difficultyLabel, difficultyNote } from "../../lib/performance";
import type { LeaderboardEntry } from "../../lib/types";

type DashboardData = {
  profile: Awaited<ReturnType<typeof fetchProfile>>["profile"] | null;
  scores: Awaited<ReturnType<typeof fetchScores>>["scores"];
  sessions: Awaited<ReturnType<typeof fetchSessions>>["sessions"];
  leaderboard: LeaderboardEntry[];
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({ profile: null, scores: [], sessions: [], leaderboard: [] });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<"easy" | "normal" | "hard">("normal");

  useEffect(() => {
    const player = getStoredPlayer();
    if (!player) {
      router.replace("/auth/login");
      return;
    }

    Promise.all([fetchProfile(player.playerId), fetchScores(player.playerId), fetchSessions(), fetchLeaderboard()])
      .then(([profile, scores, sessions, leaderboard]) => {
        setData({
          profile: profile.profile,
          scores: scores.scores,
          sessions: sessions.sessions,
          leaderboard: leaderboard.leaderboard,
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleCreateSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const result = await createSession({
        cityName: String(form.get("cityName") || "New City"),
        difficulty: selectedDifficulty,
      });
      router.push(`/game/${result.session.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <main className="app-shell panel">Loading dashboard...</main>;
  }

  const earnedCodes = new Set((data.profile?.achievements ?? []).map((a) => a.code));

  return (
    <main className="app-shell dashboard-grid">
      <section className="panel">
        <div className="split">
          <div>
            <p className="small-kicker">Planner dashboard</p>
            <h1 className="route-title">
              {data.profile?.username ?? "Player"}, your city ledger is ready.
            </h1>
            <p className="muted">Launch new simulations, review city performance, and compare your best run on the board.</p>
          </div>
          <div className="inline-row">
            <Link className="btn-ghost" href="/rules">
              📖 How to play
            </Link>
            <Link className="btn-secondary" href="/leaderboard">
              🏆 Leaderboard
            </Link>
            <button
              className="btn-ghost"
              type="button"
              onClick={() => {
                clearAuth();
                router.push("/");
              }}
            >
              Log out
            </button>
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
      </section>

      <section className="dashboard-grid dashboard-stats">
        <div className="metric-card dashboard-stat">
          <span className="small-kicker">🎮 Total games</span>
          <strong>{data.profile?.totalGames ?? 0}</strong>
        </div>
        <div className="metric-card dashboard-stat">
          <span className="small-kicker">⭐ Best score</span>
          <strong>{(data.profile?.bestScore ?? 0).toLocaleString()}</strong>
        </div>
        <div className="metric-card dashboard-stat">
          <span className="small-kicker">⚡ Active sessions</span>
          <strong>{data.sessions.filter((session) => session.status === "active").length}</strong>
        </div>
      </section>

      <section className="dashboard-grid" style={{ gridTemplateColumns: "0.9fr 1.1fr" }}>
        <div className="panel stack">
          <h2 className="section-title">New session</h2>
          <form className="form-stack" onSubmit={handleCreateSession}>
            <label className="field">
              <span>City name</span>
              <input name="cityName" defaultValue="New Eden" required />
            </label>
            <label className="field">
              <span>Difficulty</span>
              <select
                name="difficulty"
                value={selectedDifficulty}
                onChange={(event) => setSelectedDifficulty(event.target.value as "easy" | "normal" | "hard")}
              >
                <option value="easy">🟢 Easy</option>
                <option value="normal">🟡 Normal</option>
                <option value="hard">🔴 Hard</option>
              </select>
            </label>
            <div className="difficulty-preview">
              <span className={`difficulty-chip difficulty-${selectedDifficulty}`}>{difficultyLabel(selectedDifficulty)}</span>
              <p className="muted">{difficultyNote(selectedDifficulty)}</p>
            </div>
            <button className="btn" type="submit" disabled={creating}>
              {creating ? "Creating..." : "Start game"}
            </button>
          </form>
          <div className="brief-card">
            <strong>🎯 Objectives</strong>
            <p className="muted" style={{ marginTop: 6 }}>Survive <strong>15 turns</strong>, keep budget and core city metrics above zero, and finish with the strongest sustainability score you can.</p>
          </div>
        </div>

        <div className="panel stack">
          <h2 className="section-title">Sessions</h2>
          <div className="session-list">
            {data.sessions.map((session) => (
              <div className="session-item" key={session.sessionId}>
                <div className="split">
                  <div>
                    <strong>{session.cityName}</strong>
                    <p className="muted">
                      <span className={`difficulty-chip difficulty-${session.difficulty}`}>{difficultyLabel(session.difficulty)}</span>
                      {" "}{session.status} · turn {session.currentTurn}/15
                    </p>
                  </div>
                  <Link
                    className="btn-secondary"
                    href={
                      session.status === "active"
                        ? `/game/${session.sessionId}`
                        : `/game/${session.sessionId}/results`
                    }
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))}
            {data.sessions.length === 0 && <p className="muted">No sessions yet.</p>}
          </div>
        </div>
      </section>

      <section className="dashboard-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {/* Achievement badges */}
        <section className="table-card">
          <div className="split">
            <h2 className="section-title">Achievements</h2>
            <span className="muted">{earnedCodes.size} / {ALL_ACHIEVEMENTS.length} unlocked</span>
          </div>
          <div className="badge-grid">
            {ALL_ACHIEVEMENTS.map((code) => {
              const { emoji, label } = achievementLabel(code);
              const earned = earnedCodes.has(code);
              return (
                <div key={code} className={`badge-item ${earned ? "" : "badge-locked"}`} title={earned ? `Unlocked: ${label}` : `Locked: ${label}`}>
                  <span className="badge-emoji">{emoji}</span>
                  <span className="badge-name">{label}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Leaderboard preview */}
        <section className="table-card">
          <div className="split">
            <h2 className="section-title">Top runs</h2>
            <Link className="btn-ghost" href="/leaderboard">
              Full board
            </Link>
          </div>
          <div className="session-list">
            {data.leaderboard.slice(0, 3).map((entry) => (
              <div className="session-item leaderboard-mini" key={entry.sessionId}>
                <div>
                  <strong>
                    {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"} #{entry.rank} {entry.username}
                  </strong>
                  <p className="muted">
                    {entry.cityName} · {difficultyLabel(entry.difficulty)}
                  </p>
                </div>
                <span className="pill">{entry.finalScore.toLocaleString()}</span>
              </div>
            ))}
            {data.leaderboard.length === 0 && <p className="muted">No completed runs on the board yet.</p>}
          </div>
        </section>
      </section>

      <section className="table-card">
        <h2 className="section-title">Score history</h2>
        <table>
          <thead>
            <tr>
              <th>City</th>
              <th>Difficulty</th>
              <th>Status</th>
              <th>Score</th>
              <th>Tier</th>
            </tr>
          </thead>
          <tbody>
            {data.scores.map((score) => (
              <tr key={score.sessionId}>
                <td>{score.cityName}</td>
                <td>
                  <span className={`difficulty-chip difficulty-${score.difficulty}`}>{difficultyLabel(score.difficulty)}</span>
                </td>
                <td>{score.status}</td>
                <td>{score.finalScore ?? "N/A"}</td>
                <td>{score.resultTier ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.scores.length === 0 && <p className="muted">No score history yet.</p>}
      </section>
    </main>
  );
}
