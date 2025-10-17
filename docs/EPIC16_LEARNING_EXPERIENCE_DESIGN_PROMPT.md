# Epic 16: Learning Experience Design & Testing - Implementation Prompt

**Version:** 1.0  
**Epic Priority:** P0 (MVP-CRITICAL - Runs in parallel with Epic 14/15)  
**Estimated Effort:** 24-32 hours  
**Dependencies:** Epic 9 (adaptive engine), Epic 15 (module delivery)  
**Status:** NEW - Critical for proving learning efficacy

---

## Context & Rationale

### **Problem Statement**
We can generate content, assign modules, and track completion. But we haven't proven that **learners actually learn and retain knowledge**.

Without rigorous learning experience design and testing, we risk building:
- Content that's consumed but not retained
- Questions that test recall, not understanding
- Adaptive difficulty that's surface-level, not pedagogically sound
- Modules that feel like exams, not learning experiences

### **Why This is Critical for MVP**
The value proposition is **NOT** "assign training."  
The value proposition is **"improve team performance through effective learning."**

To prove this, we must:
1. Design lessons using research-backed pedagogy
2. Implement genuine adaptivity (beyond difficulty adjustment)
3. Measure retention and application (not just completion)
4. Test with real learners and iterate
5. Give managers insight into what's working

---

## Scope

### **In Scope**
1. **Pedagogical Framework:** Research-backed lesson design
2. **Lesson Mechanics:** Question types, pacing, engagement
3. **Genuine Adaptivity:** Spaced repetition, interleaving, personalization
4. **Contextual Guidance:** Socratic dialogue, not just "correct/incorrect"
5. **Retention Measurement:** Long-term learning, not just completion
6. **Testing Protocol:** End-user testing with real learners
7. **Manager Feedback Loop:** What's working, what's not
8. **Iteration Framework:** Data-driven improvements

### **Out of Scope (Post-MVP)**
- AI tutoring (real-time conversational teaching)
- Peer learning / collaborative modules
- Video/multimedia lesson components
- External certification integration
- Advanced analytics dashboards

---

## Research Foundation (Evidence-Based, 2025)

**Based on:** Meta-analyses, recent replications, and production-validated approaches. All principles below have robust empirical support.

### **✅ What Works (Implement in MVP)**

#### **1. Retrieval Practice—Often (The Testing Effect)** 🏆
**Evidence:** Hundreds of studies, robust meta-analyses. **The single most effective technique.**

**Principle:** Active recall (testing yourself) strengthens memory far more than passive review.

**Implementation:**
- **Prioritize free-text/short answer over MCQ** (generation > recognition)
- Pre-test before teaching (activates prior knowledge)
- Frequent low-stakes quizzes during learning (every 5-10 min chunk)
- Cumulative questions (mix old and new concepts)
- **Default mode:** Retrieval, not review

**Why it matters:** Testing isn't just assessment—it's the learning mechanism itself.

---

#### **2. Spaced Repetition—Schedule It** 🏆
**Evidence:** Meta-analyses consistently show spacing beats massing. Optimal intervals depend on retention target.

**Principle:** Review at increasing intervals. Equal or model-optimized spacing is as good as simple "expanding" schedules.

**Implementation:**
- **Short-term retention (7 days):** 1d → 3d → 7d
- **Long-term retention (30+ days):** 1d → 3d → 7d → 14d → 30d
- Use SM-2 algorithm (proven, simple, robust)
- Adjust based on performance (faster forgetting = shorter intervals)

**Why it matters:** Combats the forgetting curve. Without spacing, retention drops to 20% within days.

---

#### **3. Interleaving—Mix Related Skills/Concepts** 🏆
**Evidence:** Beats blocking for discrimination and transfer, especially when categories are confusable.

**Principle:** Don't group all questions by topic. Mix related concepts to force discrimination.

**Implementation:**
- ❌ **Block:** All "delegation" questions → All "feedback" questions
- ✅ **Interleave:** Delegation → Feedback → Coaching → Delegation → Feedback
- Especially critical when concepts are similar (e.g., different leadership styles)
- Apply within modules and across spaced repetition

**Why it matters:** Real-world problems don't come labeled by chapter. Interleaving trains discrimination.

---

#### **4. Worked Examples → Faded Steps (Cognitive Load Theory)** 🆕
**Evidence:** Hundreds of replications (Mayer, Sweller). Reduces cognitive load for novices.

**Principle:** Show full worked examples first, then progressively fade steps into completion problems.

**Implementation:**
- **Step 1 (Full worked example):**
  ```
  Problem: How do you delegate a critical project?
  Solution: 
  1. Assess team member's capability → [example]
  2. Define clear expectations → [example]
  3. Provide resources → [example]
  4. Set checkpoints → [example]
  ```
- **Step 2 (Partial fade):**
  ```
  Problem: [new scenario]
  Steps 1-2 provided, you complete 3-4
  ```
- **Step 3 (Full completion):**
  ```
  Problem: [new scenario]
  You complete all steps
  ```

**Why it matters:** Novices can't "figure it out" efficiently. Worked examples reduce cognitive load and build schemas.

---

#### **5. Feedback That Is Timely and Specific** 🏆
**Evidence:** Recent meta-analyses refine Hattie's work. Timing depends on task complexity.

