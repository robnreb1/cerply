# What Changed for Learners: Auto-Assessment

**Audience:** Stakeholders, UX reviewers, early users  
**Date:** 2025-10-06  

---

## The Problem We Solved

**Before:** Learners self-graded their understanding (1-5 scale: "How well did you know this?")

**Issues:**
1. **Unreliable** - Overconfident learners click "5" even when wrong
2. **Cognitive burden** - "Wait, was that a 3 or a 4?"
3. **Not truly adaptive** - System can't learn if you game it

**After:** The system **automatically assesses mastery** by observing your behavior.

---

## How It Works Now

### 1. You Answer, We Assess

**Old flow:**
1. See question
2. Flip card
3. Grade yourself (1-5)

**New flow:**
1. See question
2. Flip card
3. **Type your answer**
4. Click "Submit Answer"
5. **Instant feedback:** ✓ Correct / ✗ Not quite

**What we observe:**
- Is your answer correct? (compared to expected answer)
- How fast did you respond? (<10s = confident, >30s = struggling)
- Did you need hints?
- Did you retry?

---

### 2. Smart Adaptation (Behind the Scenes)

**Auto-Ease (when you're struggling):**
- If you get 2 wrong in a row AND take >30s each → We drop difficulty
- Example: Hard questions → Medium questions
- You see: 💡 "Let's ease off a bit and build confidence"

**Auto-Step-Up (when you're mastering):**
- If you get 3 correct in a row AND answer <10s each (no hints) → We raise difficulty
- Example: Easy questions → Medium questions
- You see: 🚀 "Great mastery! Increasing challenge..."

**Never-Repeat-Verbatim:**
- Same concept, different wording each time
- Example:
  - First time: "What is spaced repetition?"
  - Second time: "Define spaced repetition"
  - Third time: "Explain the concept of spaced repetition"

---

### 3. Explanation When You Need It

**Old flow:**
- Click "Explain" button (manual)

**New flow:**
- **Auto-shown** if you're wrong OR slow (>20s)
- Otherwise: "Show explanation" link available

**Why:** We know when you need help, so we provide it automatically.

---

## What You'll See (UI Changes)

### Removed
- ❌ 5 grade buttons (1-5 scale)
- ❌ "How well did you know this?" text

### Added
- ✅ Text input for your answer
- ✅ "Submit Answer" button
- ✅ Instant correctness feedback (✓ Correct / ✗ Not quite)
- ✅ Adaptation chips ("🚀 Great mastery!" / "💡 Let's ease off")
- ✅ Auto-shown explanation when struggling

---

## Why This Matters (User Benefits)

1. **More honest assessment**
   - Can't game the system by clicking "5" when you guessed
   - System sees *how* you answer, not just *what* you say

2. **Less cognitive burden**
   - No "meta-thinking" about grades
   - Focus on the content, not self-evaluation

3. **Faster adaptation**
   - System adjusts difficulty in 2-3 questions (not 10-15)
   - You spend more time in your "zone of proximal development"

4. **Better retention**
   - Spaced repetition based on *actual* mastery, not self-report
   - Harder items reviewed more often automatically

---

## FAQs

**Q: What if I type a typo?**  
A: We use fuzzy matching and semantic similarity (not exact string match). A minor typo won't count as wrong.

**Q: What if I don't know the answer?**  
A: Type anything (even "I don't know") and submit. The system will mark it incorrect and show you the explanation automatically.

**Q: Can I see my accuracy over time?**  
A: Yes! The HUD shows your current session accuracy in real-time (e.g., "85% correct").

**Q: Does this replace all self-grading?**  
A: Yes, for learning sessions. (Self-grading might still appear in certification exams where you're expected to already know the answer.)

**Q: What if I want to challenge myself manually?**  
A: The system will step you up automatically if you demonstrate mastery. You can also select a higher initial difficulty level in settings (future feature).

---

## Technical Details (For Reviewers)

**Latency thresholds:**
- <10s = Confident (fast recall)
- 10-20s = Normal (effortful retrieval)
- >30s = Struggling (needs support)

**Adaptation triggers:**
- **Ease:** 2 consecutive incorrect + slow (>30s)
- **Step-up:** 3 consecutive correct + fast (<10s) + no hints

**Sliding window:** N=5 (only last 5 attempts considered)

**Never-repeat:** 3 paraphrase variants per item (deterministic rotation)

---

## Acceptance Criteria (UAT)

- [ ] No self-grade UI visible anywhere
- [ ] Answer input + "Submit Answer" button present
- [ ] Instant correctness feedback after submit
- [ ] Explanation auto-shown when wrong OR slow (>20s)
- [ ] Adaptation feedback chip appears ("🚀 Stepped up!" / "💡 Let's ease off")
- [ ] HUD shows accuracy % in real-time
- [ ] No exact question wording repeats within a session

---

## Rollout Plan

**Phase 1 (Now):** Staging UAT with stakeholders  
**Phase 2:** A/B test (50% auto-assessment, 50% self-grading) for 2 weeks  
**Phase 3:** 100% auto-assessment if metrics show improvement (retention, completion rate)  
**Phase 4:** Remove self-grading code entirely (3 months post-launch)

---

**Feedback:** Please test on staging and report any issues in `docs/uat/LEARNER_MVP_UAT_FEEDBACK.md`

**Questions?** Ask the engineering team or product owner.

