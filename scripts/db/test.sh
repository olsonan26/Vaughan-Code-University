#!/bin/bash
# Applies all migrations to a fresh local Postgres (with Supabase auth/storage stubs) and runs RLS tests.
# Requires local Postgres + pgvector: bash scripts/db/pg-local.sh (or any PG15+ with pgvector; set PGHOST/PGPORT/PGUSER).
set -euo pipefail
cd "$(dirname "$0")/../.."
export PGHOST="${PGHOST:-/tmp}" PGPORT="${PGPORT:-54322}" PGUSER="${PGUSER:-postgres}"
DB="${TEST_DB:-vcu_test}"
P="psql -v ON_ERROR_STOP=1 -q -X"
$P -d postgres -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB" >/dev/null
$P -d "$DB" -f scripts/db/stubs.sql >/dev/null
for f in supabase/migrations/*.sql; do
  $P -d "$DB" -f "$f" >/dev/null || { echo "FAIL migration $f"; exit 1; }
done
[ -f supabase/seed.sql ] && $P -d "$DB" -f supabase/seed.sql >/dev/null
# Supabase grants table privileges to API roles by default; RLS then restricts rows.
$P -d "$DB" -c "GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role; GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role; GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;" >/dev/null
echo "migrations applied: $(ls supabase/migrations/*.sql | wc -l) files, $($P -d "$DB" -Atc "select count(*) from information_schema.tables where table_schema='public'") tables"
fail=0
for t in supabase/tests/*.sql; do
  if out=$($P -d "$DB" -f "$t" 2>&1); then echo "PASS $t"; else echo "FAIL $t"; echo "$out" | grep -E "ERROR|FAIL" | head -5; fail=1; fi
done
exit $fail