**Principle:** Elaborated feedback (what/why/how to improve) outperforms simple right/wrong.

**Implementation:**
- **Immediate feedback for procedural tasks** (e.g., "What's 7 × 8?")
- **Slightly delayed feedback for conceptual tasks** (e.g., "Why is active listening effective?")
- Always include:
  1. What was incorrect/correct
  2. Why (the reasoning)
  3. How to improve (next steps)
- Use Socratic prompting for deep misconceptions

**Why it matters:** Feedback is instruction. "Wrong" teaches nothing; "Wrong because X, try Y" teaches everything.

---

#### **6. Self-Explanation & Generative Prompts** 🆕
**Evidence:** Meta-analyses show moderate, reliable gains. Builds durable schemas.

**Principle:** Prompting learners to explain steps, compare examples, or generate cues strengthens understanding.

**Implementation:**
- **Explain prompts:** "Explain why you chose that answer in 1-2 sentences"
- **Compare prompts:** "How is delegation different from abdication?"
- **Generate prompts:** "Create your own example of effective delegation"
- **Reflection prompts:** "What would you do differently next time?"
- Use after questions, not before teaching

**Why it matters:** Forces deep processing. Explanation reveals (and fixes) misconceptions.

---

#### **7. Microlearning (With Spacing & Retrieval)** ✅
**Evidence:** Bite-size units increase completion. Outcomes improve when paired with spacing and retrieval.

**Principle:** Micro-chunks alone aren't magic. They must be paired with good design.

**Implementation:**
- **Chunk size:** 5-10 minutes per concept
- **Structure:** Concept → Worked example → Retrieval practice → Next concept
- **Critical:** Must include spacing and retrieval (not just "short videos")
- **Pacing:** Learner-controlled (no auto-advance)

**Why it matters:** Aligns with working memory limits and modern attention spans. But only works with proper pedagogy.

---

#### **8. Intelligent Tutoring / AI Assistance** ✅
**Evidence:** Meta-analyses show positive but variable effects. Strongest with step-based feedback and mastery gating.

**Principle:** AI tutors work best when they're step-based with rich feedback, not just "explainers."

**Implementation:**
- Use LLM for:
  - Socratic dialogue (guide to understanding)
  - Elaborated feedback (explain why wrong)
  - Worked example generation (create similar problems)
  - Self-explanation evaluation (assess quality of explanation)
- **NOT for:** Simple right/wrong scoring (rule-based is fine)
- **Mastery gating:** Must demonstrate understanding before progressing

**Why it matters:** AI enables personalization at scale. But only if designed correctly.

---

#### **9. Adaptivity Models That Work in Production (IRT/Elo)** 🆕
**Evidence:** Online IRT/Elo methods are stable, low-latency, and robust in production.

**Principle:** Target ~70-80% success probability (optimal "desirable difficulty"). Simpler and more robust than deep KT models for MVP.

**Implementation:**
- Use **Elo rating system** (proven, simple, real-time):
  - Each question has an Elo rating (difficulty)
  - Each learner has an Elo rating (ability)
  - After each answer, update both ratings
  - Select next question targeting 70-80% predicted success
- **Advantages over complex models:**
  - No training data required
  - Real-time updates
  - Interpretable ratings
  - Production-validated (chess, gaming, education)
- **Can extend post-MVP:** Add deep KT models if needed

**Why it matters:** Epic 9's basic difficulty adjustment is good, but Elo gives precise, adaptive targeting.

---

#### **10. Desirable Difficulties** ✅
**Evidence:** Bjork's work, extensively replicated. Optimal challenge enhances long-term learning.

**Principle:** Some difficulty is good. Too easy = poor retention. Too hard = frustration.

**Implementation:**
- **Elo/IRT targeting 70-80% success** (built-in desirable difficulty)
- Delay between study and test (not immediate—allows forgetting to trigger retrieval)
- Vary question formats (recognition → cued recall → free recall)
- Require generation (not just selection)

**Why it matters:** Struggle is the signal for learning. No struggle = no learning.

---

### **❌ What to Avoid (Myths / Weak Evidence)**

#### **"Learning Styles" Matching (VAK)** ⛔
**Evidence:** Consistently disproven. Does not improve outcomes.

**Why it's a myth:**
- No evidence that matching instruction to "visual/auditory/kinesthetic" preferences helps
- Everyone benefits from multiple representations
- Time spent on style-matching is wasted

