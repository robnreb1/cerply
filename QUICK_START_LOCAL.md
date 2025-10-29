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

### 3. Seed Demo Data

```bash
cd api

# Install dependencies if needed
npm install

# Run seed script
DATABASE_URL=postgresql://cerply:cerply@localhost:5432/cerply npm run seed:v2
```

**Expected output**:
```
✅ Demo seed data created successfully!
📊 Summary:
  - 1 test organization
  - 3 test users (1 manager, 2 learners)
  - 2 company modules (1 locked, 1 draft)
  - 1 certified module (with stamp)
  - 1 module assignment
  - Progress and response data
```

---

### 4. Start API Server

```bash
cd api

# Set environment variables
export DATABASE_URL=postgresql://cerply:cerply@localhost:5432/cerply
export OPENAI_API_KEY=your-key-here  # If you want AI features
export V2_DEV_MODE=true              # Enables mock auth for testing

# Start server
npm run dev
```

**Expected output**: `API listening on port 8080`

**Test health**: Open http://localhost:8080/api/health

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

### 6. Access V2

Open your browser to: **http://localhost:3000/v2**

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

