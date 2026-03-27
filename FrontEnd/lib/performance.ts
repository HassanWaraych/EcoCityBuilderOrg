import type { Difficulty, Session } from "./types";

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
};

const DIFFICULTY_NOTES: Record<Difficulty, string> = {
  easy: "Best for learning the economy and getting stable city growth.",
  normal: "Balanced pressure with steady events and tighter budgeting.",
  hard: "Aggressive event pressure, leaner opening cash, and less recovery room.",
};

export function difficultyLabel(difficulty: string) {
  return DIFFICULTY_LABELS[difficulty as Difficulty] ?? "Normal";
}

export function difficultyNote(difficulty: string) {
  return DIFFICULTY_NOTES[difficulty as Difficulty] ?? DIFFICULTY_NOTES.normal;
}

export function formatLossReason(lossReason: string | null) {
  if (!lossReason) return null;
  return lossReason
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Returns emoji + label for a result tier */
export function tierMedal(tier: string | null): { emoji: string; label: string; className: string } {
  switch (tier) {
    case "platinum":
      return { emoji: "💎", label: "Platinum", className: "tier-platinum" };
    case "gold":
      return { emoji: "🥇", label: "Gold", className: "tier-gold" };
    case "silver":
      return { emoji: "🥈", label: "Silver", className: "tier-silver" };
    case "bronze":
      return { emoji: "🥉", label: "Bronze", className: "tier-bronze" };
    default:
      return { emoji: "🏅", label: tier ?? "Unranked", className: "tier-default" };
  }
}

/** Returns emoji + readable label for a known achievement code */
export function achievementLabel(code: string): { emoji: string; label: string } {
  const MAP: Record<string, { emoji: string; label: string }> = {
    first_win: { emoji: "🏆", label: "First Victory" },
    green_city: { emoji: "🌿", label: "Green City" },
    budget_master: { emoji: "💰", label: "Budget Master" },
    happy_citizens: { emoji: "😄", label: "Happy Citizens" },
    eco_champion: { emoji: "♻️", label: "Eco Champion" },
    urban_planner: { emoji: "🏗️", label: "Urban Planner" },
    hard_mode_win: { emoji: "🔥", label: "Hard Mode Victor" },
    carbon_neutral: { emoji: "🌍", label: "Carbon Neutral" },
    infrastructure_king: { emoji: "🚇", label: "Infrastructure King" },
    population_boom: { emoji: "📈", label: "Population Boom" },
    survivor: { emoji: "🛡️", label: "Survivor" },
    speed_builder: { emoji: "⚡", label: "Speed Builder" },
  };
  return MAP[code] ?? { emoji: "🎖️", label: code.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()) };
}

/** Known achievement codes — used to render locked badges */
export const ALL_ACHIEVEMENTS = [
  "first_win",
  "green_city",
  "budget_master",
  "happy_citizens",
  "eco_champion",
  "urban_planner",
  "hard_mode_win",
  "carbon_neutral",
  "infrastructure_king",
  "population_boom",
  "survivor",
  "speed_builder",
];

export function performanceBrief(session: Session) {
  const metrics = [
    { key: "happiness", label: "Happiness", value: session.happiness },
    { key: "envHealth", label: "Environmental Health", value: session.envHealth },
    { key: "economy", label: "Economy", value: session.economy },
  ].sort((a, b) => b.value - a.value);

  const strongest = metrics[0];
  const weakest = metrics[metrics.length - 1];

  let headline = "City still in progress";
  let summary = "Keep pushing toward a balanced, resilient city before turn 15.";

  if (session.status === "completed") {
    if ((session.finalScore ?? 0) >= 90000) {
      headline = "Excellent strategic performance";
      summary = "You finished with strong balance across growth, sustainability, and public sentiment.";
    } else if ((session.finalScore ?? 0) >= 70000) {
      headline = "Solid city management";
      summary = "The city survived the full campaign with a stable overall profile and manageable tradeoffs.";
    } else {
      headline = "Successful but fragile finish";
      summary = "You reached the end, but one or more systems stayed under pressure through the run.";
    }
  } else if (session.status === "lost") {
    headline = "Run collapsed under pressure";
    summary = session.lossReason
      ? `The session ended because of ${formatLossReason(session.lossReason)?.toLowerCase()}.`
      : "The session ended after the city lost one of its core systems.";
  }

  const recommendation =
    weakest.value < 35
      ? `Prioritize ${weakest.label.toLowerCase()} earlier. That was the main drag on this run.`
      : strongest.value >= 75
        ? `Lean into your ${strongest.label.toLowerCase()} advantage, but keep the other systems closer behind.`
        : "Try to keep all three core systems within the same band so late-game events do not break the city.";

  // Per-metric actionable tips
  const tips: { label: string; tip: string }[] = [
    {
      label: "Happiness",
      tip:
        session.happiness < 40
          ? "Build parks and mixed-use zones to boost happiness quickly."
          : session.happiness >= 70
            ? "Happiness is strong — protect it by approving community projects."
            : "Keep civic and transit investments steady to hold happiness.",
    },
    {
      label: "Env Health",
      tip:
        session.envHealth < 40
          ? "Add wind turbines and solar farms urgently — industrial zones hurt air quality."
          : session.envHealth >= 70
            ? "Environmental health is excellent. Maintain it by limiting industrial sprawl."
            : "Pair every industrial zone with a renewable energy source to stabilise env health.",
    },
    {
      label: "Economy",
      tip:
        session.economy < 40
          ? "Prioritise commercial zones and approve economic projects to avoid budget collapse."
          : session.economy >= 70
            ? "Economy is thriving. Invest surplus into green infrastructure."
            : "Balance commercial and industrial zones to keep the economy growing steadily.",
    },
  ];

  return {
    headline,
    summary,
    recommendation,
    strongest,
    weakest,
    tips,
  };
}
