#!/usr/bin/env bash
# Run JalDrishti backend (FastAPI :8000) + frontend (Next.js :3000) together.
# Press Ctrl+C once to stop BOTH.
set -euo pipefail
cd "$(dirname "$0")"

# On exit (incl. Ctrl+C), kill every process in this script's process group.
trap 'echo; echo "Stopping backend + frontend..."; kill 0' EXIT

echo "Backend   -> http://localhost:8000"
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 &

echo "Frontend  -> http://localhost:3000"
npm run dev &

# Wait for either to exit; the EXIT trap then tears down the rest.
wait
