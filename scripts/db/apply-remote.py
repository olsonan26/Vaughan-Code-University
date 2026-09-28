#!/usr/bin/env python3
"""Apply supabase/migrations/*.sql to a hosted Supabase project via the Management API.
Usage: SUPABASE_ACCESS_TOKEN=... python3 scripts/db/apply-remote.py <project-ref>
Tracks applied files in supabase_migrations.schema_migrations (same table the Supabase CLI uses)."""
import glob, json, os, sys, urllib.request
ref = sys.argv[1]; tok = os.environ['SUPABASE_ACCESS_TOKEN']
def q(sql):
    req = urllib.request.Request(f'https://api.supabase.com/v1/projects/{ref}/database/query', data=json.dumps({'query': sql}).encode(),
        headers={'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json', 'User-Agent': 'vcu-migrate'})
    try:
        with urllib.request.urlopen(req, timeout=300) as r: return json.loads(r.read() or b'[]')
    except urllib.error.HTTPError as e: raise SystemExit(f'SQL failed: {e.read().decode()[:1500]}')
q("create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text)")
done = {r['version'] for r in q("select version from supabase_migrations.schema_migrations")}
for f in sorted(glob.glob('supabase/migrations/*.sql')):
    base = os.path.basename(f); version, name = base.split('_', 1)[0], base.split('_', 1)[1][:-4]
    if version in done: print('skip', base); continue
    sql = open(f).read()
    q(f"begin;\n{sql}\n;insert into supabase_migrations.schema_migrations(version, name) values ('{version}', '{name}');\ncommit;")
    print('applied', base)
