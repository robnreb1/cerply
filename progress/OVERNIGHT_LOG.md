- 2025-09-23 08:00:14 start openapi+e2e branch
- 2025-09-23 09:19:40 start harden branch
- 2025-09-23 09:22:15 step1 drift guard
- 2025-09-23 09:22:15 step2 golden fixture
- 2025-09-23 09:22:15 step3 e2e
- 2025-09-23 09:22:15 step6 canary++
- 2025-09-23 09:40:28 planner pipeline kickoff
- 2025-09-23 09:57:32 step8 playwright expanded
- 2025-09-23 09:57:32 step9 ci updates
- 2025-09-23 10:21:54 study runner kickoff
- 2025-09-23 10:32:31 steps1-4 scaffold+form+runner+persistence
- 2025-09-23 10:46:14 step5 unit tests + vitest config
- 2025-09-23 10:46:14 steps6-7 e2e + ci wired
- 2025-09-23 10:46:14 step8 docs updated
- 2025-09-23 17:12:56 start feat/retention-v0-preview; scaffold retention schemas/routes/tests
- 2025-09-23 17:23:50 retention v0: schemas+engine+routes+tests+docs added; all api tests green
- 2025-09-23 18:56:50 start feat/retention-v0-web; wire Study Runner to retention APIs
- 2025-09-23 19:59:28 web: adapters added; runner resume wired; unit tests passing
- 2025-09-23 20:08:57 web: E2E stable (plan + resume); preview flag set for tests
- 2025-09-23 20:11:02 PR #133 opened: retention v0 web integration (preview)
- 2025-09-23 20:40:41 start feat/adaptive-engine-v1-preview; scaffold engine + flags
- 2025-09-23 20:53:34 adaptive: evaluator + CI job + docs added; PR #134 opened (preview)
2025-09-23T20:26:56Z - kickoff openai adapter v0
2025-09-23T20:32:07Z - implement openai-v0 adapter + route selection
2025-09-23T20:35:28Z - run api tests and typecheck
2025-09-23T20:35:49Z - commit openai adapter v0 + eval + ci + docs
2025-09-23T20:36:11Z - open PR created #135
2025-09-23T20:36:56Z - docs updated: OPENAI_ADAPTER_V0 + flags
2025-09-23T20:37:44Z - add CI workflow for openai eval
2025-09-23T20:41:11Z - fix CI workflow diagnostics (keys, inputs, secrets guard)
2025-09-23T20:44:19Z - fix secrets context + outputs in ci.yml
2025-09-23T20:45:35Z - ci.yml: move keyed job guard to steps; outputs default
2025-09-23T21:01:55Z - verify CI for PR #135
2025-09-23T21:02:38Z - staging deploy verify + header capture
2025-09-23T21:03:56Z - posted staging headers to PR #135
2025-09-23T21:04:10Z - check keyed smoke status
2025-09-23T21:04:23Z - keyed smoke note
2025-09-23T21:04:36Z - attempt enable squash auto-merge
2025-09-23T21:12:52Z - kickoff analytics pilot v0 (preview)
