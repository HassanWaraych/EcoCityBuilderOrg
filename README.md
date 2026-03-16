# EcoCity Builder

EcoCity Builder is a full-stack city-planning game with:

- a Next.js frontend in `FrontEnd/`
- a Node/Express backend in `backend/`
- a PostgreSQL database started with Docker Compose

## Requirements

- Node.js 22+ recommended
- npm
- Docker Desktop or Docker Engine with Compose

## Project Structure

```text
EcoCityBuilder/
├── FrontEnd/   # Next.js app
├── backend/    # Express API
└── docker-compose.yml  # Postgres
```

## Environment Setup

Create `backend/.env` from `backend/.env.example`.

Example:

```env
PORT=4000
DATABASE_URL=postgres://ecocity:ecocity@localhost:5432/ecocity
JWT_SECRET=dev_jwt_secret_change_me
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000
```

The frontend uses `http://localhost:4000/api/v1` by default, so no frontend env file is required for local development.

## Install

Install dependencies in both apps:

```bash
cd backend
npm install

cd ../FrontEnd
npm install
```

## Run Locally

Start Postgres from the repo root:

```bash
cd /Users/lidmarka/Developer/EcoCityBuilder
docker compose up -d db
```

Start the backend:

```bash
cd /Users/lidmarka/Developer/EcoCityBuilder/backend
npm run dev
```

Start the frontend in a second terminal:

```bash
cd /Users/lidmarka/Developer/EcoCityBuilder/FrontEnd
npm run dev
```

Open the app at:

```text
http://localhost:3000
```

## Useful Endpoints

- `GET /health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/game/catalog`
- `POST /api/v1/game/sessions`

## Verification

These checks pass on the current repo:

```bash
cd backend && npx tsc --noEmit -p tsconfig.json
cd FrontEnd && npm run build
```
