# Certified — Verify (preview)

This endpoint re-canonicalizes a plan and recomputes its lock hash server-side to confirm integrity.

- Endpoint: `POST /api/certified/verify`
- Content-Type: `application/json` (strict)
- Request: `{ plan, lock: { algo, hash }, meta? }`
- Response: `{ ok: boolean, computed { algo, hash? }, provided { algo, hash }, mismatch? }`
- CORS: `OPTIONS` returns 204; `ACAO:*` on non-OPTIONS; no credentials.

See also: `docs/spec/use-cases.md` §Certified Plan; `docs/functional-spec.md` §Certified Verify; `api/openapi/build/openapi.json`.
