#!/usr/bin/env bash
# =============================================================================
# start.sh — Production start script for Render
#
# This script:
#   1. Runs `alembic upgrade head` with retries (up to 5 attempts, 5s apart)
#      so that transient DB cold-start timeouts on Render don't kill the deploy.
#   2. Starts uvicorn only after migrations succeed.
#
# Render start command:
#   bash start.sh
# =============================================================================

set -euo pipefail

log() {
    echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"
}

# ---------------------------------------------------------------------------
# 1. Run Alembic migrations with retry
# ---------------------------------------------------------------------------
MAX_ATTEMPTS=5
ATTEMPT=1
DELAY=5  # seconds between retries

log "=== Running Alembic migrations ==="

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    log "Migration attempt $ATTEMPT / $MAX_ATTEMPTS ..."

    if alembic upgrade head; then
        log "✅ Migrations applied successfully."
        break
    fi

    EXIT_CODE=$?
    log "❌ Migration attempt $ATTEMPT failed (exit code $EXIT_CODE)."

    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        log "💀 All $MAX_ATTEMPTS migration attempts failed. Aborting startup."
        exit 1
    fi

    log "⏳ Retrying in ${DELAY}s..."
    sleep $DELAY
    ATTEMPT=$((ATTEMPT + 1))
done

# ---------------------------------------------------------------------------
# 2. Start the application server
# ---------------------------------------------------------------------------
PORT="${PORT:-8000}"
WORKERS="${WEB_CONCURRENCY:-1}"

log "=== Starting uvicorn on port $PORT with $WORKERS worker(s) ==="
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "$PORT" \
    --workers "$WORKERS" \
    --log-level info \
    --no-access-log
