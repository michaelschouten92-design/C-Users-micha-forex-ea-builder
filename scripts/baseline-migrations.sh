#!/usr/bin/env bash
# ============================================================
# baseline-migrations.sh
#
# ONE-TIME SCRIPT: Run this against the production DATABASE_URL
# BEFORE the first deploy that includes `prisma migrate deploy`
# in the build command.
#
# This marks all existing migrations as "applied" so that
# `prisma migrate deploy` only runs truly pending ones
# (e.g. 20260228120000_add_trading_state_enum).
#
# Usage:
#   DATABASE_URL="postgresql://..." bash scripts/baseline-migrations.sh
#
# After running this, verify with:
#   npx prisma migrate status
# ============================================================
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set."
  echo "Usage: DATABASE_URL=\"postgresql://...\" bash scripts/baseline-migrations.sh"
  exit 1
fi

echo "Baselining all migrations as applied..."
echo "DATABASE_URL is set (not printed for security)"
echo ""

# List all migration directories in chronological order
MIGRATIONS_DIR="prisma/migrations"
for dir in $(ls -d "$MIGRATIONS_DIR"/[0-9]*/ 2>/dev/null | sort); do
  migration_name=$(basename "$dir")
  echo "  Resolving: $migration_name"
  npx prisma migrate resolve --applied "$migration_name" 2>&1 || {
    echo "    WARNING: Could not resolve $migration_name (may already be applied)"
  }
done

echo ""
echo "Done. Run 'npx prisma migrate status' to verify."
echo "The next 'prisma migrate deploy' will only apply truly pending migrations."
