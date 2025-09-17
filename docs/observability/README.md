# Observability & Telemetry

## Budget Alarm (24h)
- Endpoint: `GET /api/ledger/alarm` (env `BUDGET_DAILY_CENTS` enables it)
- Render Cron example (every hour):
  - Command: `bash scripts/cron-budget-check.sh`
  - Env: `BASE=https://cerply-api:staging-latest.onrender.com`, `BUDGET_DAILY_CENTS=500` (=$5.00)

## Quick SQLs (paste into Metabase/Grafana)
- Last 24h spend:
```sql
select date_trunc('hour', ts) as hour, sum(cost_cents)/100.0 as usd
from gen_ledger
where ts >= now() - interval '24 hours'
group by 1 order by 1;
select type, count(*) as n
from events
where ts >= now() - interval '24 hours'
group by 1 order by n desc limit 10;
with s as (
  select (payload->>'ms')::numeric as ms
  from events where type='latency' and ts>= now()-interval '24 hours'
)
select percentile_disc(0.95) within group (order by ms) as p95_ms from s;
```
