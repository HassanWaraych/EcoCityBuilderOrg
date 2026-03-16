"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { register } from "../../../lib/api";
import { saveAuth } from "../../../lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    try {
      const result = await register({
        username: String(form.get("username") || ""),
        email: String(form.get("email") || ""),
        password: String(form.get("password") || ""),
      });
      saveAuth(result.token, result.player);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell auth-grid">
      <section className="panel">
        <p className="small-kicker">Create account</p>
        <h1 className="route-title">Start your planning profile.</h1>
        <p className="muted">
          Register once, then every session, score, and achievement stays attached to your player
          record.
        </p>
      </section>
      <section className="panel">
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Username</span>
            <input name="username" minLength={3} maxLength={50} required />
          </label>
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
            {loading ? "Creating account..." : "Register"}
          </button>
          <p className="muted">
            Already have an account? <Link href="/auth/login">Log in</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
