#!/bin/bash
# Fresh DB + PostgREST for integration tests. Requires Postgres (scripts/db/pg-local.sh) and /tmp/postgrest.
set -e
cd "$(dirname "$0")/../.."
pkill -f "postgrest /tmp/pgrst-it.conf" 2>/dev/null || true
sleep 0.5
TEST_DB=vcu_it bash scripts/db/test.sh >/dev/null
cat > /tmp/pgrst-it.conf <<CONF
db-uri = "postgres://postgres@/vcu_it?host=/tmp&port=54322"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "local-test-secret-local-test-secret-000000"
server-port = 3001
CONF
nohup /tmp/postgrest /tmp/pgrst-it.conf > /tmp/pgrst-it.log 2>&1 &
for i in $(seq 1 30); do curl -s localhost:3001/ >/dev/null && break; sleep 0.3; done
echo "postgrest up"
