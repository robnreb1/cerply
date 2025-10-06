# M3 API Surface - User Acceptance Testing (UAT) Script

**Version:** 1.0  
**Date:** 2025-10-06  
**Epic:** EPIC_M3_API_SURFACE (BRD B1/B2/B8/B9, FSD §21/§21.1)  
**Environment:** Staging  

---

## 🎯 Testing Objective

Validate the M3 API Surface implementation end-to-end through the `/certified/study` interface, ensuring all 6 new endpoints function correctly and provide the expected user experience.

---

## 📋 Prerequisites

Before starting testing:

- [ ] **Access:** You have staging access (or Vercel bypass token if needed)
- [ ] **Browser:** Chrome, Firefox, or Safari (latest version)
- [ ] **Tools:** Browser DevTools open (Network tab for API inspection)
- [ ] **Docs:** Have this script + feedback form (`M3_UAT_FEEDBACK.md`) ready
- [ ] **Time:** Allocate 30-45 minutes for complete testing

---

## 🔍 Environment Setup

### Staging URLs

- **Web UI:** https://cerply-web.vercel.app/certified/study
- **API Base:** https://cerply-api-staging-latest.onrender.com
- **API Health:** https://cerply-api-staging-latest.onrender.com/api/health

### Verification

1. Open browser DevTools (F12 or Cmd+Option+I)
2. Navigate to `/certified/study`
3. Look for **UAT banner** at the top showing:
   - API Base URL
   - Build hash
   - Link to this script

**Expected:**  
```
🧪 UAT Mode | API: https://cerply-api-staging-latest.onrender.com | Build: 9f73dbb | Script
```

**Screenshot:** _[Placeholder: Banner visible at top of page]_

---

## ✅ Test Scenarios

### Scenario 1: Page Load & Initial State

**Steps:**
1. Navigate to `/certified/study`
2. Observe the page layout
3. Check UAT banner is visible
4. Verify demo cards are displayed

**Expected Results:**
- ✅ Page loads without errors
- ✅ UAT banner shows correct API base
- ✅ "Certified Study (Preview)" heading visible
- ✅ 3 demo cards listed:
  - "What is spaced repetition?"
  - "What does SM2 stand for?"
  - "What is the optimal review timing?"
- ✅ "Start Study Session" button present

**Screenshot:** _[Placeholder: Initial page state]_

**Actual Result:** _[To be filled by tester]_

---

### Scenario 2: Start Study Session (POST /api/certified/schedule)

**Steps:**
1. Click "Start Study Session" button
2. Watch DevTools Network tab for API call
3. Observe card interface appears

**Expected Results:**
- ✅ Button shows "Scheduling..." state briefly
- ✅ API Call: `POST /api/certified/schedule`
  - **Request Body:**
    ```json
    {
      "session_id": "sess-<timestamp>",
      "plan_id": "demo-plan",
      "items": [
        {"id": "card-1", "difficulty": 0.5},
        {"id": "card-2", "difficulty": 0.5},
        {"id": "card-3", "difficulty": 0.5}
      ],
      "algo": "sm2-lite"
    }
    ```
  - **Response:** 200 OK
    ```json
    {
      "order": [
        {"item_id": "card-1", "position": 0, "interval_days": 1, "ease_factor": 2.5}
      ],
      "due": "2025-10-06T...",
      "meta": {"algo": "sm2-lite", "session_id": "sess-...", "scheduled_at": "..."}
    }
    ```
- ✅ Card interface appears with first card visible
- ✅ Message: "Scheduled 3 cards using sm2-lite"

**Screenshot:** _[Placeholder: Card interface after scheduling]_

**Actual Result:** _[To be filled by tester]_

---

### Scenario 3: Flip Card (POST /api/certified/progress - flip action)

**Steps:**
1. Click on the card or "Click to reveal answer" text
2. Watch DevTools for API call
3. Observe card flips to show answer

**Expected Results:**
- ✅ Card flips with animation
- ✅ API Call: `POST /api/certified/progress`
  - **Request Body:**
    ```json
    {
      "session_id": "sess-<timestamp>",
      "card_id": "card-1",
      "action": "flip"
    }
    ```
  - **Response:** 204 No Content (idempotent)
- ✅ Answer text visible: "A learning technique that increases intervals..."
- ✅ Grade buttons appear (1-5)

**Screenshot:** _[Placeholder: Flipped card with answer and grade buttons]_

**Actual Result:** _[To be filled by tester]_

---

### Scenario 4: Grade Card (POST /api/certified/progress - grade action)

**Steps:**
1. Click grade button (e.g., grade 4 - "good")
2. Watch DevTools for API call
3. Observe next card appears

**Expected Results:**
- ✅ Button shows brief loading state
- ✅ API Call: `POST /api/certified/progress`
  - **Request Body:**
    ```json
    {
      "session_id": "sess-<timestamp>",
      "card_id": "card-1",
      "action": "grade",
      "grade": 4
    }
    ```
  - **Response:** 204 No Content
- ✅ Message: "Graded: 4/5"
- ✅ Next card appears after 500ms delay
- ✅ Card index increments: "Card 2 of 3"

**Screenshot:** _[Placeholder: Next card after grading]_

**Actual Result:** _[To be filled by tester]_

---

### Scenario 5: Resume Session (GET /api/certified/progress?sid=)

**Steps:**
1. Grade 2-3 cards
2. Refresh the browser page
3. Watch DevTools for resume API call
4. Observe session resumes at correct card