**What to do instead:**
- Use **multiple representations for everyone** (text + diagrams when helpful)
- Follow **multimedia learning principles** (Mayer's CLT—see post-MVP)
- Focus on **good instructional design**, not style-matching

**Critical for Cerply:** Do NOT build "learning style" detection or matching. Invest that effort in proven techniques above.

---

### **📋 Post-MVP (Proven, But Not Critical for Launch)**

These work but add complexity. Defer until MVP is validated:

#### **Multimedia Learning Principles (Mayer's CLT)** → Epic 17
- Segment content into digestible chunks
- Signal what matters (highlighting, cues)
- Avoid redundancy (don't read text on screen)
- Use words + graphics when helpful (dual coding)
- Learner-controlled pacing

**Why post-MVP:** Requires video/animation production, not just text/questions.

#### **Elaborative Interrogation** → Epic 17
- "Why" prompts during learning (not just after)
- Deepens encoding

**Why post-MVP:** Effective but time-consuming. Self-explanation covers 80% of value.

#### **Peer Learning / Collaborative Modules** → Epic 18
- Social learning, peer explanation

**Why post-MVP:** Requires coordination infrastructure (not core to individual learning).

---

### **🎯 Epic 16 MVP Focus (What We Build)**

Based on the research above, Epic 16 implements:

1. ✅ **Retrieval practice as default** (free-text > MCQ)
2. ✅ **Spaced repetition** (SM-2 algorithm)
3. ✅ **Interleaving** (mix related concepts)
4. ✅ **Worked examples with fading** (for complex concepts)
5. ✅ **Elaborated, timely feedback** (Socratic dialogue)
6. ✅ **Self-explanation prompts** (after questions)
7. ✅ **Microlearning structure** (5-10 min chunks)
8. ✅ **AI assistance** (LLM for feedback, not scoring)
9. ✅ **Elo-based adaptivity** (70-80% success targeting)
10. ⛔ **NO learning styles matching** (proven myth)

**Post-MVP:** Multimedia design principles (Epic 17), peer learning (Epic 18)

---

## Deliverables

### **1. Pedagogical Framework Document**

Create: `docs/LEARNING_EXPERIENCE_FRAMEWORK.md`

**Contents:**
```markdown
# Cerply Learning Experience Framework

## Core Principles
1. **Retention over Completion:** Measure 30-day retention, not just module completion
2. **Application over Recall:** Test ability to use knowledge, not just remember it
3. **Understanding over Memorization:** Use Socratic questioning, not MCQ
4. **Adaptation over Prescription:** Personalize based on learning patterns, not just difficulty
5. **Feedback over Scoring:** Guide improvement, don't just mark wrong

## Lesson Structure (The Cerply Method)

### Phase 1: Pre-Assessment (Understanding Baseline)
- 3-5 questions on topic (before teaching)
- Purpose: Understand prior knowledge, activate schema
- No penalty for wrong answers
- Results inform personalization

### Phase 2: Concept Introduction (Chunked Learning)
- Present 1-2 core concepts at a time
- Use examples, analogies, scenarios
- Include proprietary content (company-specific context)
- Keep chunks small (5-10 min)

### Phase 3: Retrieval Practice (Active Recall)
- 2-3 questions per concept chunk
- Mix question types:
  - Scenario-based: "A team member misses a deadline. What should you do?"
  - Application: "How would you apply this in your role?"
  - Comparison: "What's the difference between X and Y?"
  - Socratic: "Why might that approach fail?"

### Phase 4: Spaced Review (Long-term Retention)
- Questions resurface at intervals (1d, 3d, 7d, 14d)
- Focus on concepts learner struggled with
- Interleave with new content

### Phase 5: Application Assessment (Transfer of Learning)
- Real-world scenario requiring synthesis
- Open-ended or case-study format
- Manager-reviewable (if configured)

## Question Types (Evidence-Based Priority)

### **Priority 1: Free-Text/Short Answer (Retrieval Practice)** 🏆
**Why first:** Generation > recognition. Most effective for long-term retention.

**Format:**
```
Question: You need to delegate a critical project to a team member who hasn't 
led before. Describe your approach in 2-3 sentences.

[LLM evaluates for key elements:
- Clear expectations defined
- Support/resources offered
- Checkpoints established
- Risk mitigation considered]

Feedback: "Good start. You defined expectations clearly. Consider adding 
specific checkpoints—e.g., 'Weekly check-ins to review progress.' This helps 
catch issues early."
```

**Implementation:**
- Use for all conceptual questions (not just procedural)
- LLM evaluation with rubric (key elements present?)
- Elaborated feedback (what's good, what's missing, how to improve)

---

### **Priority 2: Worked Examples with Fading** 🆕
**Why:** Reduces cognitive load for novices. Builds schemas efficiently.

**Format (3-step progression):**

**Step 1: Full Worked Example**
```
Problem: A team member misses a deadline. How do you handle it?

Worked Solution:
1. Schedule 1-1 within 24 hours (timely, private)
   → Shows urgency without public embarrassment
   
2. Ask open questions first: "What happened? What got in the way?"
   → Understand root cause before assuming
   
3. Identify barriers: Personal issue? Unclear requirements? Overloaded?
   → Address system issues, not just individual
   
4. Agree on action plan: "What do you need to get back on track?"
   → Ownership + support
   
5. Set checkpoint: "Let's check in Friday at 10am"
   → Accountability without micromanaging
```

**Step 2: Partial Fade (Completion Problem)**
```
Problem: A team member delivers low-quality work. How do you handle it?

Steps 1-3 provided:
1. Schedule 1-1 within 24 hours
2. Ask: "Walk me through your approach. What was challenging?"
3. Identify barriers: [you identified: unclear quality standards]

→ Now you complete steps 4-5:
4. [Your answer: action plan]
5. [Your answer: checkpoint]
```

**Step 3: Full Completion**
```
Problem: A high-performer suddenly becomes disengaged. How do you handle it?

→ Apply the 5-step framework:
[Your answer: full solution]
```

**Implementation:**
- Use for all complex, multi-step concepts
- Progress: worked → partial → full only after demonstrating understanding
- Track fading level per learner (adaptive)

---

### **Priority 3: Self-Explanation Prompts** 🆕
**Why:** Forces deep processing. Reveals and fixes misconceptions.

**Format:**
```
Question: [After answering] Explain why you chose that answer in 1-2 sentences.

Learner: "I chose B because..."

Follow-up: "Good. How would your answer differ if the team member was new vs. experienced?"

[Forces comparison, nuance, transfer]
```

**Implementation:**
- Use after every 3rd question (not every question—too tedious)
- LLM evaluates explanation quality
- Prompt deeper if shallow: "Can you elaborate on why that matters?"

---

### **Priority 4: Comparison Questions (Interleaving)** 
**Why:** Trains discrimination. Critical when concepts are confusable.

**Format:**
```
Question: You have two scenarios:
A) High performer, resistant to feedback
B) Low performer, eager to improve

