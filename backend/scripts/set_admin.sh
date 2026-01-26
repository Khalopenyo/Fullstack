#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required"
  exit 1
fi

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <email-or-uid> [true|false]"
  exit 1
fi

IDENT="$1"
VALUE="${2:-true}"

if [[ "$VALUE" != "true" && "$VALUE" != "false" ]]; then
  echo "Second аргумент должен быть true или false"
  exit 1
fi

safe_ident=${IDENT//\'/\'\'}

if [[ "$IDENT" == *"@"* ]]; then
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
    -c "UPDATE users SET is_admin = $VALUE, updated_at = now() WHERE email = '$safe_ident';"
else
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
    -c "UPDATE users SET is_admin = $VALUE, updated_at = now() WHERE id = '$safe_ident'::uuid;"
fi
