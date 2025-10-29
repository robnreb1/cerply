# 🚀 Quick Start for Manual UAT

## Prerequisites
- Docker running (for PostgreSQL)
- Node.js 20+
- Ports 3000 (web) and 8080 (API) available

## Start Everything (3 commands)

### 1. Start PostgreSQL (if not running)
```bash
docker start cerply-pg
```

### 2. Start API Server
```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/api
DATABASE_URL="postgresql://cerply:cerply@localhost:5432/cerply" npm run dev
```

### 3. Start Web Server (new terminal)
```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/web
npm run dev
```

---

## Access the Application

Open: **http://localhost:3000**

- Automatically redirects to `/v2/build`
- 3-pane interface: Chat | Content | Calibration

---

## Test Module Creation

1. **Type in chat**: "Create a Python basics module for beginners"
2. **Click** "Send"
3. **Watch**:
   - Loading indicator appears
   - Module ID shows in header
   - Success message in chat

---

## Current Test Status: 12/15 Passing (80%)

### ✅ Working
- Module creation from chat
- All UI pages load
- Navigation works
- Dark theme applied
- Performance <2s

### ⚠️ Limited
- Dashboards show 0 metrics (need real data)

---

## Quick Verification

```bash
# Check modules created
docker exec -it cerply-pg psql -U cerply -d cerply -c "SELECT id, title FROM modules ORDER BY created_at DESC LIMIT 5;"

# Check API health
curl http://localhost:8080/api/health

# Run automated tests
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh
SKIP_WEBSERVER=1 npm run uat
```

---

## If Issues

1. **API not responding**: Check DATABASE_URL is set
2. **Web not loading**: Clear browser cache, restart server
3. **Module creation fails**: Check API logs
4. **Tests failing**: Restart both servers

---

**Ready to go! 🎉**