How does your coaching approach differ?

[Requires understanding nuance—can't apply one template]

Good answer includes:
- High performer: Build trust first, frame feedback as growth, ask for input
- Low performer: Provide structure, frequent check-ins, celebrate progress
- Key difference: Autonomy vs. support level
```

**Implementation:**
- Use when teaching related concepts (leadership styles, delegation vs. micromanaging)
- Interleave with other question types
- Force explicit comparison (don't allow generic answers)

---

### **Priority 5: Scenario-Based MCQ (Only When Necessary)**
**Why:** Faster than free-text, useful for procedural knowledge. But less effective than generation.

**Format:**
```
Scenario: You're managing a remote team. One team member consistently misses 
daily standups but delivers quality work. How do you address this?

A. Require mandatory attendance
B. Have a 1-1 to understand their perspective
C. Ignore it since their work is good
D. Escalate to HR

[Correct: B, with nuanced explanation about remote flexibility vs. team cohesion]
```

**Use cases:**
- Procedural knowledge (policies, rules)
- Quick checks (not main assessment)
- **NOT for conceptual understanding** (use free-text instead)

---

### **Question Type Distribution (Per Module)**

For a 30-minute module with ~15 questions:

| Type | Count | When |
|------|-------|------|
| Free-text/short answer | 6-8 | Main assessment (40-50%) |
| Worked examples (faded) | 2-3 | Complex concepts |
| Self-explanation prompts | 3-4 | After every 3rd question |
| Comparison questions | 2-3 | Related concepts |
| MCQ (if necessary) | 0-2 | Procedural only |

**Rule:** Prioritize generation over recognition. MCQ is last resort.

## Adaptive Mechanisms (Evidence-Based)

### **1. Elo-Based Difficulty Targeting (NEW - Replaces Basic Difficulty)** 🏆
**Evidence:** Production-validated in chess, gaming, education. Stable, low-latency, robust.

**Principle:** Target ~70-80% success probability (optimal "desirable difficulty").

**Implementation:**
```typescript
// Each question has an Elo rating (difficulty)
// Each learner has an Elo rating (ability)

// After each answer, update both:
function updateElo(
  learnerRating: number,
  questionRating: number,
  correct: boolean,
  kFactor: number = 32
): { newLearnerRating: number; newQuestionRating: number } {
  // Expected score (probability learner gets it right)
  const expectedScore = 1 / (1 + Math.pow(10, (questionRating - learnerRating) / 400));
  
  // Actual score (1 if correct, 0 if wrong)
  const actualScore = correct ? 1 : 0;
  
  // Update ratings
  const newLearnerRating = learnerRating + kFactor * (actualScore - expectedScore);
  const newQuestionRating = questionRating + kFactor * (expectedScore - actualScore);
  
  return { newLearnerRating, newQuestionRating };
}

// Select next question targeting 70-80% success probability
function selectNextQuestion(
  learnerRating: number,
  availableQuestions: Question[]
): Question {
  // Find questions where expected score is 0.70-0.80
  const targetExpectedScore = 0.75; // Midpoint of 70-80%
  
  return availableQuestions
    .map(q => ({
      question: q,
      expectedScore: 1 / (1 + Math.pow(10, (q.eloRating - learnerRating) / 400)),
    }))
    .sort((a, b) => 
      Math.abs(a.expectedScore - targetExpectedScore) - 
      Math.abs(b.expectedScore - targetExpectedScore)
    )[0].question;
}
```

**Advantages:**
- No training data required (cold-start solved)
- Real-time updates (no batch retraining)
- Interpretable (rating = difficulty/ability)
- Production-validated (millions of users)

**Integration with Epic 9:**
- Replaces basic difficulty adjustment
- Still tracks mastery per concept (Epic 9)
- Adds precise targeting (70-80% success)

---

### **2. Spaced Repetition Adaptation (SM-2 Algorithm)** ✅
**Evidence:** Decades of use, proven effective. Simple and robust.

**Implementation:**
- Shorter intervals if learner forgets quickly (performance = "again" or "hard")
- Longer intervals if learner retains well (performance = "good" or "easy")
- Algorithm: SM-2 (SuperMemo 2) - see implementation in Phase 2

**Key Parameters:**
- Success → Interval multiplied by ease factor (2.5 default)
- Failure → Interval reset to 1 day, ease factor reduced
- Adjust ease factor based on performance history

---

### **3. Worked Example Fading Adaptation (NEW)** 🆕
**Principle:** Progress from worked → partial → full only when ready.

**Implementation:**
- **Novice:** Full worked examples (steps 1-5 shown)
- **Intermediate:** Partial fade (steps 1-3 shown, complete 4-5)
- **Advanced:** Full completion (no steps shown)
- **Trigger:** 80%+ success on partial → advance to full
- **Regression:** < 60% success on full → back to partial

**Tracks per concept:**
```typescript
interface LearnerConceptMastery {
  conceptId: string;
  fadingLevel: 'worked' | 'partial' | 'full';
  successRate: number;
  attempts: number;
}
```

---

### **4. Interleaving Adaptation (NEW)** 🆕
**Principle:** Increase interleaving as learner progresses. Novices need some blocking.

**Implementation:**
- **Early (< 30% module progress):** 70% blocking, 30% interleaving
- **Middle (30-70% progress):** 50% blocking, 50% interleaving
- **Late (> 70% progress):** 20% blocking, 80% interleaving
- **Always interleave during spaced repetition** (critical for discrimination)

**Algorithm:**
```typescript
function selectNextConcept(
  moduleProgress: number,
  currentConcept: string,
  availableConcepts: string[]
): string {
  const interleaveProbability = Math.min(0.8, 0.3 + (moduleProgress * 0.5));
  
  if (Math.random() < interleaveProbability) {
    // Interleave: Select different concept (related if possible)
    return availableConcepts.filter(c => c !== currentConcept)[0];
  } else {
    // Block: Continue current concept
    return currentConcept;
  }
}
```

---

### **5. Content Personalization (Epic-Specific)** ✅
**What adapts:**
- Emphasize concepts learner struggles with (more questions, more spacing)
- Skip concepts learner has mastered (80%+ success, move to maintenance mode)
- Adjust examples to learner's role/industry (if provided)

**What doesn't adapt (MYTH):**
- ⛔ "Learning styles" (VAK) - proven ineffective, do NOT implement
- ⛔ Preference for text vs. images - everyone benefits from both
- ⛔ Time-of-day preferences - weak/no evidence

**Focus on proven mechanisms:** Elo targeting, spaced repetition, interleaving, fading.

## Retention Measurement

### Short-term (During Module)
- Question accuracy
- Time to answer
- Confidence ratings
- Hint usage

### Medium-term (7-14 days)
- Spaced repetition performance
- Concept retention rate
- Application question success

### Long-term (30+ days)
- Recall without prompting
- Transfer to new scenarios
- Manager-observed behavior change (optional)

## Manager Feedback Loop

### What Managers See:
1. **Content Effectiveness Metrics:**
   - Which questions have high failure rates?
   - Which concepts require the most hints?
   - Where do learners drop off?

2. **Learner Progress Patterns:**
   - Who's mastering quickly vs. struggling?
   - Which concepts are universally difficult?
   - Retention trends over time

3. **Refinement Opportunities:**
   - Suggested question improvements
   - Concepts needing more examples
   - Proprietary content gaps

### Manager Actions:
1. **Edit Questions:** Improve clarity, add context
2. **Add Examples:** Company-specific scenarios
3. **Adjust Difficulty:** Make easier/harder
4. **Add Guidance:** Better explanations for wrong answers
5. **Reorder Content:** Change concept sequence

## Success Metrics

### Learner-Level:
- **Completion Rate:** % who finish assigned modules
- **Retention Rate:** % who remember concepts after 30 days
- **Application Score:** Performance on scenario-based questions
- **Engagement:** Time spent, questions answered, hints used

### Module-Level:
- **Difficulty Calibration:** Are questions too easy/hard?
- **Concept Clarity:** Do learners understand after guidance?
- **Retention Curve:** Is spacing effective?

### Team-Level:
- **Skill Improvement:** Manager-observed performance changes
- **Consistency:** Are all team members learning effectively?
- **Efficiency:** Time to competency

---

## Testing Protocol

### Phase 1: Internal Testing (Week 1)
**Participants:** 3-5 Cerply team members  
**Focus:** Usability, question clarity, adaptive mechanics

**Tests:**
1. Complete 1 full module (start to finish)
2. Track: time spent, questions answered, hints used, drop-off points
3. Interview: What felt engaging? What felt tedious?
4. Measure: Can they recall key concepts 3 days later?

**Success Criteria:**
- [ ] 100% completion rate
- [ ] Avg time: 20-30 minutes per module
- [ ] 80%+ retention after 3 days
- [ ] No major UX complaints

### Phase 2: Pilot Testing (Week 2-3)
**Participants:** 10-15 real learners (from 2-3 client organizations)  
**Focus:** Learning efficacy, retention, engagement

**Tests:**
1. Assign 2 modules per learner
2. Track full metrics (completion, retention, application)
3. Survey after completion: Did you learn? Would you recommend?
4. Test retention at 7 days and 30 days (spaced repetition)

**Success Criteria:**
- [ ] 80%+ completion rate
- [ ] 70%+ retention after 7 days
- [ ] 60%+ retention after 30 days
- [ ] 80%+ would recommend
- [ ] Avg time: 25-35 minutes per module

### Phase 3: Manager Testing (Week 3-4)
**Participants:** 3-5 managers (from pilot organizations)  
**Focus:** Manager refinement workflows, feedback loop

**Tests:**
1. Managers review module performance data
2. Managers edit questions, add proprietary content
3. Managers observe team learning patterns
4. Interview: Is the feedback actionable? Can you refine effectively?

**Success Criteria:**
- [ ] 100% of managers can edit questions successfully
- [ ] 80%+ find feedback actionable
- [ ] Managers can identify struggling learners
- [ ] Refinements improve module performance (measured)

### Phase 4: Iteration (Week 4-5)
**Based on pilot data, iterate:**
1. Adjust spaced repetition intervals
2. Refine question types
3. Improve guidance quality
4. Optimize adaptive algorithms
5. Enhance manager feedback loop

**Validation:**
- Re-test with original pilot group
- Measure improvement in retention and engagement

---

## Implementation Plan

### **Phase 1: Framework & Question Types (8-10h)**

**Database Schema Updates:**
```sql
-- Add question types and metadata
ALTER TABLE questions 
  ADD COLUMN question_type TEXT, -- 'scenario' | 'application' | 'socratic' | 'comparison'
  ADD COLUMN difficulty_rating NUMERIC(3,2), -- 0.0 to 1.0 (from learner data)
  ADD COLUMN avg_time_seconds INTEGER, -- Average time to answer
  ADD COLUMN hint_usage_rate NUMERIC(3,2), -- % who use hints
  ADD COLUMN success_rate NUMERIC(3,2); -- % who answer correctly

-- Spaced repetition tracking
CREATE TABLE IF NOT EXISTS spaced_repetition_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  question_id UUID NOT NULL REFERENCES questions(id),
  concept_id UUID, -- Group related questions
  last_reviewed TIMESTAMPTZ NOT NULL,
  next_review TIMESTAMPTZ NOT NULL,
  interval_days INTEGER NOT NULL, -- Current spacing interval
  ease_factor NUMERIC(3,2) DEFAULT 2.5, -- SM-2 algorithm
  repetition_count INTEGER DEFAULT 0,
  performance_history JSONB, -- Track accuracy over time
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_spaced_repetition_next_review ON spaced_repetition_schedule(user_id, next_review);

-- Learning style detection
CREATE TABLE IF NOT EXISTS learner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  learning_style_preferences JSONB, -- visual, analytical, kinesthetic scores
  avg_question_time_seconds INTEGER,
  hint_preference TEXT, -- 'minimal' | 'moderate' | 'frequent'
  retention_strength NUMERIC(3,2), -- Based on spaced repetition performance
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Question performance analytics (for managers)
CREATE TABLE IF NOT EXISTS question_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id),
  module_id UUID NOT NULL REFERENCES modules(id),
  time_period TEXT NOT NULL, -- 'daily' | 'weekly' | 'monthly'
  attempts_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  avg_time_seconds INTEGER,
  hint_usage_count INTEGER,
  drop_off_count INTEGER, -- How many abandoned after this question
  needs_review BOOLEAN DEFAULT false, -- Flag for manager attention
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**API Routes:**
```typescript
// Get next question (with spaced repetition logic)
GET /api/learn/modules/:id/next-question
  - Checks if any spaced repetition questions are due
  - If yes, prioritizes those
  - If no, returns next new question
  - Applies adaptive difficulty
  - Returns question with context

// Submit answer (with learning analytics)
POST /api/learn/modules/:id/answer
  Body: { questionId, answer, timeSpent, hintsUsed, confidenceRating }
  - Records answer
  - Updates spaced repetition schedule
  - Updates learner profile
  - Returns feedback (contextual guidance)

// Get Socratic follow-up (for application questions)
POST /api/learn/socratic-dialogue
  Body: { questionId, userAnswer }
  - Uses LLM to generate follow-up questions
  - Guides learner to deeper understanding
  - Tracks dialogue depth
```

