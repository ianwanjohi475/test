#!/usr/bin/env bash
# One command to run SimuPBX live on your desktop:
#   bash run-desktop.sh          → live engine + app in your browser
#   bash run-desktop.sh --app    → same, wrapped in the native desktop window
#
# Optional: export ANTHROPIC_API_KEY=sk-... first for real Zuri AI answers.

set -euo pipefail
cd "$(dirname "$0")"

echo "▸ Starting Postgres (Docker)…"
docker compose -f docker-compose.dev.yml up -d
until docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U simupbx >/dev/null 2>&1; do
  sleep 1
done

echo "▸ Installing dependencies (first run only)…"
(cd api && npm install --no-audit --no-fund >/dev/null)
(cd web && npm install --no-audit --no-fund >/dev/null)

cleanup() { kill 0 2>/dev/null || true; }
trap cleanup EXIT INT TERM

echo "▸ Starting the live engine (API, SIMULATE=1)…"
(
  cd api
  SIMULATE=1 \
  DATABASE_URL=postgres://simupbx:simupbx@localhost:5432/simupbx \
  ADMIN_EMAIL="${ADMIN_EMAIL:-admin@simupbx.local}" \
  ADMIN_PASSWORD="${ADMIN_PASSWORD:-simupbx}" \
  JWT_SECRET="${JWT_SECRET:-local-desktop-secret}" \
  npm run dev
) &

echo "▸ Starting the app…"
(cd web && npm run dev) &

sleep 6
echo ""
echo "──────────────────────────────────────────────────"
echo "  SimuPBX is running LIVE."
echo "  Open:   http://localhost:3000"
echo "  Login:  ${ADMIN_EMAIL:-admin@simupbx.local} / ${ADMIN_PASSWORD:-simupbx}"
echo "  Watch the Phone tab — calls start ringing in ~30s."
echo "──────────────────────────────────────────────────"
echo ""

if [[ "${1:-}" == "--app" ]]; then
  (cd desktop && npm install --no-audit --no-fund >/dev/null && npm start) &
fi

wait
