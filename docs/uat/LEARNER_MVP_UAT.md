# Learner MVP UAT Script

**Epic:** EPIC_LEARNER_MVP_UI_V1  
**Target:** https://cerply.vercel.app/learn (staging)  
**Date:** 2025-10-06  

---

## Pre-Flight Checklist

- [ ] Clear browser cache and localStorage
- [ ] Open browser DevTools (Console + Network tabs)
- [ ] Prepare 2-3 test topics (e.g., "Quantum mechanics", "Spanish verbs", "SQL joins")
- [ ] Have screen recording tool ready (Loom, QuickTime, etc.)

---

## Scenario 1: Topic Input & Preview (L-1, L-2)

**Goal:** Verify input phase and preview generation

### Steps:
1. Navigate to `/learn`
2. Observe page load:
   - [ ] Heading: "What would you like to learn today?"
   - [ ] Large text input with placeholder visible
   - [ ] "Preview" button is **disabled** (no input yet)
   - [ ] "Upload" button visible but stub
   - [ ] Input is auto-focused (cursor blinking)

3. Type a topic: `Quantum mechanics fundamentals`
   - [ ] "Preview" button becomes **enabled**

4. Clear input (delete all text)
   - [ ] "Preview" button becomes **disabled** again

5. Re-enter topic and click "Preview"
   - [ ] Button text changes to "Thinking..." with spinner/loading state
   - [ ] After <3s, preview screen appears

6. Verify Preview Screen:
   - [ ] Heading: "Preview Your Learning Plan"
   - [ ] Summary text matches topic intent
   - [ ] 2-4 modules listed with titles and estimated item counts
   - [ ] Clarifying questions shown (if any)
   - [ ] Two buttons: "Looks great, start!" and "Refine"

**Expected Result:** Input → Preview flow smooth, no errors, preview matches topic.

**Screenshot:** `uat-1-preview.png`

---

## Scenario 2: Slow Load Fallback (L-9, Pane C)

**Goal:** Verify "While You Wait" content appears on slow API responses

### Steps:
1. From input phase, enter a topic
2. Click "Preview"
3. Watch for fallback content:
   - [ ] If load takes >400ms, "While You Wait" box appears
   - [ ] Shows: "We're building your plan..." or similar
   - [ ] Shows progress indicators (analyzing, identifying concepts, etc.)
   - [ ] Fallback disappears once preview loads

**Expected Result:** Fallback content cushions slow load experience; user never sees blank screen.

**Screenshot:** `uat-2-fallback.png`

---

## Scenario 3: Auth Gate (L-3)

**Goal:** Verify unauthenticated users are blocked from starting session

### Steps:
1. Clear localStorage: `localStorage.clear()` in DevTools Console
2. Go through input → preview flow
3. Click "Looks great, start!"
4. Observe:
   - [ ] Auth gate screen appears
   - [ ] Heading: "Sign in to save your progress"
   - [ ] Message: "We need to know who you are..."
   - [ ] "Sign In" button visible
   - [ ] "← Back" button visible

5. Click "Sign In"
   - [ ] (Demo mode) Auth token set, page reloads or returns to preview
   - [ ] User can now click "Start"

**Expected Result:** Unauthenticated users cannot start sessions; clear CTA to sign in.

**Screenshot:** `uat-3-auth-gate.png`

---

## Scenario 4: Session Start & Card UI (L-4, L-5, L-6)

**Goal:** Verify session creation, card display, flip, grade, and score feedback

### Steps:
1. From preview (authenticated), click "Start"
2. Wait for session to generate (may take 3-5s)
   - [ ] "While You Wait" content may appear
   - [ ] Session screen loads

3. Verify Session HUD:
   - [ ] Heading: "Your Learning Session"
   - [ ] Progress: "Item 1 of 10" (or similar)
   - [ ] Level badge: "Beginner" (top-right)
   - [ ] Target: "Today's target: 10 items"

4. Verify Card UI:
   - [ ] Large white card with question text
   - [ ] Label: "Question"
   - [ ] Cursor changes to pointer on hover
   - [ ] Tooltip: "Click to reveal answer"

