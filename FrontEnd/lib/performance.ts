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

export type AchievementMeta = {
  emoji: string;
  label: string;
  description: string;
  requirement: string;
};

const ACHIEVEMENT_META: Record<string, AchievementMeta> = {
  first_win: {
    emoji: "🏆",
    label: "First Victory",
    description: "Finish a full city run without collapsing.",
    requirement: "Complete any session and reach the end of the campaign.",
  },
  green_city: {
    emoji: "🌿",
    label: "Green City",
    description: "Your city stayed healthy while keeping emissions under control.",
    requirement: "Finish with environmental health of 70+ and carbon footprint of 3,000 or less.",
  },
  budget_master: {
    emoji: "💰",
    label: "Budget Master",
    description: "You built growth without draining the treasury.",
    requirement: "Finish with economy of 70+ and at least $50,000 in budget.",
  },
  happy_citizens: {
    emoji: "😄",
    label: "Happy Citizens",
    description: "Residents ended the campaign with strong morale.",
    requirement: "Finish with happiness of 75 or higher.",
  },
  eco_champion: {
    emoji: "♻️",
    label: "Eco Champion",
    description: "You delivered an elite sustainability run.",
    requirement: "Finish with environmental health of 80+ and carbon footprint of 2,000 or less.",
  },
  urban_planner: {
    emoji: "🏗️",
    label: "Urban Planner",
    description: "Your city strategy produced a strong overall score.",
    requirement: "Finish with a score of 70,000 or higher.",
  },
  hard_mode_win: {
    emoji: "🔥",
    label: "Hard Mode Victor",
    description: "You survived the campaign on the toughest setting.",
    requirement: "Complete a session on hard difficulty.",
  },
  carbon_neutral: {
    emoji: "🌍",
    label: "Carbon Neutral",
    description: "You drove emissions down to a near-net-zero city footprint.",
    requirement: "Finish with carbon footprint of 1,000 or less.",
  },
  infrastructure_king: {
    emoji: "🚇",
    label: "Infrastructure King",
    description: "You combined strong systems and scoring into a top-tier city.",
    requirement: "Finish with a score of 85,000 or higher.",
  },
  population_boom: {
    emoji: "📈",
    label: "Population Boom",
    description: "Your city became a major urban centre.",
    requirement: "Finish with a population of 100,000 or more.",
  },
  survivor: {
    emoji: "🛡️",
    label: "Survivor",
    description: "You endured the entire 15-turn campaign.",
    requirement: "Reach turn 15 and complete the session.",
  },
  speed_builder: {
    emoji: "⚡",
    label: "Speed Builder",
    description: "You put together a strong city unusually quickly.",
    requirement: "Finish by turn 10 or earlier with a score of at least 50,000.",
  },
};

/** Returns emoji + readable label for a known achievement code */
export function achievementLabel(code: string): { emoji: string; label: string } {
  const meta = ACHIEVEMENT_META[code];
  return meta ?? { emoji: "🎖️", label: code.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()) };
}

export function achievementMeta(code: string): AchievementMeta {
  return ACHIEVEMENT_META[code] ?? {
    emoji: "🎖️",
    label: code.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: "Complete the hidden requirement for this badge.",
    requirement: "Unlock requirement is not documented for this code yet.",
  };
}

/** Known achievement codes — used to render locked badges */
export const ALL_ACHIEVEMENTS = Object.keys(ACHIEVEMENT_META);

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
