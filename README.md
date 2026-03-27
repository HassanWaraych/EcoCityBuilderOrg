# EcoCity Builder

EcoCityBuilder is a full-stack, turn-based urban planning simulation game built around UN SDG 11 (Sustainable Cities and Communities).

Players manage a city across **15 turns**, balancing happiness, environmental health, economy, carbon footprint, budget, and population — while responding to random events and project proposals.

## Features

- 🎮 **Turn-based gameplay** — queue up to 3 build actions, approve/reject proposals, respond to events
- 📈 **Progression system** — 15-turn arc with Early / Mid / Late game phases and a turn progress bar
- 🏆 **Scoring & tiers** — S through F tier based on final city metrics
- 🎖️ **Achievements** — unlocked based on score reached
- 🗂️ **Leaderboard** — compare runs by difficulty, with top-3 podium, rank medals, and player highlighting
- 🔒 **Build prerequisites** — roads unlock waste/bikes/transit; bikes + roads unlock parks; full dependency tree
- 📖 **Rules page** — full guide to objectives, build prerequisites, metrics, scoring, and strategy tips
- 🌓 **Three difficulty levels** — Easy, Normal, Hard with different starting metrics and event frequencies

## Tech Stack

- **Frontend** — Next.js 15 (App Router), TypeScript, Vanilla CSS
- **Backend** — Node.js, Express, TypeScript
- **Database** — PostgreSQL (via Docker Compose)

## Project Structure

```text
EcoCityBuilder/
├── FrontEnd/               # Next.js app
│   ├── app/
│   │   ├── page.tsx        # Landing page
│   │   ├── rules/          # How-to-play guide
│   │   ├── dashboard/      # Player hub + session creation
│   │   ├── leaderboard/    # Global leaderboard
│   │   └── game/[sessionId]/
│   │       ├── page.tsx    # Main game screen
│   │       └── results/    # Post-game results
│   ├── lib/
│   │   ├── api.ts          # API client
│   │   ├── auth.ts         # Token helpers
│   │   ├── performance.ts  # Score tiers, achievement labels, tips
│   │   └── types.ts        # Shared TypeScript types
│   └── public/game-icons-png/  # Tile icon set
├── backend/
│   ├── src/
│   │   ├── sim/engine.ts   # Game engine (zones, infra, events, scoring)
│   │   ├── routes/         # Express route handlers
│   │   ├── repo/           # Database queries
│   │   └── types/          # Shared types
│   └── sql/001_init.sql    # Schema migrations
├── diagrams/               # Architecture diagrams
└── docker-compose.yml      # PostgreSQL container
```

## Requirements

- Node.js 22+
- npm
- Docker Desktop (for the database)

## Environment Setup

Copy the example env file:

```bash
cp backend/.env.example backend/.env
```

Example values:

```env
PORT=4000
DATABASE_URL=postgres://ecocity:ecocity@localhost:5432/ecocity
JWT_SECRET=dev_jwt_secret_change_me
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000
```

## Install

```bash
cd backend && npm install
cd ../FrontEnd && npm install
```

## Run Locally

Start Postgres:

```bash
docker compose up -d db
```

Start the backend:

```bash
cd backend && npm run dev
```

Start the frontend:

```bash
cd FrontEnd && npm run dev
```

Open the app at `http://localhost:3000`.

## Useful Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/v1/auth/register` | Register player |
| POST | `/api/v1/auth/login` | Log in |
| GET | `/api/v1/game/catalog` | Zone + infra catalog |
| POST | `/api/v1/game/sessions` | Create session |
| POST | `/api/v1/game/sessions/:id/turn` | Resolve a turn |
| GET | `/api/v1/game/leaderboard` | Global leaderboard |

## Verification

```bash
cd backend && npx tsc --noEmit -p tsconfig.json
cd FrontEnd && npx tsc --noEmit
```
