# 🚀 Quick Start: Manual UAT Testing

## Current Status
✅ API running on port 8080  
✅ Web running on port 3000  
❌ You're seeing a redirect loop at `/login`

---

## ✅ How to Fix & Start Testing

### **Step 1: Use Dev Login Helper**

Instead of going to `/login`, go to:

```
http://localhost:3000/dev/login-manager
```

This will:
1. Automatically log you in as a manager
2. Set the session cookie
3. Redirect you to the home page

---

### **Step 2: Navigate to Module Builder**

Once logged in, go to:

```
http://localhost:3000/curator/modules/new
```

This is where you'll test the conversational module creation agent.

---

### **Step 3: Run the 7 UAT Scenarios**

Follow the test scenarios in `EPIC14_UAT_TEST_REPORT.md`:

#### **UAT-1: Natural Context Inference**
Type: `"I need to train my sales team on our new product pricing model"`

**Expected:**
- ✅ Agent understands topic = pricing, audience = sales team
- ✅ Agent does NOT ask "What topic?"
- ✅ Agent asks smart question (e.g., "Do you have internal documents?")

---

#### **UAT-2: Loop-Guard**
Continue the conversation:
- Turn 2: `"They're experienced sellers, need them ready by Jan 15"`
- Turn 3: `"Actually, some are beginners"`

**Expected:**
- ✅ Agent never asks about experience level again
- ✅ Agent never asks about deadline again

---

#### **UAT-3: One-Shot Module Creation**
Start a NEW conversation:
Type: `"Train my engineering team on TypeScript generics. They're intermediate level. Need 85% proficiency by Dec 1st."`

**Expected:**
- ✅ Agent generates module preview IMMEDIATELY (all info provided)
- ✅ Preview shows: title, sections, estimated time, target proficiency 85%

---

#### **UAT-4: Natural Refinement**
Continue from UAT-3:
Type: `"Add a section on advanced patterns like mapped types"`

**Expected:**
- ✅ Agent acknowledges naturally ("Great! I've added...")
- ✅ Preview updates with new section

---

#### **UAT-5: File Upload**
Click the 📎 upload button and select a PDF

**Expected:**
- ✅ Upload works inline (no page redirect)
- ✅ Agent says "I've analyzed your document..."
- ✅ Content marked as 🔒 (proprietary) in preview

---

#### **UAT-6: Suggestion Buttons**
**Expected:**
- ✅ Buttons like "Upload Documents", "Generate Preview" are visible
- ✅ Clicking button sends that message
- ✅ Agent responds appropriately

---

#### **UAT-7: Conversational Tone**
Overall impression:

**Rate 1-5:**
- Does it feel like an expert consultant (not a database form)? ___/5
- Is the language natural ("Let's", "Great!", "I'll help")? ___/5
- Would you enjoy using this daily? ___/5

---

## 🛑 If You See Errors

### **"UNAUTHORIZED" or "Authentication required"**
→ Make sure you went through `/dev/login-manager` first

### **"Module not found" or 404**
→ Check that the route is `/curator/modules/new` (not `/manager/modules/new`)

### **"OpenAI API error"**
→ Make sure `OPENAI_API_KEY` is set in your API terminal (see terminal selection above)

### **Agent responses are generic/template-like**
→ This is a FAIL - means LLM isn't being used properly
→ Report this immediately

---

## 📋 Printable Checklist

```
Epic 14 v2.0 - Manual UAT

Date: _______________
Tester: Robert Ford

┌─────────────────────────────────────────────────────────┐
│ SETUP                                                   │
├─────────────────────────────────────────────────────────┤
│ [ ] Logged in via /dev/login-manager                    │
│ [ ] At /curator/modules/new                             │
│ [ ] OPENAI_API_KEY set in API terminal                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ UAT-1: NATURAL CONTEXT INFERENCE                        │
│ [ ] Context inferred (topic, audience)                  │
│ [ ] No obvious questions                                │
│ [ ] Natural tone                                        │
│ Result: PASS / FAIL                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ UAT-2: LOOP-GUARD                                        │
│ [ ] No repeated questions                               │
│ Result: PASS / FAIL                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ UAT-3: ONE-SHOT MODULE CREATION                          │
│ [ ] Preview generated immediately                       │
│ [ ] All details present                                 │
│ Result: PASS / FAIL                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ UAT-4: NATURAL REFINEMENT                                │
│ [ ] Natural acknowledgment                              │
│ [ ] Preview updated                                     │
│ Result: PASS / FAIL                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ UAT-5: FILE UPLOAD                                       │
│ [ ] Upload inline                                       │
│ [ ] Agent acknowledges                                  │
│ [ ] Marked proprietary                                  │
│ Result: PASS / FAIL                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ UAT-6: SUGGESTION BUTTONS                                │
│ [ ] Suggestions visible                                 │
│ [ ] Buttons work                                        │
│ Result: PASS / FAIL                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ UAT-7: CONVERSATIONAL TONE                               │
│ Consultant feel (1-5): ___                              │
│ Natural language (1-5): ___                             │
│ Result: PASS / FAIL                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ FINAL RESULT                                            │
│ Tests Passed: ___/7                                     │
│ Tests Failed: ___/7                                     │
│                                                         │
│ [ ] APPROVED FOR STAGING                                │
│ [ ] REQUIRES FIXES                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Success Criteria

**To approve for staging, you need:**
- ✅ At least 6/7 tests passing
- ✅ UAT-1 (context inference) MUST pass
- ✅ UAT-2 (loop-guard) MUST pass
- ✅ UAT-7 (conversational tone) score ≥ 3/5

---

## 📝 Reporting Results

When done, report back with:
1. Number of tests passed (___/7)
2. Any specific failures or issues
3. Overall impression (1-5 rating)

I'll then either:
- ✅ Help you merge to staging (if approved)
- 🔧 Fix any issues found (if fixes needed)

---

**Start here:** http://localhost:3000/dev/login-manager

Good luck! 🚀

