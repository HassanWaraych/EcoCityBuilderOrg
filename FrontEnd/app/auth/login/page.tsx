"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { login } from "../../../lib/api";
import { saveAuth } from "../../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    try {
      const result = await login({
        email: String(form.get("email") || ""),
        password: String(form.get("password") || ""),
      });
      saveAuth(result.token, result.player);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell auth-grid">
      <section className="panel">
        <p className="small-kicker">Welcome back</p>
        <h1 className="route-title">Resume the city you left unfinished.</h1>
        <p className="muted">
          Completed sessions keep their final score and tier. Active sessions reopen on the game
          route.
        </p>
      </section>
      <section className="panel">
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" required />
          </label>
          <label className="field">
            <span>Password</span>
            <input name="password" type="password" minLength={8} required />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Log in"}
          </button>
          <p className="muted">
            Need an account? <Link href="/auth/register">Register</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
