import Link from "next/link";

export default function HomePage() {
  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="small-kicker">UN SDG 11 simulation</p>
          <h1 className="hero-title">Build a city that can survive its own growth.</h1>
          <p className="hero-copy">
            EcoCity Builder is a turn-based planning game about balancing public happiness,
            environmental health, economic stability, carbon pressure, and budget reality across
            fifteen turns.
          </p>
          <div className="cta-row">
            <Link href="/auth/register" className="btn">
              Register
            </Link>
            <Link href="/auth/login" className="btn-secondary">
              Log in
            </Link>
            <Link href="/rules" className="btn-ghost">
              How to play
            </Link>
          </div>
        </div>
        <div className="panel stack">
          <div>
            <p className="small-kicker">Core loop</p>
            <h2 className="section-title">Each turn asks you to trade one system against another.</h2>
          </div>
          <div className="stack">
            <div className="action-card">
              <strong>1. Build up to three actions</strong>
              <p className="muted">Zone land or place infrastructure on the city grid.</p>
            </div>
            <div className="action-card">
              <strong>2. Review development proposals</strong>
              <p className="muted">Approve or reject two offers that pull your city in different directions.</p>
            </div>
            <div className="action-card">
              <strong>3. Respond to events</strong>
              <p className="muted">From turn 3 onward, crises and opportunities force difficult trade-offs.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