---

### **Phase 2: Spaced Repetition Implementation (6-8h)**

**SM-2 Algorithm Implementation:**
```typescript
// services/spaced-repetition.ts
export async function scheduleNextReview(
  userId: string,
  questionId: string,
  performance: 'again' | 'hard' | 'good' | 'easy'
): Promise<{ nextReview: Date; intervalDays: number }> {
  // Get current schedule
  const schedule = await db.select()
    .from(spacedRepetitionSchedule)
    .where(and(
      eq(spacedRepetitionSchedule.userId, userId),
      eq(spacedRepetitionSchedule.questionId, questionId)
    ))
    .limit(1);

  let easeFactor = 2.5;
  let intervalDays = 1;
  let repetitionCount = 0;

  if (schedule.length > 0) {
    easeFactor = schedule[0].easeFactor;
    intervalDays = schedule[0].intervalDays;
    repetitionCount = schedule[0].repetitionCount;
  }

  // SM-2 algorithm
  if (performance === 'again') {
    // Restart interval
    intervalDays = 1;
    repetitionCount = 0;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else if (performance === 'hard') {
    intervalDays = Math.max(1, Math.floor(intervalDays * 1.2));
    easeFactor = Math.max(1.3, easeFactor - 0.15);
    repetitionCount++;
  } else if (performance === 'good') {
    if (repetitionCount === 0) intervalDays = 1;
    else if (repetitionCount === 1) intervalDays = 3;
    else intervalDays = Math.floor(intervalDays * easeFactor);
    easeFactor = easeFactor + 0.1;
    repetitionCount++;
  } else if (performance === 'easy') {
    if (repetitionCount === 0) intervalDays = 3;
    else if (repetitionCount === 1) intervalDays = 7;
    else intervalDays = Math.floor(intervalDays * easeFactor * 1.3);
    easeFactor = easeFactor + 0.15;
    repetitionCount++;
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + intervalDays);

  // Update schedule
  if (schedule.length > 0) {
    await db.update(spacedRepetitionSchedule)
      .set({
        nextReview,
        intervalDays,
        easeFactor,
        repetitionCount,
        lastReviewed: new Date(),
        performanceHistory: sql`
          jsonb_build_object(
            'timestamp', NOW(),
            'performance', ${performance}
          ) || performance_history
        `,
      })
      .where(eq(spacedRepetitionSchedule.id, schedule[0].id));
  } else {
    await db.insert(spacedRepetitionSchedule).values({
      userId,
      questionId,
      nextReview,
      intervalDays,
      easeFactor,
      repetitionCount,
      lastReviewed: new Date(),
      performanceHistory: [{ timestamp: new Date(), performance }],
    });
  }

  return { nextReview, intervalDays };
}
```

