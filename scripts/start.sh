#!/usr/bin/env bash
set -Eeuo pipefail

export NODE_ENV="${NODE_ENV:-production}"
export API_PORT="${API_PORT:-4500}"
export API_HOST="${API_HOST:-0.0.0.0}"
export API_URL="${API_URL:-http://127.0.0.1:4500}"

: "${APP_ORIGINS:?APP_ORIGINS is required}"
: "${COOKIE_SECURE:?COOKIE_SECURE is required (1 or 0)}"

api_pid=""
next_pid=""

cleanup() {
    trap - TERM INT
    if [[ -n "$next_pid" ]]; then
        kill -TERM "$next_pid" 2>/dev/null || true
    fi
    if [[ -n "$api_pid" ]]; then
        kill -TERM "$api_pid" 2>/dev/null || true
    fi
    wait 2>/dev/null || true
}
trap 'cleanup; exit 143' TERM INT

echo "[start] seeding demo data when the database is empty"
./node_modules/.bin/tsx server/seed.ts --if-empty

echo "[start] API on ${API_HOST}:${API_PORT}"
./node_modules/.bin/tsx server/index.ts &
api_pid=$!

api_ready=0
for _ in {1..30}; do
    if ! kill -0 "$api_pid" 2>/dev/null; then
        echo "[start] API exited before becoming healthy" >&2
        cleanup
        exit 1
    fi
    if curl -fsS "http://127.0.0.1:${API_PORT}/api/health" >/dev/null 2>&1; then
        api_ready=1
        break
    fi
    sleep 1
done

if [[ "$api_ready" -ne 1 ]]; then
    echo "[start] API health check timed out" >&2
    cleanup
    exit 1
fi

echo "[start] Next.js on 0.0.0.0:3000"
./node_modules/.bin/next start -p 3000 &
next_pid=$!

status=0
wait -n "$next_pid" "$api_pid" || status=$?
echo "[start] a process exited (status ${status}); shutting down"
cleanup
exit "$status"
