# Testing Phase 2 with Render PostgreSQL Database

## Quick Start (Copy & Paste)

I found your Render database URL in your config. Here's how to test Phase 2 with real data:

### Step 1: Set Your Database URL

```bash
export DATABASE_URL="postgresql://cerply_app:ZTv6yzkW3EaO7Hf3n4y12VrdRGtikO8T@dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com/cerply"
```

### Step 2: Set Your OpenAI API Key

```bash
export OPENAI_API_KEY=sk-your-key-here
```

### Step 3: Run the Test

```bash
./test-with-render-db.sh
```

---

## What the Script Does

1. ✅ Connects to your Render PostgreSQL database
2. ✅ Gets a real question from the `items` table
3. ✅ Calls the explanation endpoint with that question
4. ✅ Tests caching (second call should be instant and free)
5. ✅ Displays metrics (tokens, cost, cache status)

---

## Expected Output

```
🔗 Testing Phase 2 with Render PostgreSQL
==========================================

✅ DATABASE_URL is set

📡 Connecting to: dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com

1️⃣ Testing database connection...
✅ Connected to database

2️⃣ Getting a question from database...
✅ Found question:
   ID: 550e8400-e29b-41d4-a716-446655440000
   Question: What is the primary function of mitochondria?...

3️⃣ Testing explanation endpoint with real question...
   Query: 'Why is this the correct answer?'

✅ Success! Response:

{
  "explanation": "Great question! Mitochondria are often called the 'powerhouse of the cell'...",
  "model": "gpt-4o-mini",
  "tokensUsed": 245,
  "cost": 0.000098,
  "cached": false,
  "confusionLogId": "abc123..."
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Metrics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Model:        gpt-4o-mini
  Tokens Used:  245
  Cost:         $0.000098
  Cached:       false

4️⃣ Testing cache (calling again with same question)...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Cached Response Metrics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tokens Used:  0
  Cost:         $0
  Cached:       true

✅ Caching works perfectly!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Phase 2 Successfully Tested with Real Data!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary:
  ✅ Connected to Render database
  ✅ Retrieved real question data
  ✅ Generated LLM explanation
  ✅ Caching working (cost: $0 for cached)
  ✅ Phase 2 fully operational
```

---

## Troubleshooting

### Error: "Could not connect to database"

**Issue:** Your IP might not be whitelisted in Render

**Fix:**
1. Go to https://dashboard.render.com
2. Select your PostgreSQL database
3. Go to "Access Control" or "Connections"
4. Add your IP address or enable "Allow external connections"

---

### Error: "No questions found in database"

**Issue:** Database is empty

**Fix:** Seed your Render database:

```bash
cd api
export DATABASE_URL="postgresql://cerply_app:ZTv6yzkW3EaO7Hf3n4y12VrdRGtikO8T@dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com/cerply"
npm run seed:demo
cd ..
./test-with-render-db.sh
```

---

### Error: "OPENAI_API_KEY environment variable is required"

**Issue:** OpenAI key not set

**Fix:**
```bash
export OPENAI_API_KEY=sk-your-actual-key-here
./test-with-render-db.sh
```

Get a key from: https://platform.openai.com/api-keys

---

### Error: "The 'items' table doesn't exist"

**Issue:** Migrations haven't been run

**Fix:**
```bash
cd api
export DATABASE_URL="postgresql://your-render-url"
npm run migrate
npm run seed:demo
cd ..
./test-with-render-db.sh
```

---

## Manual Testing (Alternative Method)

If the script doesn't work, you can test manually:

### Step 1: Connect to Database and Get Question ID

```bash
export DATABASE_URL="postgresql://cerply_app:ZTv6yzkW3EaO7Hf3n4y12VrdRGtikO8T@dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com/cerply"

psql "$DATABASE_URL" -c "SELECT id, stem FROM items LIMIT 1;"
```

Copy the question ID (first column).

### Step 2: Test Explanation Endpoint

Replace `YOUR_QUESTION_ID` with the ID from step 1:

```bash
curl -X POST http://localhost:8080/api/chat/explanation \
  -H "Content-Type: application/json" \
  -H "x-admin-token: test-admin-token-12345" \
  -d '{
    "questionId": "YOUR_QUESTION_ID",
    "query": "Why is this the correct answer?"
  }' | jq .
```

### Step 3: Test Caching

Run the same command again and verify:
- `cached: true`
- `cost: 0`
- `tokensUsed: 0`

---

## Security Note

⚠️ **Important:** The database URL shown above contains credentials. After testing:

1. Rotate the password in Render dashboard
2. Update your `.env` file with new credentials
3. Don't commit database URLs to git

---

## Verify Confusion Log

Check that explanations are being logged:

```bash
psql "$DATABASE_URL" -c "SELECT * FROM confusion_log ORDER BY created_at DESC LIMIT 5;"
```

You should see:
- Your user ID
- Question ID
- Your query ("Why is this the correct answer?")
- The explanation provided
- `helpful` column (null until feedback is given)

---

## Next Steps

Once you see ✅ for all tests:

1. ✅ Phase 2 is fully operational with real data
2. 🚀 Continue to Phase 3 (Free-Text Answer Validation)
3. 📊 Monitor costs in OpenAI dashboard

---

## Cost Monitoring

Your first test will cost ~$0.0001. Subsequent calls with the same question+query are FREE (cached).

Example costs:
- 1 explanation: $0.0001
- 100 unique explanations: $0.01
- 1000 unique explanations: $0.10
- With 60% cache hit rate: 40% of above costs

Monitor at: https://platform.openai.com/usage

---

## Summary Commands

```bash
# Complete test (all-in-one)
export DATABASE_URL="postgresql://cerply_app:ZTv6yzkW3EaO7Hf3n4y12VrdRGtikO8T@dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com/cerply"
export OPENAI_API_KEY=sk-your-key-here
./test-with-render-db.sh
```

That's it! 🎉

