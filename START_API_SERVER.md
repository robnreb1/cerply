# Start API Server with All Required Environment Variables

## Command to Run

```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/api

OPENAI_API_KEY=sk-proj-YOUR-KEY-HERE \
FF_ENSEMBLE_GENERATION_V1=true \
FF_CONTENT_CANON_V1=true \
ADMIN_TOKEN=test-admin-token \
DATABASE_URL="postgresql://cerply_app:ZTv6yzkW3EaO7Hf3n4y12VrdRGtikO8T@dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com/cerply?sslmode=require" \
npm run dev
```

## Instructions

1. **Replace `sk-proj-YOUR-KEY-HERE` with your actual OpenAI API key**
2. Copy the entire command (with your key)
3. Paste into a terminal
4. Wait for: `Server listening at http://0.0.0.0:8080`
5. Test in browser at http://localhost:3000

## What Each Variable Does

- `OPENAI_API_KEY` - Your OpenAI key for GPT-4o calls
- `FF_ENSEMBLE_GENERATION_V1=true` - Enables ensemble content generation
- `FF_CONTENT_CANON_V1=true` - Enables content canon storage
- `ADMIN_TOKEN=test-admin-token` - Authentication token (must match web/.env.local)
- `DATABASE_URL` - PostgreSQL connection with SSL for Render

## Verification

Once started, you should see:
```
{"level":30,"time":...,"msg":"Server listening at http://0.0.0.0:8080"}
```

And this curl should work:
```bash
curl -X POST http://localhost:8080/api/content/understand \
  -H 'Content-Type: application/json' \
  -H 'x-admin-token: test-admin-token' \
  -d '{"artefact":"python programming"}'
```

You should get JSON back (not a 401 error).

