# Cerply V2.0 - Deployment Guide

**Target Environments**: Staging, Production  
**Last Updated**: October 29, 2025

---

## Prerequisites

- **Database**: PostgreSQL 14+ with Drizzle ORM
- **Node.js**: 18+
- **Environment Variables**: See `.env.example`
- **Docker**: Latest (for containerized deployment)

---

## Environment Variables

### Required for All Environments

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/cerply_v2

# API Server
PORT=8080
NODE_ENV=production

# Web App
NEXT_PUBLIC_API_URL=https://api.cerply.com
WEB_URL=https://app.cerply.com

# OpenAI (for AI features)
OPENAI_API_KEY=sk-...

# Session/Auth
AUTH_SESSION_TTL_SECONDS=604800
REDIS_URL=redis://localhost:6379

# Feature Flags (V2.0)
V2_ENABLED=true
V2_DEV_MODE=false  # true only for local dev
```

### Optional: Integrations

```bash
# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...

# Microsoft Teams
TEAMS_BOT_ID=...
TEAMS_TENANT_ID=...
TEAMS_BOT_TOKEN=...

# Email (for notifications)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=...
```

---

## Database Setup

### 1. Run V2 Migration

```bash
cd api
npm run migrate
# This runs all migrations including 031_v2_pivot_schema.sql
```

### 2. Seed Demo Data (Staging Only)

```bash
npm run seed:v2
# Loads test org, users, modules, assignments
```

### 3. Verify Tables

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%v2%';
-- Should show: modules, module_sections, module_items, etc.
```

---

## API Deployment (Express Backend)

### Option A: Docker (Recommended)

```bash
# Build image
docker build -t cerply-api-v2:latest ./api

# Run container
docker run -d \
  --name cerply-api-v2 \
  -p 8080:8080 \
  --env-file .env.production \
  cerply-api-v2:latest

# Check logs
docker logs -f cerply-api-v2
```

### Option B: Direct (Node.js)

```bash
cd api
npm install
npm run build  # Compiles TypeScript
npm start      # Runs dist/index.js
```

### Health Check

```bash
curl http://localhost:8080/api/health
# Expected: { "status": "healthy", "version": "2.0.0" }
```

---

## Web App Deployment (Next.js)

### Option A: Docker

```bash
# Build image
docker build -t cerply-web-v2:latest ./web

# Run container
docker run -d \
  --name cerply-web-v2 \
  -p 3000:3000 \
  --env-file .env.production \
  cerply-web-v2:latest
```

### Option B: Vercel (Recommended for Next.js)

```bash
cd web
vercel --prod
# Follow prompts, set environment variables in Vercel dashboard
```

### Option C: Direct

```bash
cd web
npm install
npm run build
npm start
```

---

## Render Deployment

### API Service (Frankfurt Region)

1. **Create Web Service**: `cerply-api-v2-staging`
2. **Runtime**: Docker
3. **Branch**: `docs/epic14-v2-ai-first-spec`
4. **Dockerfile Path**: `./api/Dockerfile`
5. **Environment Variables**: Set all required vars in dashboard
6. **Health Check Path**: `/api/health`
7. **Auto-Deploy**: On push to branch

### Web Service

1. **Create Web Service**: `cerply-web-v2-staging`
2. **Runtime**: Node
3. **Build Command**: `cd web && npm install && npm run build`
4. **Start Command**: `cd web && npm start`
5. **Environment Variables**: Set `NEXT_PUBLIC_API_URL`, etc.

---

## Database Migration on Render

### Manual Migration

```bash
# Set DATABASE_URL locally to Render database
export DATABASE_URL="postgresql://cerply_user:...@dpg-xxx.frankfurt-postgres.render.com/cerply_v2"

# Run migration
cd api
npm run migrate

# Verify
psql $DATABASE_URL -c "SELECT * FROM modules LIMIT 1;"
```

### Auto-Migration (Not Recommended for Production)

Add to `api/package.json`:
```json
{
  "scripts": {
    "start": "npm run migrate && node dist/index.js"
  }
}
```

---

## Post-Deployment Checklist

### Smoke Tests

1. **API Health**:
```bash
curl https://api-staging.cerply.com/api/health
```

