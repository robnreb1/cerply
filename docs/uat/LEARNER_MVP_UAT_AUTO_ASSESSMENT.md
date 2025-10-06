# Learner MVP UAT Script (Auto-Assessment)

**Epic:** EPIC_LEARNER_MVP_UI_V1 (Auto-Assessment Pivot)  
**Target:** https://cerply.vercel.app/learn (staging)  
**Date:** 2025-10-06  
**Version:** v2.0 (Auto-Assessment)

---

## Pre-Flight Checklist

- [ ] Clear browser cache and localStorage
- [ ] Open browser DevTools (Console + Network tabs)
- [ ] Prepare 2-3 test topics (e.g., "Quantum mechanics", "Spanish verbs", "SQL joins")
- [ ] Have screen recording tool ready (Loom, QuickTime, etc.)
- [ ] **NEW:** Understand auto-assessment (no self-grading!)

---

## What Changed in v2.0

**CRITICAL:** Self-grading (1-5 buttons) has been **completely removed**.

**Old flow (v1.0):**
1. See question
2. Flip card
3. Self-grade (1-5: "How well did you know this?")

**New flow (v2.0 - Auto-Assessment):**
1. See question
2. Flip card
3. **Type your answer**
4. Click "Submit Answer"
5. **Instant feedback:** ✓ Correct / ✗ Not quite
6. **Auto-adaptation:** System adjusts difficulty automatically

---

## Scenario 1: No Self-Grade UI (Critical Acceptance)

**Goal:** Verify that self-grading buttons do NOT exist anywhere

### Steps:
1. Navigate to `/learn`
2. Complete flow: Input topic → Preview → Start session
3. Flip first card
4. **CRITICAL CHECK:**
   - [ ] NO buttons labeled 1, 2, 3, 4, 5
   - [ ] NO text asking "How well did you know this?"
   - [ ] NO grade selection UI of any kind

5. Instead, you should see:
   - [ ] Text input for your answer
   - [ ] "Submit Answer" button

**Expected Result:** Zero self-grade UI elements. Only answer input + submit button.

**Screenshot:** `uat-auto-1-no-grade-buttons.png`

---

## Scenario 2: Answer Input & Submit

**Goal:** Verify auto-assessment flow works end-to-end

### Steps:
1. From session, flip a card
2. Observe:
   - [ ] Text input visible with placeholder: "Type your answer here..."
   - [ ] "Submit Answer" button is **disabled** (no input yet)

3. Type a correct answer: `Matter exhibits both wave and particle properties`
4. Observe:
   - [ ] "Submit Answer" button becomes **enabled**

5. Click "Submit Answer"
6. Observe:
   - [ ] Instant feedback appears (<2s)
   - [ ] Shows: ✓ **Correct!** (or ✗ **Not quite**)
   - [ ] Shows difficulty: "Difficulty: easy" (or medium/hard)

**Expected Result:** Clear correctness feedback without any self-assessment.

**Screenshot:** `uat-auto-2-submit-correct.png`

---

## Scenario 3: Wrong Answer → Auto-Explain

**Goal:** Verify explanation auto-shows when you're wrong OR slow

### Steps:
1. Flip a new card
2. Type an incorrect answer: `something wrong`
3. Click "Submit Answer"
4. Observe:
   - [ ] Shows: ✗ **Not quite**
   - [ ] **Explanation section automatically visible** (not hidden behind button)
   - [ ] Explanation text: "The correct approach is..."

5. Compare to correct answer:
   - Flip next card
   - Type correct answer quickly (<10s)
   - Submit
   - Observe:
     - [ ] Shows: ✓ **Correct!**
     - [ ] Explanation **hidden** by default
     - [ ] But "Show explanation" link available

**Expected Result:** Explanation auto-shows for wrong answers, hidden for correct ones.

**Screenshot:** `uat-auto-3-explain-auto.png`

---

## Scenario 4: Latency Tracking (Hidden Behavior)

**Goal:** Verify system tracks time from flip to submit

### Steps:
1. Flip a card
2. **Wait 35 seconds** before typing answer (simulate slow thinking)
3. Type any answer
4. Submit
5. Observe:
   - [ ] Feedback still appears
   - [ ] Difficulty may show "hard" (due to slow latency)
   - [ ] Explanation may auto-show (even if correct, because slow)

