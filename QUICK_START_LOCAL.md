# Cerply V2.0 - Local Quick Start

**Quick guide to run V2.0 locally on your machine**

---

## Prerequisites

- Docker Desktop running
- Node.js 18+ installed
- Terminal access

---

## Step-by-Step Setup

### 1. Start PostgreSQL

```bash
cd /path/to/cerply-cursor-starter-v2-refresh
docker compose up -d pg
```

**Expected output**: `Container cerply-pg  Running`

---

### 2. Run V2 Migration

```bash
# Option A: Direct migration (recommended for V2 only)
docker exec -i cerply-pg psql -U cerply -d cerply < api/migrations/031_v2_pivot_schema.sql

# Verify tables created
docker exec cerply-pg psql -U cerply -d cerply -c "\dt" | grep module
```

**Expected output**: Should show `modules`, `module_sections`, `module_items`, `module_assignments`

---

### 3. ⚠️ **IMPORTANT: V2 Backend Integration Status**

The V2 routes are registered but will encounter runtime errors due to:
- Missing TypeScript imports (db, services resolve at runtime)
- Auth middleware needs integration
- Service dependencies need wiring

**Current Status**: 
- ✅ Database schema ready
- ✅ Routes registered  
- ✅ UI components complete
- ⏳ Backend service integration (Epic G - in progress)

**For UAT Testing**: Use the UI components with mock data or wait for full backend integration.

---

### 4. Start API Server (Optional - will have errors)

```bash
cd api

# Set environment variables
export DATABASE_URL=postgresql://cerply:cerply@localhost:5432/cerply
export OPENAI_API_KEY=your-key-here  # If you want AI features
export V2_DEV_MODE=true              # Enables mock auth for testing

# Start server (will log V2 route errors - expected)
npm run dev
```

**Expected**: Server starts but V2 routes will error on use. This is normal - full integration coming in next phase.

**Test health**: Open http://localhost:8080/api/health (V1 routes work fine)

---

### 5. Start Web App

```bash
# In a new terminal
cd web

# Install dependencies if needed
npm install

# Set environment variables
export NEXT_PUBLIC_API_URL=http://localhost:8080

# Start Next.js
npm run dev
```

**Expected output**: `Ready on http://localhost:3000`

---

### 6. Access V2 UI

Open your browser to: **http://localhost:3000/v2**

**Note**: The UI will load, but API calls will fail until backend integration is complete. UI components are fully functional for visual review.

---

## Demo Credentials

- **Manager**: `manager@demo.cerply.com` / `demo2025`
- **Learner 1**: `learner1@demo.cerply.com` / `demo2025`
- **Learner 2**: `learner2@demo.cerply.com` / `demo2025`

---

## Verify Everything Works

### Test API Endpoints

```bash
# Health check
curl http://localhost:8080/api/health

# List modules (should return demo modules)
curl http://localhost:8080/api/v2/modules \
  -H "Authorization: Bearer dev-token"

# Expected: JSON with 3 modules (Compliance Training, Product Knowledge, Leadership Essentials)
```

### Test UI

1. Visit http://localhost:3000/v2
2. Should see 4 cards: Build, Push, Track, Certified
3. Click "Build" - should see 3-pane workspace
4. Click "Track" - should see dashboard tabs

---

## Troubleshooting

### "Cannot find module '../db'"
**Solution**: Make sure you're in the `api` directory and have run `npm install`

### "Database connection failed"
**Solution**: 
```bash
# Check if PostgreSQL is running
docker ps | grep cerply-pg

# If not running, start it
docker compose up -d pg
```

### "request.user is undefined"
**Solution**: Make sure `V2_DEV_MODE=true` is set in your API environment

### "Port 8080 already in use"
**Solution**:
```bash
# Find and kill the process
lsof -ti:8080 | xargs kill -9

# Or change the port
export PORT=8081
npm run dev
```

---

## Clean Slate (Reset Everything)

If you need to start fresh:

```bash
# Stop all services
docker compose down

# Remove database volume
docker volume rm cerply-cursor-starter-v2-refresh_postgres_data

# Start fresh
docker compose up -d pg

# Re-run migration
docker exec -i cerply-pg psql -U cerply -d cerply < api/migrations/031_v2_pivot_schema.sql

# Re-seed data
cd api && DATABASE_URL=postgresql://cerply:cerply@localhost:5432/cerply npm run seed:v2
```

---

## Environment Variables Reference

### API (`api/.env`)
```bash
DATABASE_URL=postgresql://cerply:cerply@localhost:5432/cerply
PORT=8080
NODE_ENV=development
V2_DEV_MODE=true              # Mock auth for local testing
OPENAI_API_KEY=sk-...          # Optional: for AI features
```

### Web (`web/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WEB_URL=http://localhost:3000
```

---

## Next Steps

Once running locally:

1. **Explore the UI**: Try creating a module in the Build workspace
2. **Check the API**: Use the API Reference (docs/API_REFERENCE.md)
3. **Run UAT Scenarios**: Follow docs/UAT_GUIDE.md
4. **Review Analytics**: Navigate to Track to see demo data

---

## Quick Commands Reference

```bash
# Start database
docker compose up -d pg

# Run migration
docker exec -i cerply-pg psql -U cerply -d cerply < api/migrations/031_v2_pivot_schema.sql

# Seed data
cd api && DATABASE_URL=postgresql://cerply:cerply@localhost:5432/cerply npm run seed:v2

# Start API
cd api && DATABASE_URL=postgresql://cerply:cerply@localhost:5432/cerply V2_DEV_MODE=true npm run dev

# Start Web (in new terminal)
cd web && NEXT_PUBLIC_API_URL=http://localhost:8080 npm run dev

# Access V2
open http://localhost:3000/v2
```

---

**Questions?** See docs/UAT_GUIDE.md or docs/DEPLOYMENT.md