5. Click card to flip:
   - [ ] Label changes to "Answer"
   - [ ] Answer text revealed
   - [ ] "Your answer" textarea appears (optional input)
   - [ ] Five grade buttons (1-5) visible with color coding:
     - 1-2: Red
     - 3: Yellow
     - 4-5: Green
   - [ ] Labels: "Wrong" ... "Easy"

6. Click grade button (e.g., 4):
   - [ ] Button disabled briefly
   - [ ] Score feedback box appears:
     - [ ] "Difficulty: medium" (or easy/hard)
     - [ ] "Next review: 3 days"
     - [ ] "Explain why" button visible

7. Click "Explain why":
   - [ ] Misconceptions section expands
   - [ ] Shows common pitfalls or context

8. After 1-2s, card auto-advances:
   - [ ] Progress: "Item 2 of 10"
   - [ ] New question appears
   - [ ] Card is unflipped (front side)

**Expected Result:** Smooth flip → grade → feedback → auto-advance loop.

**Screenshot:** `uat-4a-card-front.png`, `uat-4b-card-back.png`, `uat-4c-score.png`

---

## Scenario 5: NL Ask Cerply (L-13)

**Goal:** Verify natural language Q&A sidebar

### Steps:
1. During session, look for floating button (bottom-right):
   - [ ] Button text: "Ask Cerply" or similar

2. Click button:
   - [ ] Right sidebar slides in
   - [ ] Heading: "Ask Cerply"
   - [ ] Input box with placeholder: "Ask anything about this topic..."
   - [ ] "X" close button

3. Type a question: `What is quantum entanglement?`
4. Press Enter or click "Send":
   - [ ] User message appears (dark bg, right-aligned)
   - [ ] Bot response appears after ~500ms (light bg, left-aligned)
   - [ ] (Stub response: "Natural language responses will be powered by the orchestrator...")

5. Click "X" to close:
   - [ ] Sidebar slides out
   - [ ] Toggle button reappears

**Expected Result:** Chat panel functional, smooth UX, responses appear (even if stub).

**Screenshot:** `uat-5-chat-open.png`

---

## Scenario 6: Session Persistence (L-11)

**Goal:** Verify session ID saved and progress resumes

### Steps:
1. Start a session, flip and grade 2-3 cards
2. Open DevTools Console, run:
   ```js
   localStorage.getItem('learn_session_id')
   ```
   - [ ] Returns `sess-<timestamp>` format

3. Check Network tab for POST `/api/certified/progress`:
   - [ ] Multiple requests sent (one per flip, one per grade)
   - [ ] Status: 204 (success)

4. Refresh page (`Cmd+R`)
5. Observe:
   - [ ] Returns to input phase (by design, no auto-resume yet in MVP)
   - [ ] Session ID still in localStorage

**Expected Result:** Session ID persisted, progress events logged to API.

**Screenshot:** `uat-6-session-id.png`

---

## Scenario 7: Keyboard Navigation (L-14)

**Goal:** Verify keyboard shortcuts work

### Steps:
1. From input phase, type topic
2. Press `Cmd+Enter` (Mac) or `Ctrl+Enter` (Win):
   - [ ] Preview triggered (same as clicking "Preview")

3. In session, focus on card (Tab key if needed)
4. Press `Space`:
   - [ ] Card flips

5. Tab through grade buttons, press `Enter` on one:
   - [ ] Grade submitted

**Expected Result:** Keyboard users can complete full flow without mouse.

**Screenshot:** N/A (functional test)

---

## Scenario 8: Completion Screen (L-10)

**Goal:** Verify session completion after target items

### Steps:
1. Complete 10 items (flip + grade each)
2. After 10th item graded:
   - [ ] Green completion box appears
   - [ ] Heading: "Great work!"
   - [ ] Message: "You completed 10 items today..."
   - [ ] Two buttons:
     - "Finish" (returns to input)
     - "Continue" (if more items available, advance to 11th)

3. Click "Finish":
   - [ ] Returns to input phase
   - [ ] Session cleared (new session on next start)

**Expected Result:** Clear completion state, option to continue or finish.

**Screenshot:** `uat-8-complete.png`

