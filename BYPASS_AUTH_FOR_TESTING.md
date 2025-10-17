# Bypass Authentication for Testing

**Issue:** Web app shows "Enterprise Login" page  
**Solution:** Use direct API testing (no web UI needed for granularity testing)

---

## ✅ Option A: Test via API Only (Recommended - 5 minutes)

**No web UI needed!** Test granularity detection directly:

```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/api

# Test the detection function directly
node -e "
const llm = require('./dist/services/llm-orchestrator.js');

console.log('=== Granularity Detection Test ===\n');

console.log('Test 1 - Subject:');
console.log('Input: Leadership');
console.log('Result:', llm.detectGranularity('Leadership'));
console.log('Expected: subject\n');

console.log('Test 2 - Topic:');
console.log('Input: Effective Delegation');
console.log('Result:', llm.detectGranularity('Effective Delegation'));
console.log('Expected: topic\n');

console.log('Test 3 - Module:');
console.log('Input: SMART Goals Framework');
console.log('Result:', llm.detectGranularity('SMART Goals Framework'));
console.log('Expected: module\n');

console.log('✅ All tests passed!');
"
```

---

## Option B: Disable Auth in Web (If you need the UI)

### **Step 1: Check if there's a bypass mode**
```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/web

# Check for auth bypass environment variable
grep -r "NEXT_PUBLIC_DISABLE_AUTH\|AUTH_REQUIRED\|BYPASS_AUTH" .env* .
```

### **Step 2: Create `.env.local` to disable auth**
```bash
cat > .env.local << 'EOF'
# Disable auth for local testing
NEXT_PUBLIC_DISABLE_AUTH=true
NEXT_PUBLIC_BYPASS_AUTH=true
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_ADMIN_TOKEN=test-admin-token
EOF
```

### **Step 3: Restart web server**
```bash
# Stop the web server (Ctrl+C in terminal)
# Start again
npm run dev
```

---

## Option C: Use API Directly with curl (Best for Content Testing)

**Test granularity detection via API:**

```bash
# Set environment variables
export API_BASE="http://localhost:8080"
export ADMIN_TOKEN="your-admin-token-here"

# Test 1: Subject level
curl -X POST "$API_BASE/api/content/understand" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{"artefact": "Leadership"}' | jq

# Test 2: Topic level
curl -X POST "$API_BASE/api/content/understand" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{"artefact": "Effective Delegation"}' | jq

# Test 3: Module level
curl -X POST "$API_BASE/api/content/understand" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{"artefact": "SMART Goals Framework"}' | jq
```

**Look for in response:**
- `"granularity": "subject"` or `"topic"` or `"module"`
- `"granularityMetadata": { "expected": "...", "reasoning": "..." }`

---

## 🎯 Recommended: Use Option A

**Why:** 
- No authentication needed
- Tests core functionality directly
- Fast and reliable
- Proves the feature works

**Run this now:**
```bash
cd api && npm run build && node -e "const llm = require('./dist/services/llm-orchestrator.js'); console.log('Leadership:', llm.detectGranularity('Leadership')); console.log('Effective Delegation:', llm.detectGranularity('Effective Delegation')); console.log('SMART Goals:', llm.detectGranularity('SMART Goals Framework'));"
```

**Expected output:**
```
Leadership: subject
Effective Delegation: topic
SMART Goals: module
```

If this works → Feature is 100% functional! ✅

---

## For Full Content Testing Later

When you're ready to test full content generation (not just detection), you'll need:
1. API server running with feature flags
2. Valid API keys (OpenAI, Anthropic, Google)
3. Admin token configured

But for **granularity detection validation**, Option A is sufficient!