**Expected Results:**
- ✅ On page load, API Call: `GET /api/certified/progress?sid=sess-<timestamp>`
  - **Response:** 200 OK
    ```json
    {
      "session_id": "sess-...",
      "items": [
        {"card_id": "card-1", "last_seen": "...", "grade": 4},
        {"card_id": "card-2", "last_seen": "...", "grade": 3}
      ],
      "updated_at": "2025-10-06T..."
    }
    ```
- ✅ Message: "Loaded 2 previous progress items"
- ✅ Session resumes at the correct card position
- ✅ Progress bar reflects completed cards

**Screenshot:** _[Placeholder: Resumed session showing progress]_

**Actual Result:** _[To be filled by tester]_

---

### Scenario 6: Complete Session

**Steps:**
1. Continue grading until all 3 cards are complete
2. Observe completion state
3. Click "Reset" button
4. Watch for new schedule API call

**Expected Results:**
- ✅ After last card, message: "Session complete! All cards reviewed."
- ✅ Progress bar shows 100%
- ✅ "Reset" button visible
- ✅ Clicking "Reset" triggers new `POST /api/certified/schedule` call
- ✅ Session starts over with card 1

**Screenshot:** _[Placeholder: Session complete state]_

**Actual Result:** _[To be filled by tester]_

---

### Scenario 7: Load Progress from Server

**Steps:**
1. Click "Load Progress" button
2. Watch DevTools for API call
3. Observe progress snapshot displayed

**Expected Results:**
- ✅ API Call: `GET /api/certified/progress?sid=sess-<timestamp>`
- ✅ Progress snapshot box appears showing:
  - Number of items tracked
  - Last updated timestamp
- ✅ Example: "2 items tracked, last updated 10:30:45 AM"

**Screenshot:** _[Placeholder: Progress snapshot displayed]_

**Actual Result:** _[To be filled by tester]_

---

## 🔧 Additional Verification

### Browser Console Errors

**Check:** Open browser console (DevTools → Console tab)

**Expected:**
- ✅ No JavaScript errors
- ✅ No CORS errors
- ✅ No 4xx/5xx API errors

**Actual:** _[Note any errors here]_

---

### Network Tab Inspection

**Check:** DevTools → Network tab → Filter by "Fetch/XHR"

**Verify API Calls:**
- ✅ `POST /api/certified/schedule` → 200
- ✅ `POST /api/certified/progress` (flip) → 204
- ✅ `POST /api/certified/progress` (grade) → 204
- ✅ `GET /api/certified/progress?sid=...` → 200

**Verify Headers:**
- ✅ All responses have `Access-Control-Allow-Origin: *`
- ✅ All responses have `Content-Type: application/json` (except 204)
- ✅ No authentication errors (401/403)

---

### Mobile Responsiveness (Optional)

**Steps:**
1. Open DevTools → Toggle device toolbar (Cmd+Shift+M)
2. Test on iPhone 13 Pro and iPad Air viewports
3. Verify layout and touch interactions

**Expected:**
- ✅ Cards display correctly on mobile
- ✅ Buttons are touch-friendly (min 44x44px)
- ✅ Text is readable without zooming
- ✅ No horizontal scroll

**Actual:** _[Note any issues]_

---

## 🐛 Error Scenarios

### Invalid Input Handling

**Test:** Open DevTools Console and run:
```javascript
fetch('https://cerply-api-staging-latest.onrender.com/api/certified/schedule', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({session_id: '', items: []})  // Invalid: empty
}).then(r => r.json()).then(console.log)
```

**Expected Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {...}
  }
}
```

**Status Code:** 400  
**Actual:** _[Copy response here]_

---

### Network Failure Handling

**Test:**
1. Open DevTools → Network tab
2. Enable "Offline" mode
3. Try to flip a card
4. Observe error handling

**Expected:**
- ✅ User-friendly error message shown
- ✅ No app crash
- ✅ Console shows network error (expected)

**Actual:** _[Describe behavior]_

---

## 📊 Performance Metrics

### Page Load Time

- **Target:** < 3 seconds
- **Actual:** _[Use DevTools Performance tab]_

### API Latency (from Network tab)

- `POST /api/certified/schedule`: _____ms (target: < 500ms)
- `POST /api/certified/progress`: _____ms (target: < 200ms)
- `GET /api/certified/progress`: _____ms (target: < 300ms)

---

## ✅ Sign-Off Checklist

After completing all scenarios, verify:

- [ ] All 7 main scenarios completed without critical errors
- [ ] All API endpoints return expected responses
- [ ] No console errors or CORS issues
- [ ] Session resume works correctly after refresh
- [ ] Progress tracking persists across interactions
- [ ] UAT banner displays correct information
- [ ] Feedback form completed with findings
- [ ] Screenshots captured for key scenarios

---

## 📝 Next Steps

1. **Complete Feedback Form:** Fill out `M3_UAT_FEEDBACK.md` with your findings
2. **Attach Screenshots:** Save screenshots to `docs/uat/screenshots/`
3. **Report Issues:** For any bugs found, create GitHub issues with:
   - Scenario number
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots/console logs
   - Label: `m3-uat`, `bug`
4. **Approve/Reject:** Based on findings, provide go/no-go decision for production

---

## 📞 Support

- **Questions:** Tag `@robnreb1` in GitHub issue
- **Epic Reference:** `EPIC_M3_API_SURFACE.md`
- **Staging Report:** `STAGING_TEST_REPORT.md`
- **API Docs:** `docs/functional-spec.md` §21, §21.1

---

**Tester Name:** _______________________  
**Date Completed:** _______________________  
**Overall Assessment:** ⬜ PASS / ⬜ PASS with Issues / ⬜ FAIL  
**Signature:** _______________________