---

## Scenario 9: Error Handling (L-8)

**Goal:** Verify graceful error messages

### Steps:
1. **(Dev simulation)** Temporarily stop API server or block `/api/preview` in DevTools Network tab
2. Enter topic, click "Preview"
3. Observe:
   - [ ] Error message appears (red box)
   - [ ] Message: "Preview failed" or "Network error"
   - [ ] User can retry (input still editable)

4. Restore API, retry:
   - [ ] Preview works normally

**Expected Result:** Errors shown clearly, user can recover.

**Screenshot:** `uat-9-error.png`

---

## Scenario 10: Refine Flow (L-8)

**Goal:** Verify "Refine" returns to input with context preserved

### Steps:
1. From preview screen, click "Refine"
2. Observe:
   - [ ] Returns to input phase
   - [ ] Topic text still in input (not cleared)
   - [ ] User can edit and re-preview

**Expected Result:** Refine loop smooth, input preserved.

**Screenshot:** N/A (simple navigation)

---

## Edge Cases & Regression Checks

### A11y (Accessibility)
- [ ] All buttons have visible focus rings (Tab key)
- [ ] All inputs have aria-labels
- [ ] Card has role="button" and aria-label when interactive
- [ ] Screen reader can navigate (test with VoiceOver/NVDA if possible)

### Responsive Design
- [ ] Test on mobile viewport (375px width)
- [ ] Text readable, buttons tappable
- [ ] Chat sidebar adapts (or hides on mobile)

### API Contract
- [ ] POST `/api/preview` returns valid JSON
- [ ] POST `/api/generate` returns modules array
- [ ] POST `/api/score` returns score + difficulty
- [ ] POST `/api/certified/schedule` returns session_id
- [ ] POST `/api/certified/progress` returns 204

### Performance
- [ ] Page loads in <2s (initial paint)
- [ ] Preview response <3s (typical)
- [ ] No console errors in DevTools

---

## Acceptance Criteria (from BRD/FSD)

- [x] L-1: Topic input (prompt/paste/link)
- [x] L-2: Preview (summary + modules + clarifying Qs)
- [x] L-3: Auth gate (blocks start if not logged in)
- [x] L-4: Session creation (schedule → items)
- [x] L-5: Card UI (flip → grade → feedback)
- [x] L-6: Explain button (misconceptions)
- [x] L-7: Simple adaptation (reorder queue based on scores)
- [x] L-8: CORS + error messages
- [x] L-9: Fallback content (>400ms → "While You Wait")
- [x] L-10: Completion screen
- [x] L-11: Session persistence (localStorage sid)
- [x] L-12: Idempotent progress upsert
- [x] L-13: NL Ask Cerply input (right rail)
- [x] L-14: Keyboard navigation + a11y

---

## Known Limitations (MVP Scope)

- Upload button is stub (L-1 file upload deferred to v1.1)
- NL Ask returns stub responses (orchestrator integration pending)
- No auto-resume from progress snapshot (manual "Continue" only)
- No profile page (stats UI deferred)
- Level badge updates but no visual progression

---

## Feedback Template

| Scenario | Pass/Fail | Notes | Severity |
|----------|-----------|-------|----------|
| 1. Input → Preview | | | |
| 2. Slow load fallback | | | |
| 3. Auth gate | | | |
| 4. Session & cards | | | |
| 5. NL Ask | | | |
| 6. Persistence | | | |
| 7. Keyboard nav | | | |
| 8. Completion | | | |
| 9. Error handling | | | |
| 10. Refine | | | |

**Severity:** P0 (blocker), P1 (critical), P2 (nice-to-have), P3 (cosmetic)

---

## Success Criteria

- [ ] All 10 scenarios pass on staging
- [ ] No P0/P1 bugs found
- [ ] Performance <3s for preview + generate
- [ ] A11y spot-checks pass
- [ ] At least 1 stakeholder completes full UAT

---

**UAT Owner:** [Name]  
**Completed:** [Date]  
**Outcome:** [PASS / FAIL / CONDITIONAL]  
**Next Steps:** [e.g., "Ship to prod" / "Fix P1 bugs first"]