---

### **Phase 3: Contextual Guidance & Socratic Dialogue (6-8h)**

**LLM-Powered Guidance:**
```typescript
// services/contextual-guidance.ts
export async function generateGuidance(
  question: Question,
  userAnswer: string,
  isCorrect: boolean
): Promise<string> {
  if (isCorrect) {
    // Reinforce understanding
    const prompt = `The learner answered correctly: "${userAnswer}"
    
    Provide brief positive reinforcement (1-2 sentences) that:
    1. Affirms their understanding
    2. Connects to a broader concept or real-world application
    
    Be encouraging but not patronizing.`;
    
    const result = await callOpenAI('gpt-4o-mini', prompt, 'You are a supportive learning coach.', 3, 0.7);
    return result.content;
  } else {
    // Socratic guidance
    const prompt = `Question: ${question.stem}
    Correct answer: ${question.correctAnswer}
    Learner's answer: ${userAnswer}
    
    Provide Socratic guidance (2-3 sentences) that:
    1. Doesn't just say "wrong" - explains WHY it's incorrect
    2. Asks a guiding question to help them discover the right answer
    3. Connects to a concept they should understand
    
    Be supportive and constructive, not judgmental.
    
    Example:
    "That's a common misconception. Think about what happens when you [concept]. 
    How might that affect [related concept]? What would be a more effective approach?"`;
    
    const result = await callOpenAI('gpt-4o-mini', prompt, 'You are a Socratic learning coach.', 3, 0.7);
    return result.content;
  }
}

