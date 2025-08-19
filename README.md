
# Cerply v4.1 — Curator + Adaptive + Trust Labels + Analytics

## Run
```bash
docker compose up -d db
docker compose run --rm api npm run migrate
docker compose run --rm api npm run seed:demo
docker compose up -d --build ai api web
open http://localhost:3000
```

## Feature Flags
Env (API): FF_CURATOR_DASHBOARD_V1, FF_ADAPTIVE_ENGINE_V1, FF_TRUST_LABELS_V1
Env (Web): NEXT_PUBLIC_FF_*

See: [Functional Spec](docs/functional-spec.md)
