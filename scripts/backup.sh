#!/bin/bash
# Database backup script — creates a local pg_dump snapshot
# Usage: ./scripts/backup.sh [label]
# Example: ./scripts/backup.sh pre-migration-categories
#
# Requires SUPABASE_DB_URL env var (postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres)
# Set it in .env.local or export it before running.

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LABEL=${1:-manual}
OUTDIR="backups"
FILENAME="${OUTDIR}/${TIMESTAMP}_${LABEL}.sql"

# Load from .env.local if SUPABASE_DB_URL not already set
if [ -z "${SUPABASE_DB_URL:-}" ] && [ -f .env.local ]; then
  SUPABASE_DB_URL=$(grep '^SUPABASE_DB_URL=' .env.local | cut -d'=' -f2-)
fi

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "Error: SUPABASE_DB_URL is not set."
  echo "Set it in .env.local or export it: export SUPABASE_DB_URL=postgresql://..."
  exit 1
fi

mkdir -p "$OUTDIR"

echo "Starting backup..."
pg_dump "$SUPABASE_DB_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  > "$FILENAME"

echo "Backup saved to: $FILENAME"
echo "Size: $(du -h "$FILENAME" | cut -f1)"

# Retain only the 2 most recent backups
BACKUP_COUNT=$(ls -1 "$OUTDIR"/*.sql 2>/dev/null | wc -l | tr -d ' ')
if [ "$BACKUP_COUNT" -gt 2 ]; then
  ls -t "$OUTDIR"/*.sql | tail -n +3 | while read -r f; do rm "$f"; done
  echo "Cleaned old backups. Kept 2 most recent."
fi