// For open-ended application questions
export async function evaluateApplicationAnswer(
  question: Question,
  userAnswer: string
): Promise<{ score: number; feedback: string; followUpQuestion?: string }> {
  const prompt = `Question: ${question.stem}
  
  Learner's answer: "${userAnswer}"
  
  Evaluate their answer on these criteria:
  1. Understanding of core concept (0-10)
  2. Practical application (0-10)
  3. Specificity (0-10)
  4. Consideration of nuance/context (0-10)
  
  Provide:
  1. Overall score (0-10)
  2. Constructive feedback (2-3 sentences)
  3. Optional follow-up question to deepen understanding
  
  Return JSON:
  {
    "score": 7.5,
    "feedback": "...",
    "followUpQuestion": "..." (optional)
  }`;
  
  const result = await callOpenAI('gpt-4o', prompt, 'You are an expert learning evaluator.', 3, 0.3);
  // Parse and return
  let cleanContent = result.content.trim();
  if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  return JSON.parse(cleanContent);
}
```

---

### **Phase 4: Manager Feedback Loop (4-6h)**

**Question Analytics Dashboard:**
```typescript
// GET /api/curator/modules/:id/question-analytics
app.get('/api/curator/modules/:id/question-analytics', requireManager, async (req, reply) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Verify ownership
  const module = await db.select()
    .from(modules)
    .where(and(eq(modules.id, id), eq(modules.createdBy, userId)))
    .limit(1);

  if (!module.length) {
    return reply.status(403).send({ error: { code: 'FORBIDDEN' } });
  }

  // Get question performance analytics
  const questions = await db.select({
    question: questions,
    analytics: questionAnalytics,
    attempts: sql<number>`COUNT(DISTINCT ${attempts.id})`,
    avgScore: sql<number>`AVG(CASE WHEN ${attempts.correct} = true THEN 1.0 ELSE 0.0 END)`,
    avgTime: sql<number>`AVG(${attempts.timeSpentSeconds})`,
    dropOffRate: sql<number>`COUNT(DISTINCT CASE WHEN ${attempts.abandoned} THEN ${attempts.userId} END)::FLOAT / COUNT(DISTINCT ${attempts.userId})`,
  })
    .from(questions)
    .leftJoin(questionAnalytics, eq(questions.id, questionAnalytics.questionId))
    .leftJoin(attempts, eq(questions.id, attempts.questionId))
    .where(eq(questions.moduleId, id))
    .groupBy(questions.id, questionAnalytics.id);

  // Flag questions needing attention
  const needsReview = questions.filter(q => 
    q.avgScore < 0.4 || // Success rate < 40%
    q.dropOffRate > 0.2 || // > 20% abandon after this question
    q.avgTime > 180 // Taking > 3 minutes on average
  );

  return reply.send({
    questions,
    needsReview,
    summary: {
      totalQuestions: questions.length,
      avgSuccessRate: questions.reduce((sum, q) => sum + q.avgScore, 0) / questions.length,
      questionsNeedingReview: needsReview.length,
    },
  });
});
```

---

## Testing Protocol Implementation

### **Phase 1: Internal Testing (3-4h)**
1. Create test accounts for team members
2. Assign 1 test module to each
3. Track metrics in real-time dashboard
4. Conduct interviews (structured questionnaire)
5. Measure 3-day retention with surprise quiz

### **Phase 2: Pilot Testing (8-10h across 2-3 weeks)**
1. Recruit 10-15 learners from 2-3 organizations
2. Set up tracking infrastructure
3. Assign 2 modules per learner
4. Conduct surveys (pre, post, 7-day, 30-day)
5. Analyze retention curves
6. Interview top and bottom performers

### **Phase 3: Manager Testing (4-5h)**
1. Train managers on refinement workflows
2. Have them review question analytics
3. Have them make refinements
4. Measure if refinements improve performance
5. Conduct structured interviews

### **Phase 4: Iteration (6-8h)**
1. Analyze all pilot data
2. Identify patterns (what works, what doesn't)
3. Make targeted improvements
4. Re-test with subset of pilot group
5. Validate improvements

---

## Success Metrics

### **Learner-Level:**
- [ ] 80%+ completion rate
- [ ] 70%+ retention at 7 days
- [ ] 60%+ retention at 30 days
- [ ] 80%+ satisfaction score
- [ ] 25-35 min avg time per module

### **Module-Level:**
- [ ] 60-80% success rate on questions (too easy if >90%, too hard if <50%)
- [ ] < 10% drop-off rate
- [ ] Spaced repetition improves retention by 20%+
- [ ] Application questions correlate with real-world performance

### **Manager-Level:**
- [ ] 100% can refine questions successfully
- [ ] 80%+ find analytics actionable
- [ ] Refinements improve module performance (measured)
- [ ] Managers can identify struggling learners early

---

## Acceptance Criteria

### **Pedagogical Framework:**
- [ ] Framework document created and reviewed
- [ ] All question types defined with examples
- [ ] Spaced repetition algorithm documented
- [ ] Retention measurement strategy defined

### **Implementation:**
- [ ] Database schema for spaced repetition, learner profiles, analytics
- [ ] API routes for adaptive question delivery
- [ ] LLM-powered contextual guidance
- [ ] Socratic dialogue for application questions
- [ ] Manager analytics dashboard
- [ ] Question refinement workflows

### **Testing:**
- [ ] Internal testing completed (3-5 team members)
- [ ] Pilot testing completed (10-15 real learners)
- [ ] Manager testing completed (3-5 managers)
- [ ] Iteration cycle completed
- [ ] Retention validated (7-day and 30-day tests)

### **Documentation:**
- [ ] Learning Experience Framework document
- [ ] Testing protocol and results
- [ ] Manager refinement guide
- [ ] Learner journey documentation

---

## Dependencies

- ✅ **Epic 9:** Adaptive Difficulty Engine (provides foundation)
- 🚧 **Epic 15:** Learning Module Delivery (basic structure)
- 🚧 **Epic 14:** Manager Module Workflows (refinement touchpoints)
- ✅ **Epic 8:** Conversational UI (Socratic dialogue)

---

## Timeline

**Total: 24-32 hours over 3-4 weeks (to allow for testing intervals)**

| Week | Phase | Hours | Activities |
|------|-------|-------|-----------|
| 1 | Framework & Implementation | 8-10h | Database, API routes, question types |
| 1-2 | Spaced Repetition | 6-8h | Algorithm, scheduling, testing |
| 2 | Contextual Guidance | 6-8h | LLM integration, Socratic dialogue |
| 2-3 | Manager Feedback Loop | 4-6h | Analytics dashboard, refinement workflows |
| 3-4 | Testing & Iteration | 12-16h | Internal, pilot, manager testing, iteration |

**Note:** Testing phases overlap with implementation. Start pilot testing as soon as core mechanics are ready.

---

## Post-MVP Enhancements

Once validated, consider:
- AI tutoring (real-time conversational teaching)
- Peer learning (collaborative modules)
- Video/multimedia integration
- External certification
- Advanced learning analytics
- Predictive performance modeling

---

**This epic is CRITICAL for proving Cerply's value proposition. Without it, we're just an assignment tool, not a learning platform.**

