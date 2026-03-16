"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createSession, fetchProfile, fetchScores, fetchSessions } from "../../lib/api";
import { clearAuth, getStoredPlayer } from "../../lib/auth";

type DashboardData = {
  profile: Awaited<ReturnType<typeof fetchProfile>>["profile"] | null;
  scores: Awaited<ReturnType<typeof fetchScores>>["scores"];
  sessions: Awaited<ReturnType<typeof fetchSessions>>["sessions"];
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({ profile: null, scores: [], sessions: [] });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const player = getStoredPlayer();
    if (!player) {
      router.replace("/auth/login");
      return;
    }

    Promise.all([fetchProfile(player.playerId), fetchScores(player.playerId), fetchSessions()])
      .then(([profile, scores, sessions]) => {
        setData({ profile: profile.profile, scores: scores.scores, sessions: sessions.sessions });
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
        difficulty: String(form.get("difficulty") || "normal") as "easy" | "normal" | "hard",
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

  return (
    <main className="app-shell dashboard-grid">
      <section className="panel">
        <div className="split">
          <div>
            <p className="small-kicker">Planner dashboard</p>
            <h1 className="route-title">
              {data.profile?.username ?? "Player"}, your city ledger is ready.
            </h1>
          </div>
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
        {error && <p className="error-text">{error}</p>}
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
              <select name="difficulty" defaultValue="normal">
                <option value="easy">Easy</option>
                <option value="normal">Normal</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <button className="btn" type="submit" disabled={creating}>
              {creating ? "Creating..." : "Start game"}
            </button>
          </form>
          <div className="action-card">
            <strong>Total games</strong>
            <p className="muted">{data.profile?.totalGames ?? 0}</p>
          </div>
          <div className="action-card">
            <strong>Best score</strong>
            <p className="muted">{data.profile?.bestScore ?? 0}</p>
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
                      {session.status} · turn {session.currentTurn}
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

      <section className="table-card">
        <h2 className="section-title">Achievements</h2>
        <div className="inline-row">
          {data.profile?.achievements.length ? (
            data.profile.achievements.map((achievement) => (
              <span className="pill" key={`${achievement.code}-${achievement.earnedAt}`}>
                {achievement.code}
              </span>
            ))
          ) : (
            <p className="muted">No achievements unlocked yet.</p>
          )}
        </div>
      </section>

      <section className="table-card">
        <h2 className="section-title">Score history</h2>
        <table>
          <thead>
            <tr>
              <th>City</th>
              <th>Status</th>
              <th>Score</th>
              <th>Tier</th>
            </tr>
          </thead>
          <tbody>
            {data.scores.map((score) => (
              <tr key={score.sessionId}>
                <td>{score.cityName}</td>
                <td>{score.status}</td>
                <td>{score.finalScore ?? "N/A"}</td>
                <td>{score.resultTier ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
