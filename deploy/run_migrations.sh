#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/backend/migrations"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required"
  exit 1
fi

psql_cmd() {
  docker run --rm -v "$MIGRATIONS_DIR:/migrations" postgres:16 psql "$DATABASE_URL" "$@"
}

psql_cmd -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

for file in "$MIGRATIONS_DIR"/*.sql; do
  name="$(basename "$file")"
  applied="$(psql_cmd -tAc "SELECT 1 FROM schema_migrations WHERE filename='$name';" | tr -d '[:space:]')"
  if [[ "$applied" != "1" ]]; then
    echo "Applying $name"
    psql_cmd -v ON_ERROR_STOP=1 -f "/migrations/$name"
    psql_cmd -v ON_ERROR_STOP=1 -c "INSERT INTO schema_migrations (filename) VALUES ('$name')"
  else
    echo "Skipping $name"
  fi
done
