# Observability & Telemetry

## Budget Alarm (24h)
- Endpoint: `GET /api/ledger/alarm` (env `BUDGET_DAILY_CENTS` enables it)
- Render Cron example (every hour):
  - Command: `bash scripts/cron-budget-check.sh`
  - Env: `BASE=https://cerply-api-staging.onrender.com`, `BUDGET_DAILY_CENTS=500` (=$5.00)

## Quick SQLs (paste into Metabase/Grafana)
- Last 24h spend:
```sql
select date_trunc('hour', ts) as hour, sum(cost_cents)/100.0 as usd
from gen_ledger
where ts >= now() - interval '24 hours'
group by 1 order by 1;
```
