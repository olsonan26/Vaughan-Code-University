#!/bin/bash
# Start local Postgres 15 + pgvector on socket /tmp port 54322 (user postgres, trust auth). Idempotent.
set -e
PGBIN=/usr/lib/postgresql/15/bin
if [ ! -x $PGBIN/pg_ctl ]; then
  apt-get update -q >/dev/null 2>&1; DEBIAN_FRONTEND=noninteractive apt-get install -y -q postgresql-15 postgresql-server-dev-15 build-essential git >/dev/null 2>&1
fi
if [ ! -f /usr/share/postgresql/15/extension/vector.control ]; then
  cd /tmp && rm -rf pgvector && git clone -q --depth 1 --branch v0.8.0 https://github.com/pgvector/pgvector.git && cd pgvector && make -s >/dev/null 2>&1 && make -s install >/dev/null 2>&1
fi
if [ ! -f /tmp/pgdata/PG_VERSION ]; then
  mkdir -p /tmp/pgdata && chown postgres /tmp/pgdata && su postgres -c "$PGBIN/initdb -D /tmp/pgdata -A trust >/dev/null"
fi
if ! su postgres -c "$PGBIN/pg_ctl -D /tmp/pgdata status" >/dev/null 2>&1; then
  su postgres -c "$PGBIN/pg_ctl -D /tmp/pgdata -l /tmp/pgdata/log -o '-p 54322 -k /tmp' start" >/dev/null
  sleep 2
fi
psql -h /tmp -p 54322 -U postgres -Atc "select 'postgres ready'"