2. **Web App Loads**:
```bash
curl https://app-staging.cerply.com/v2
# Should return HTML
```

3. **Database Connection**:
```bash
curl https://api-staging.cerply.com/api/v2/modules
# Should return empty array or modules
```

4. **Auth Works**:
- Login with test user
- Verify session cookie set
- Access protected route

### Integration Tests

1. **Build Flow**: Create module via API
2. **Push Flow**: Create assignment
3. **Learn Flow**: Submit answer
4. **Track Flow**: Fetch analytics

---

## Rollback Plan

### If Deployment Fails

1. **Revert to Previous Version**:
```bash
# Render: Use "Rollback to..." in dashboard
# Docker: Tag and redeploy previous image
docker pull cerply-api-v2:previous
docker stop cerply-api-v2 && docker rm cerply-api-v2
docker run -d --name cerply-api-v2 cerply-api-v2:previous
```

2. **Database Rollback** (if migration broke):
```sql
-- Identify last good migration
SELECT * FROM drizzle_migrations ORDER BY created_at DESC LIMIT 5;

-- Drop V2 tables (DANGEROUS - backup first!)
DROP TABLE IF EXISTS learner_responses CASCADE;
DROP TABLE IF EXISTS learner_progress CASCADE;
DROP TABLE IF EXISTS module_assignments CASCADE;
-- ... etc.
```

3. **Verify Rollback**:
- Test health endpoint
- Verify V1 features still work
- Check error logs

---

## Monitoring

### Metrics to Track

- **API Response Times**: `/api/v2/*` endpoints
- **Error Rates**: 4xx, 5xx responses
- **Database Connection Pool**: Active/idle connections
- **Memory Usage**: Node.js heap size
- **CPU Usage**: Spike detection

### Logging

All V2 services log to stdout in JSON format:
```json
{
  "level": "info",
  "timestamp": "2025-10-29T12:00:00Z",
  "service": "api-v2",
  "message": "Module created",
  "moduleId": "mod_abc123",
  "userId": "user_123"
}
```

**Log Aggregation**:
- Staging: Render logs dashboard
- Production: DataDog / LogDNA / CloudWatch

---

## Scaling

### Horizontal Scaling

1. **Add More API Instances**: Load balance with Nginx/HAProxy
2. **Read Replicas**: For analytics queries
3. **Redis for Sessions**: Shared session store across instances

### Vertical Scaling

- **API**: Increase memory to 2GB+ for AI model calls
- **Database**: Upgrade to dedicated instance with SSD
- **Web**: CDN for static assets (Vercel automatically does this)

---

## Security

### Pre-Production Checklist

- [ ] All secrets in environment variables (not hardcoded)
- [ ] HTTPS enforced (no HTTP)
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] SQL injection protection (use parameterized queries)
- [ ] XSS protection (sanitize user input)
- [ ] CSRF tokens for web forms
- [ ] Dependency audit: `npm audit fix`

### Ongoing Security

- **Weekly**: Review Dependabot alerts
- **Monthly**: Rotate API keys
- **Quarterly**: Penetration testing

---

## Troubleshooting

### Common Issues

**1. "Cannot find module '../db'"**
- **Cause**: TypeScript compilation issue
- **Fix**: Run `npm run build` in `api/` directory

**2. "request.user is undefined"**
- **Cause**: Auth middleware not loaded
- **Fix**: Ensure V2 routes use `loadUserContext` middleware
- **Dev workaround**: Set `V2_DEV_MODE=true`

**3. "Module not found in database"**
- **Cause**: Demo data not seeded
- **Fix**: Run `npm run seed:v2`

**4. "OpenAI API rate limit exceeded"**
- **Cause**: Too many AI calls
- **Fix**: Implement caching, upgrade OpenAI tier

---

## Support

- **Staging Issues**: Tag `@v2-team` in Slack #cerply-deployments
- **Production Incidents**: Page on-call via PagerDuty
- **Questions**: deployment@cerply.com

---

**Last deployment**: October 29, 2025 (Epic B - UI Complete)  
**Next deployment**: November 1, 2025 (Epic G - Integration Complete)