**Expected Result:** System infers difficulty from latency (you don't need to see timer, but behavior changes).

**Screenshot:** `uat-auto-4-slow-answer.png`

---

## Scenario 5: Adaptation Feedback Chip

**Goal:** Verify system shows adaptation messages

### Steps:
1. Answer 3 questions **correctly** and **fast** (<10s each)
2. After 3rd submission, observe:
   - [ ] Feedback chip appears: "🚀 Great mastery! Increasing challenge..."
   - [ ] OR: No chip if threshold not met yet

3. Now answer 2 questions **incorrectly** and **slow** (>30s each)
4. After 2nd incorrect, observe:
   - [ ] Feedback chip: "💡 Let's ease off a bit and build confidence"

**Expected Result:** Adaptation feedback appears based on performance patterns.

**Screenshot:** `uat-auto-5-adaptation-chip.png`

---

## Scenario 6: Real-Time Accuracy in HUD

**Goal:** Verify accuracy percentage updates after each answer

### Steps:
1. Start session
2. Answer first question correctly
3. Observe top-right HUD:
   - [ ] Shows: "100% correct"

4. Answer second question incorrectly
5. Observe:
   - [ ] Updates to: "50% correct"

6. Answer third correctly
7. Observe:
   - [ ] Updates to: "67% correct" (2 out of 3)

**Expected Result:** Accuracy updates in real-time after each submission.

**Screenshot:** `uat-auto-6-accuracy-hud.png`

---

## Scenario 7: Submit Button States

**Goal:** Verify button disabled when invalid

### Steps:
1. Flip card
2. Observe:
   - [ ] "Submit Answer" button is **disabled** (greyed out)

3. Type 1 character
4. Observe:
   - [ ] Button becomes **enabled**

5. Delete all text (empty input)
6. Observe:
   - [ ] Button becomes **disabled** again

**Expected Result:** Submit only enabled when answer is non-empty.

**Screenshot:** `uat-auto-7-button-states.png`

---

## Scenario 8: API Telemetry (DevTools Check)

**Goal:** Verify correct data sent to API

### Steps:
1. Open DevTools → Network tab
2. Filter: `/api/certified/progress`
3. Flip card, type answer, submit
4. Observe POST request payload:
   - [ ] `action: "submit"` (NOT "grade")
   - [ ] `result` object present with:
     - `correct: true/false`
     - `latency_ms: <number>`
     - `item_difficulty: "easy|medium|hard"`
     - `hint_count: 0`
     - `retry_count: 0`
   - [ ] NO `grade` field (0-5)

**Expected Result:** Telemetry posted correctly without self-grade.

**Screenshot:** `uat-auto-8-api-telemetry.png`

---

## Scenario 9: Paraphrase Variants (Never-Repeat)

**Goal:** Verify questions don't repeat exact wording

### Steps:
1. Complete a full session (10 items)
2. Start a new session (same topic)
3. Observe:
   - [ ] Questions cover same concepts
   - [ ] But wording is different (paraphrased)
   - Example:
     - First time: "What is spaced repetition?"
     - Second time: "Define spaced repetition"

**Expected Result:** Concepts repeat, exact wording doesn't.

**Screenshot:** `uat-auto-9-paraphrase.png`

---

## Scenario 10: Keyboard Navigation

**Goal:** Verify keyboard shortcuts work

### Steps:
1. From input phase, type topic
2. Press `Cmd+Enter` (Mac) or `Ctrl+Enter` (Win):
   - [ ] Preview triggered

3. In session, Tab to card, press `Space`:
   - [ ] Card flips

4. Type answer, press `Enter`:
   - [ ] Submits answer (same as clicking button)

**Expected Result:** Full keyboard navigation supported.

**Screenshot:** N/A (functional test)

---

## Edge Cases & Regression Checks

### A11y (Accessibility)
- [ ] All buttons have visible focus rings (Tab key)
- [ ] Answer input has aria-label: "Answer input"
- [ ] Submit button has aria-label: "Submit Answer"
- [ ] Feedback messages use role="alert" for screen readers

### Responsive Design
- [ ] Test on mobile viewport (375px width)
- [ ] Answer input is tappable and resizes keyboard
- [ ] Submit button full-width on mobile

### API Contract
- [ ] POST `/api/score` returns `{ correct, difficulty, explain, diagnostics }`
- [ ] POST `/api/certified/progress` accepts `action: "submit"` with `result: {...}`
- [ ] GET `/api/daily/next` returns `{ queue, assigned_difficulty, adaptation_reason }`

### Performance
- [ ] Page loads in <2s
- [ ] Feedback appears <2s after submit
- [ ] No console errors in DevTools

---

## Acceptance Criteria (from Epic)

- [x] No self-grade UI elements visible
- [x] Telemetry (correct, latency_ms, item_difficulty, hint_count, retry_count) POSTed
- [x] Auto-ease on 2× wrong @ same difficulty with latency >30s
- [x] Auto-step-up on 3× quick correct (<10s, no hints)
- [x] Explain auto-appears on wrong/slow; link otherwise
- [x] Never exact repeat wording within a session
- [x] All E2E & smoke tests green
- [x] TypeScript/lint green
- [x] Docs updated

---

## Known Limitations (MVP Scope)

- Paraphrase variants are deterministic stubs (3 per item)
- Adaptation thresholds are heuristic (not ML-based yet)
- No persistent learner model (resets on session end)
- Hint/retry features UI not implemented yet (API ready)

---

## Feedback Template

| Scenario | Pass/Fail | Notes | Severity |
|----------|-----------|-------|----------|
| 1. No self-grade UI | | | |
| 2. Answer input & submit | | | |
| 3. Auto-explain | | | |
| 4. Latency tracking | | | |
| 5. Adaptation feedback | | | |
| 6. Real-time accuracy | | | |
| 7. Submit button states | | | |
| 8. API telemetry | | | |
| 9. Paraphrase variants | | | |
| 10. Keyboard nav | | | |

**Severity:** P0 (blocker), P1 (critical), P2 (nice-to-have), P3 (cosmetic)

---

## Success Criteria

- [ ] All 10 scenarios pass on staging
- [ ] No P0/P1 bugs found
- [ ] Feedback feels fair (no "this graded me wrong!" complaints)
- [ ] Performance <2s for all interactions
- [ ] A11y spot-checks pass
- [ ] At least 2 stakeholders complete full UAT

---

**UAT Owner:** [Name]  
**Completed:** [Date]  
**Outcome:** [PASS / FAIL / CONDITIONAL]  
**Next Steps:** [e.g., "Ship to prod" / "Fix P1 bugs first" / "Tune thresholds"]

