#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/FrontEnd"

cleanup() {
  echo
  echo "Stopping dev servers..."
  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

# Avoid port and lock collisions from stale local dev runs.
pkill -f "node --watch --experimental-strip-types src/server.ts" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
rm -f "$FRONTEND_DIR/.next/dev/lock"

echo "Starting database..."
docker compose -f "$ROOT_DIR/docker-compose.yml" up -d db >/dev/null

echo "Ensuring backend environment file exists..."
if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  sed -i '' 's#^CORS_ORIGIN=.*#CORS_ORIGIN=http://localhost:3000#' "$BACKEND_DIR/.env"
fi

echo "Starting backend on http://localhost:4000"
(
  cd "$BACKEND_DIR"
  npm run dev
) &
BACKEND_PID=$!

# Wait briefly so frontend does not start before backend binds.
sleep 2

echo "Starting frontend on http://localhost:3000"
(
  cd "$FRONTEND_DIR"
  npm run dev
) &
FRONTEND_PID=$!

echo
echo "EcoCity Builder is starting..."
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:4000/health"
echo

echo "Press Ctrl+C to stop both dev servers."
wait "$BACKEND_PID" "$FRONTEND_PID"
