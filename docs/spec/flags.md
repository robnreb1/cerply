# Feature Flags
- ff_connectors_basic_v1 (default: off in prod, on in dev)
- ff_quality_bar_v1
- ff_cost_guardrails_v1
- ff_group_challenges_v1
- ff_certified_sla_status_v1
- ff_marketplace_ledgers_v1
- ff_benchmarks_optin_v1
 
Env (observability)
- OBS_SAMPLE_PCT (0..100) — % of requests sampled as events(type='latency')
- BUDGET_DAILY_CENTS — enables /api/ledger/alarm 24h budget check