# Certified Audit Trail (Preview)

When multiphase planning is active (FF_CERTIFIED_PROPOSERS=true and FF_CERTIFIED_CHECKER=true), the API writes a single JSON log line per request.

- logger tag: certified_multiphase_audit
- fields: request_id, engines (array), decision (notes), lock (hash prefix), citations_len (count)
- PII is not included (no IP, UA, or raw body).

Example:

```json
{"request_id":"9f1...","engines":["adaptive-v1","openai-v0"],"decision":"selected:adaptive-v1;scores:adaptive-v1:9,openai-v0:4;reachable:1/2","lock":"abc1234def5678","citations_len":2}
```

This trail is emitted via the app logger and appears in server logs (Render/Cloud). It is preview-only and should not be used as a compliance store.


