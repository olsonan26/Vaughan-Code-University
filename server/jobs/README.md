# Durable Generation Job Engine

The Durable Generation Job Engine powers the AI Instructor Studio & Course Factory pipeline.
It handles multi-step AI generation tasks (source processing, course blueprinting, lesson drafting, visual prompt creation, assessments, worksheets, and quality audits) using a database-backed DAG execution model.

---

## Architecture & The Three Execution Pumps

Step execution is driven by three complementary execution pumps:

1. **Kick Pump (`kickWorker`)**:
   - **Trigger**: Called immediately when a job is enqueued or retried (`POST /api/jobs`, `POST /api/jobs/:id/retry`).
   - **Mechanism**: On Vercel, uses `c.executionCtx.waitUntil(runOnce(...))` to start worker execution asynchronously without delaying the HTTP response to the client. Falls back to a fire-and-forget HTTP request to `/api/jobs/worker` using `APP_URL` and `WORKER_SECRET`.

2. **Poll Pump (Opportunistic Queue Pump)**:
   - **Trigger**: Fires when the frontend polls `GET /api/jobs/:id`.
   - **Mechanism**: If the job has pending/runnable steps and no steps are currently marked `running`, `GET /api/jobs/:id` runs `runOnce({ maxSteps: 1, timeBudgetMs: 2500 })` before returning. This guarantees instant progress feedback in local development and low-traffic environments even without external cron schedulers.

3. **Scheduler Pump (Cron / Background Worker)**:
   - **Trigger**: Periodic cron invocation of `POST /api/jobs/worker`.
   - **Mechanism**: Dedicated background execution with larger step/time budgets (e.g., 50s runtime budget). Supports Vercel Cron or Supabase `pg_cron` + `pg_net`.

---

## Configuration & Schedulers

### Vercel Cron Configuration (`vercel.json`)
*Note: Vercel Hobby plan limits cron triggers to once per day. For production, use Supabase `pg_cron` + `pg_net` for minute-by-minute worker execution.*

```json
{
  "crons": [
    {
      "path": "/api/jobs/worker",
      "schedule": "* * * * *"
    }
  ]
}
```

### Supabase `pg_cron` + `pg_net` Scheduled Runner (Recommended)

Include the following SQL migration script in Supabase to run the job worker every minute:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule job engine worker pump every minute
SELECT cron.schedule(
  'vcu-job-engine-worker-pump',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value->>'url' FROM app_settings WHERE key = 'app_url') || '/api/jobs/worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-worker-secret', (SELECT value->>'secret' FROM app_settings WHERE key = 'worker_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## Durability & Recovery Guarantees

- **Atomic Step Claiming**: Steps are claimed via Supabase RPC `claim_next_job_step()` using `FOR UPDATE SKIP LOCKED`. Concurrent workers will never claim or execute the same step twice.
- **Lock Expiry & Reclaim**: When a worker claims a step, `locked_at` and `locked_by` are set with a lock duration (default 300s). If a worker process crashes, times out, or experiences a network disconnection mid-run, the lock expires automatically. On the next worker execution, the RPC reclaims the expired step and increments its attempt count.
- **Handler Idempotency Contract**: Because steps can be interrupted and retried, **all step handlers MUST be idempotent**. Handlers must write outputs using stable keys (e.g. `course_id`, `lesson_id`, `section_id`) with database upserts/overwrites rather than duplicate appends.
- **Partial Progress Retention**: If a step exhausts its maximum retries and terminally fails, the parent job transitions to `failed`, but outputs of all previously completed steps are preserved intact. Instructors can retry only the failed step without losing prior progress.
