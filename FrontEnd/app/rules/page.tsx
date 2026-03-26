"use client";

import Link from "next/link";

type Section = {
  emoji: string;
  title: string;
  content: React.ReactNode;
};

export default function RulesPage() {
  return (
    <main className="app-shell stack">
      {/* Header */}
      <section className="panel rules-hero">
        <div className="split">
          <div>
            <p className="small-kicker">How to play</p>
            <h1 className="route-title">Game Rules</h1>
            <p className="muted">
              EcoCityBuilder is a 15-turn urban planning simulation. Balance growth, sustainability,
              and public happiness to build a thriving, resilient city.
            </p>
          </div>
          <div className="inline-row">
            <Link className="btn" href="/dashboard">
              Play now
            </Link>
            <Link className="btn-ghost" href="/dashboard">
              Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Core loop */}
      <section className="rules-grid">
        <RuleCard emoji="🎯" title="Objective">
          <p>
            Survive all <strong>15 turns</strong> without letting your budget, happiness,
            environmental health, or economy drop to zero. Finish with the highest possible
            sustainability score.
          </p>
        </RuleCard>

        <RuleCard emoji="🔄" title="Each Turn">
          <ol className="rules-list">
            <li>Queue up to <strong>3 build actions</strong> on city tiles.</li>
            <li>Vote <strong>Approve or Reject</strong> on 2 incoming project proposals.</li>
            <li>Respond to any <strong>random event</strong> that appears.</li>
            <li>Click <strong>Resolve Turn</strong> to apply all effects.</li>
          </ol>
        </RuleCard>

        <RuleCard emoji="💀" title="Lose Condition">
          <p>Your run ends early if <em>any</em> of these hit zero:</p>
          <ul className="rules-list">
            <li>😊 <strong>Happiness</strong> — city revolt</li>
            <li>🌿 <strong>Environmental Health</strong> — ecological collapse</li>
            <li>💰 <strong>Economy</strong> — bankruptcy</li>
            <li>🏦 <strong>Budget</strong> — depleted treasury</li>
          </ul>
        </RuleCard>
      </section>

      {/* Build prerequisites */}
      <section className="table-card">
        <div style={{ marginBottom: 20 }}>
          <p className="small-kicker">Build system</p>
          <h2 className="section-title">Prerequisites</h2>
          <p className="muted">
            You must build certain infrastructure before advanced zones unlock. Roads are
            the foundation of everything — start there.
          </p>
        </div>

        {/* Recommended build order */}
        <div className="build-order">
          {BUILD_ORDER.map((step, i) => (
            <div className="build-step" key={step.label}>
              <div className="build-step-num">{i + 1}</div>
              <div className="build-step-icon">{step.icon}</div>
              <div>
                <div className="build-step-label">{step.label}</div>
                <div className="build-step-note">{step.note}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Prerequisites table */}
        <h3 style={{ marginTop: 28, marginBottom: 14, fontSize: "1rem", fontWeight: 700 }}>
          Full requirements table
        </h3>
        <table>
          <thead>
            <tr>
              <th>Zone / Infrastructure</th>
              <th>Type</th>
              <th>Requirement</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            {REQUIREMENTS.map((row) => (
              <tr key={row.name}>
                <td>
                  <span style={{ marginRight: 6 }}>{row.icon}</span>
                  <strong>{row.name}</strong>
                </td>
                <td>
                  <span className={`difficulty-chip difficulty-${row.type === "Zone" ? "easy" : "normal"}`}>
                    {row.type}
                  </span>
                </td>
                <td>
                  {row.requirement === "None" ? (
                    <span className="muted">None — build freely</span>
                  ) : (
                    <span style={{ color: "#f08963" }}>🔒 {row.requirement}</span>
                  )}
                </td>
                <td className="muted">{row.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Metrics */}
      <section className="rules-grid">
        <RuleCard emoji="📊" title="City Metrics">
          <ul className="rules-list">
            <li><strong>😊 Happiness</strong> — Public sentiment. Build parks, transit, housing.</li>
            <li><strong>🌿 Env Health</strong> — Air & ecosystem quality. Add green zones & renewables.</li>
            <li><strong>💰 Economy</strong> — Economic output. Commercial & industrial zones help.</li>
            <li><strong>☁️ Carbon</strong> — Pollution level. Lower is better. Renewables reduce it.</li>
            <li><strong>🏦 Budget</strong> — Your treasury. Earned from taxes + turn grants.</li>
            <li><strong>👥 Population</strong> — City residents. Grows with happiness.</li>
          </ul>
        </RuleCard>

        <RuleCard emoji="🏆" title="Scoring & Tiers">
          <p className="muted" style={{ marginBottom: 12 }}>Final score = weighted sum of all metrics + turns survived bonus.</p>
          <div className="tier-rows">
            {TIERS.map((t) => (
              <div className="tier-row" key={t.label}>
                <span style={{ fontSize: "1.3rem" }}>{t.emoji}</span>
                <div>
                  <div style={{ fontWeight: 700 }}>{t.label}</div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>{t.range}</div>
                </div>
              </div>
            ))}
          </div>
        </RuleCard>

        <RuleCard emoji="🎓" title="Difficulty">
          <ul className="rules-list">
            <li>
              <span className="difficulty-chip difficulty-easy">Easy</span>{" "}
              Higher starting budget, rare events, good starting metrics.
            </li>
            <li>
              <span className="difficulty-chip difficulty-normal">Normal</span>{" "}
              Balanced resources, events from turn 3, moderate pressure.
            </li>
            <li>
              <span className="difficulty-chip difficulty-hard">Hard</span>{" "}
              Lean budget, events from turn 2, aggressive metric decay.
            </li>
          </ul>
          <p className="muted" style={{ marginTop: 10 }}>
            Higher difficulty multiplies your final score ranking on the leaderboard.
          </p>
        </RuleCard>
      </section>

      {/* Tips */}
      <section className="table-card">
        <p className="small-kicker">Strategy</p>
        <h2 className="section-title">Tips for new planners</h2>
        <div className="tips-grid">
          {TIPS.map((tip) => (
            <div className="tip-card" key={tip.tip}>
              <span className="tip-icon">{tip.icon}</span>
              <div>
                <div className="tip-label">{tip.label}</div>
                <div className="tip-text">{tip.tip}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="panel" style={{ textAlign: "center", padding: "32px 24px" }}>
        <p className="small-kicker">Ready?</p>
        <h2 className="section-title" style={{ marginBottom: 18 }}>Start building your city</h2>
        <div className="cta-row" style={{ justifyContent: "center" }}>
          <Link className="btn" href="/dashboard">
            Go to dashboard
          </Link>
          <Link className="btn-ghost" href="/leaderboard">
            View leaderboard
          </Link>
        </div>
      </section>
    </main>
  );
}

function RuleCard({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="table-card stack rule-card">
      <div className="rule-card-header">
        <span className="rule-emoji">{emoji}</span>
        <h2 className="section-title">{title}</h2>
      </div>
      {children}
    </div>
  );
}

const BUILD_ORDER = [
  { icon: "🛣️", label: "Road Network", note: "Build first — unlocks nearly everything else" },
  { icon: "♻️", label: "Waste Management", note: "Requires 1 road — needed before Industrial" },
  { icon: "🚲", label: "Bike Lane", note: "Requires 1 road — needed before Green Space" },
  { icon: "🏠", label: "Residential", note: "No prerequisites — grow your population" },
  { icon: "🌿", label: "Green Space", note: "Requires 1 road + 1 bike lane" },
  { icon: "🏢", label: "Commercial / Mixed Use", note: "Requires 2 roads — boosts economy" },
  { icon: "🏭", label: "Industrial", note: "Requires 2 roads + 1 waste management" },
  { icon: "☀️", label: "Solar / Wind / Transit", note: "Require roads — reduce carbon, boost env health" },
];

const REQUIREMENTS = [
  { icon: "🏠", name: "Residential", type: "Zone", requirement: "None", why: "Your starting zone" },
  { icon: "🏢", name: "Commercial", type: "Zone", requirement: "2 Road Networks", why: "Customers need access" },
  { icon: "🏭", name: "Industrial", type: "Zone", requirement: "2 Roads + 1 Waste Mgmt", why: "Logistics + pollution control" },
  { icon: "🌿", name: "Green Space", type: "Zone", requirement: "1 Road + 1 Bike Lane", why: "Park accessibility" },
  { icon: "🏙️", name: "Mixed Use", type: "Zone", requirement: "2 Road Networks", why: "Dense development needs transit" },
  { icon: "☀️", name: "Solar Farm", type: "Zone", requirement: "1 Road Network", why: "Grid + maintenance access" },
  { icon: "🛣️", name: "Road Network", type: "Infra", requirement: "None", why: "Foundation of everything" },
  { icon: "🚲", name: "Bike Lane", type: "Infra", requirement: "1 Road Network", why: "Connects to road grid" },
  { icon: "🚌", name: "Public Transit", type: "Infra", requirement: "2 Road Networks", why: "Needs road foundation" },
  { icon: "💧", name: "Water Treatment", type: "Infra", requirement: "1 Road + Pop > 25,000", why: "Serves large populations only" },
  { icon: "💨", name: "Wind Turbine", type: "Infra", requirement: "1 Road (max 3)", why: "Equipment access, limited sites" },
  { icon: "♻️", name: "Waste Management", type: "Infra", requirement: "1 Road Network", why: "Collection routes" },
];

const TIERS = [
  { emoji: "💎", label: "S — Utopian City", range: "95,000+ points" },
  { emoji: "🥇", label: "A — Sustainable City", range: "85,000 – 94,999 points" },
  { emoji: "🥈", label: "B — Thriving City", range: "70,000 – 84,999 points" },
  { emoji: "🥉", label: "C — Developing City", range: "50,000 – 69,999 points" },
  { emoji: "🔴", label: "D — Struggling City", range: "25,000 – 49,999 points" },
  { emoji: "💀", label: "F — Collapsed City", range: "Below 25,000 points" },
];

const TIPS = [
  { icon: "🛣️", label: "Roads first", tip: "Build 2 road networks in your first 2 turns — they unlock everything." },
  { icon: "♻️", label: "Waste before industry", tip: "Build waste management before industrial zones to avoid massive env health penalties." },
  { icon: "🌿", label: "Green balances industry", tip: "Pair every industrial tile with a nearby green space to offset carbon and unhappiness." },
  { icon: "💰", label: "Watch your budget", tip: "Each turn grants tax income, but big builds drain reserves fast. Don't overbuild early." },
  { icon: "⚡", label: "Go renewable late", tip: "Solar farms and wind turbines are expensive but dramatically cut carbon in turns 8–15." },
  { icon: "📢", label: "Approve wisely", tip: "Some proposals have strong approve effects but harsh reject penalties. Read both sides." },
  { icon: "🎲", label: "Events can save you", tip: "Some event responses add budget. In a crisis, the risky option may be worth it." },
  { icon: "🚲", label: "Bike lanes early", tip: "Cheap at $5,000 and needed for green space. Build one right after your first road." },
];
