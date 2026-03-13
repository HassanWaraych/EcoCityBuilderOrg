"use client";

import { useState } from "react";

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

export default function HomePage() {
  const [game, setGame] = useState(initialState);
  const [started, setStarted] = useState(false);
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
    setStarted(true);
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>EcoCity Builder</h1>
      <p>
        Build a sustainable city by balancing happiness, environment, economy,
        and carbon impact.
      </p>

      {!started ? (
        <button onClick={() => setStarted(true)}>Start Game</button>
      ) : (
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
      )}
    </main>
  );
}