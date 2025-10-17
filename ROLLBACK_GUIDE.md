# Rollback Guide - LLM-Driven Conversational Engine

## 🚨 **If Conversational Engine is Flaky or Slow**

This guide explains how to quickly revert to the old templated system.

---

## ⚡ **Quick Rollback (One Command)**

```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh
git revert 9f70688 --no-edit
```

This will restore the hardcoded templates in the frontend.

---

## 📊 **Performance Comparison**

### Old System (Templates):
- **Response time:** Instant (0ms)
- **Cost:** $0
- **Reliability:** 100%
- **Variation:** None (exact same responses)

### New System (LLM-Driven):
- **Response time:** 1-3 seconds per message
- **Cost:** ~$0.002 per message (~500 tokens @ $0.004/1K)
- **Reliability:** 95-99% (depends on OpenAI uptime)
- **Variation:** Every response is unique

---

## 🔍 **Signs You Should Rollback**

1. **Responses take >5 seconds** consistently
2. **LLM doesn't follow tone guidelines** (too enthusiastic, templated)
3. **Frequent 503 errors** from OpenAI
4. **User complaints** about inconsistent responses
5. **Cost is too high** for production usage

---

## 🛠️ **Partial Rollback Options**

### Option A: Use LLM only for initial message
Keep templates for confirmation/generation, use LLM only for first response.

### Option B: Hybrid approach
Use templates for simple confirmations, LLM for complex refinements.

### Option C: Cache common responses
Cache LLM responses for common topics to reduce cost.

---

## 📝 **Commits Involved**

- **`6e04c8e`** - Backend conversational engine (API routes)
- **`9f70688`** - Frontend integration (removed templates)

To rollback both:
```bash
git revert 9f70688 6e04c8e --no-edit
```

---

## 🧪 **Testing Checklist Before Rollback**

Before deciding to rollback, test:

1. **Response quality**: Are responses natural and varied?
2. **Response time**: Average <3 seconds per message?
3. **Tone consistency**: Oxford professor, not life coach?
4. **Error rate**: <1% errors over 100 messages?
5. **Cost**: Acceptable for expected usage?

---

## 💰 **Cost Estimation**

**Per conversation** (3-5 messages):
- 3-5 LLM calls × ~500 tokens = 1,500-2,500 tokens
- Cost: ~$0.006-$0.010 per conversation
- At 1,000 conversations/day: ~$6-$10/day

**Compare to content generation:**
- Content generation: ~10,000 tokens per topic = ~$0.04/topic
- Conversation is ~25% of generation cost

---

## ✅ **When to Keep the LLM System**

Keep it if:
1. **Responses are notably better** than templates
2. **Performance is acceptable** (<3s average)
3. **Cost is justified** by better UX
4. **Reliability is high** (>95% uptime)
5. **User feedback is positive**

---

## 🔄 **How to Improve If Keeping**

1. **Add response caching** for common patterns
2. **Use faster model** (gpt-4o-mini instead of gpt-4o)
3. **Optimize prompts** to reduce token usage
4. **Add fallback** to templates if LLM fails
5. **Stream responses** for perceived speed improvement

---

**Current Status:** LLM-driven (as of commit 9f70688)
**Last Template Version:** 5e916e4
**Rollback Command:** `git revert 9f70688 --no-edit`

