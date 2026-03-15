"use client";

import { useState } from "react";

import Typewriter from "../components/typewriter";
import startScreenBg from "../art/StartScreen.png";
import introScreenBg from "../art/intro_screen.png";

const INTRO_TEXT = `Welcome, City Planner.

You have been given control of this growing city.
Your decisions will shape how people live, how the economy grows, and how the environment changes.

Every choice you make will affect the balance between development, sustainability, and the well-being of your citizens.

Build too fast, and pollution may rise.
Protect the environment too much, and your economy may struggle.
Ignore your people, and happiness will fall.

Your goal is to create a city that is strong, fair, and sustainable.

Make your decisions carefully.
The future of this city is in your hands.`;

const decisionPool = [
  {
    title: "Build Affordable Housing",
    effects: { happiness: 10, economy: -5, environment: -3, carbon: 4 },
  },
  {
    title: "Plant Trees",
    effects: { happiness: 4, economy: -2, environment: 10, carbon: -8 },
  },
  {
    title: "Expand Public Transit",
    effects: { happiness: 6, economy: -4, environment: 7, carbon: -6 },
  },
  {
    title: "Approve New Factory",
    effects: { happiness: -3, economy: 12, environment: -8, carbon: 10 },
  },
];

const initialState = {
  turn: 1,
  happiness: 50,
  environment: 50,
  economy: 50,
  carbon: 50,
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getEnding(state: typeof initialState) {
  if (state.environment >= 70 && state.economy >= 60) {
    return "Green Growth City";
  }
  if (state.economy >= 75 && state.environment < 40) {
    return "Industrial Boom, Environmental Cost";
  }
  if (state.happiness >= 70) {
    return "People-First Community";
  }
  return "Balanced but Challenged City";
}

type Screen = "start" | "intro" | "game";

export default function HomePage() {
  const [game, setGame] = useState(initialState);
  const [screen, setScreen] = useState<Screen>("start");
  const [gameOver, setGameOver] = useState(false);

  const applyDecision = (decision: (typeof decisionPool)[0]) => {
    if (gameOver) return;

    const updated = {
      turn: game.turn + 1,
      happiness: clamp(game.happiness + decision.effects.happiness),
      environment: clamp(game.environment + decision.effects.environment),
      economy: clamp(game.economy + decision.effects.economy),
      carbon: clamp(game.carbon + decision.effects.carbon),
    };

    if (game.turn >= 10) {
      setGame(updated);
      setGameOver(true);
      return;
    }

    setGame(updated);
  };

  const resetGame = () => {
    setGame(initialState);
    setGameOver(false);
    setScreen("game");
  };

  if (screen === "start") {
    return (
      <div
        className="start-screen"
        style={{ backgroundImage: `url(${startScreenBg.src})` }}
      >
        <h1 className="start-screen-title">Eco City Builder</h1>
        <div className="start-screen-btn-wrap">
          <button
            type="button"
            className="start-screen-btn"
            onClick={() => setScreen("intro")}
          >
            Start Game
          </button>
        </div>
      </div>
    );
  }

  if (screen === "intro") {
    return (
      <div
        className="intro-screen"
        style={{ backgroundImage: `url(${introScreenBg.src})` }}
      >
        <div className="intro-text-box">
          <Typewriter text={INTRO_TEXT} speed={55} />
          <button
            type="button"
            className="intro-continue"
            onClick={() => setScreen("game")}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>Eco City Builder</h1>
      <p>
        Build a sustainable city by balancing happiness, environment, economy,
        and carbon impact.
      </p>

      <>
        <h2>Turn {Math.min(game.turn, 10)} / 10</h2>

          <div style={{ marginBottom: "1rem" }}>
            <p>Happiness: {game.happiness}</p>
            <p>Environment: {game.environment}</p>
            <p>Economy: {game.economy}</p>
            <p>Carbon: {game.carbon}</p>
          </div>

          {!gameOver ? (
            <div style={{ display: "grid", gap: "0.75rem", maxWidth: "400px" }}>
              {decisionPool.map((decision) => (
                <button
                  key={decision.title}
                  onClick={() => applyDecision(decision)}
                  style={{ padding: "0.75rem", textAlign: "left" }}
                >
                  {decision.title}
                </button>
              ))}
            </div>
          ) : (
            <div>
              <h3>Final Result</h3>
              <p>{getEnding(game)}</p>
              <button onClick={resetGame}>Play Again</button>
            </div>
          )}
      </>
    </main>
  );
}