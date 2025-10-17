# MVP Roadmap - With Learning Experience Design

**Version:** 1.0  
**Date:** 2025-10-17  
**Status:** Updated to include pedagogical design & testing

---

## 🎯 **The Complete Picture**

Your insight is spot-on: **we need to prove learners actually learn and retain knowledge**, not just complete modules.

Here's how the epics fit together:

---

## **Epic Responsibilities (Clear Division)**

| Epic | What It Does | Testing Focus |
|------|-------------|---------------|
| **Epic 14: Manager Module Workflows** | Manager creates, refines, assigns, tracks | Usability (can managers use it?) |
| **Epic 15: Learning Module Delivery** | Basic structure (start, answer, complete) | Infrastructure (does it work?) |
| **Epic 16: Learning Experience Design** | Pedagogy, retention, adaptivity, testing | Efficacy (do learners actually learn?) |

---

## **Epic 14: Manager Module Workflows** (20-24h)

### **What Managers Do:**
1. **Create:** Generate module from conversational topic
2. **Refine:** Edit sections, questions, guidance
3. **Augment:** Add proprietary content (documents, case studies)
4. **Assign:** To teams (mandatory/optional, due dates)
5. **Track:** Progress, completion, performance

### **What Managers See:**
- Completion rates
- Average scores
- Time spent
- Struggling learners

### **What Managers DON'T Do (yet):**
- Design pedagogy (Epic 16)
- Understand retention patterns (Epic 16)
- Test learning efficacy (Epic 16)

**Focus:** Workflow and operations, not learning science.

---

## **Epic 15: Learning Module Delivery** (16-20h)

### **What Learners Do:**
1. **Discover:** View assigned modules
2. **Start:** Begin learning session
3. **Answer:** Respond to questions
4. **Complete:** Finish module, earn certificate

### **What's Implemented:**
- Module assignment system
- Question delivery (basic)
- Progress tracking
- Completion certification
- Integration with Epic 9 (adaptive difficulty)

### **What's NOT Implemented (yet):**
- Spaced repetition (Epic 16)
- Contextual guidance (Epic 16)
- Retention measurement (Epic 16)
- Application questions (Epic 16)

**Focus:** Basic infrastructure and user flow, not learning efficacy.

---

## **Epic 16: Learning Experience Design & Testing** (24-32h)

### **What's Designed:**
1. **Pedagogical Framework:** Research-backed lesson design
2. **Question Types:** Scenario, application, Socratic, comparison
3. **Spaced Repetition:** SM-2 algorithm for long-term retention
4. **Contextual Guidance:** LLM-powered Socratic dialogue
5. **Retention Measurement:** 7-day and 30-day testing
6. **Manager Feedback Loop:** Question analytics, refinement opportunities

### **What's Tested:**
1. **Internal Testing:** 3-5 team members, usability & clarity
2. **Pilot Testing:** 10-15 real learners, retention & engagement
3. **Manager Testing:** 3-5 managers, refinement workflows
4. **Iteration:** Data-driven improvements

### **What's Proven:**
- Learners retain knowledge 7 days later (70%+ target)
- Learners retain knowledge 30 days later (60%+ target)
- Spaced repetition improves retention by 20%+
- Application questions predict real-world performance
- Managers can refine effectively

**Focus:** Learning science, retention, efficacy, and continuous improvement.

---

## **How They Work Together**

```
Epic 14 (Manager Workflows)
  ├─ Manager creates module
  ├─ Manager reviews question analytics (from Epic 16)
  ├─ Manager edits questions to improve clarity
  └─ Manager sees retention patterns (from Epic 16)

Epic 15 (Module Delivery)
  ├─ Learner starts module
  ├─ Gets next question (spaced repetition from Epic 16)
  ├─ Answers question
  ├─ Receives contextual guidance (from Epic 16)
  └─ Completes module

Epic 16 (Learning Design)
  ├─ Implements spaced repetition algorithm
  ├─ Generates contextual guidance (LLM)
  ├─ Tracks retention over time
  ├─ Provides analytics to managers (via Epic 14)
  └─ Tests with real learners (validates efficacy)
```

---

## **Updated MVP Timeline**

### **Parallel Execution Strategy**

Since Epic 16 requires testing intervals (7-day, 30-day retention), run it in parallel:

#### **Week 1: Core Infrastructure**
- **Epic 13:** Agent Orchestrator (24-28h)
- **Epic 16 Phase 1:** Pedagogical framework & database (8-10h) **[START PARALLEL]**

#### **Week 2: Manager Workflows**
- **Epic 14:** Manager Module Workflows (20-24h)
- **Epic 16 Phase 2:** Spaced repetition implementation (6-8h) **[PARALLEL]**

#### **Week 3: Learner Experience**
- **Epic 15:** Learning Module Delivery (16-20h)
- **Epic 16 Phase 3:** Contextual guidance (6-8h) **[PARALLEL]**

#### **Week 4: Integration & Testing**
- **Epic 16 Phase 4:** Manager feedback loop (4-6h)
- **Epic 16 Phase 5:** Internal testing (3-4h)
- Integration testing (Epic 14 + 15 + 16)

#### **Week 5-6: Pilot Testing**
- **Epic 16 Phase 6:** Pilot with 10-15 learners (8-10h setup + monitoring)
- Test retention at 7 days
- Manager testing (3-5 managers use refinement workflows)

#### **Week 7: Iteration**
- **Epic 16 Phase 7:** Analyze data, iterate (6-8h)
- Test retention at 30 days
- Validate improvements

---

## **Total MVP Effort: 84-108 hours over 7 weeks**

| Epic | Effort | Timeline |
|------|--------|----------|
| Epic 13: Agent Orchestrator | 24-28h | Week 1 |
| Epic 14: Manager Workflows | 20-24h | Week 2 |
| Epic 15: Module Delivery | 16-20h | Week 3 |
| Epic 16: Learning Design | 24-32h | Week 1-7 (parallel + testing) |
| **Total** | **84-104h** | **7 weeks** |

**Why 7 weeks?** Epic 16 requires time intervals for retention testing (7-day, 30-day). Can't compress without compromising validation.

---

## **Success Criteria (Updated)**

### **Manager Workflow (Epic 14):**
- [ ] Manager creates module in < 5 minutes
- [ ] Manager refines content based on analytics
- [ ] Manager assigns to team in < 2 minutes
- [ ] Manager tracks progress in real-time

### **Learner Experience (Epic 15):**
- [ ] Learner views assigned modules
- [ ] Learner completes adaptive questions
- [ ] Learner receives certification
- [ ] 80%+ completion rate

### **Learning Efficacy (Epic 16):** 🚨
- [ ] 70%+ retention at 7 days
- [ ] 60%+ retention at 30 days
- [ ] 80%+ satisfaction score
- [ ] Spaced repetition improves retention by 20%+
- [ ] Application questions predict real-world performance
- [ ] Managers can refine questions to improve outcomes

---

## **Critical Path Dependencies**

```
Epic 13 (Agent)
  ↓
Epic 14 (Manager) + Epic 15 (Learner)
  ↓
Epic 16 (Learning Design)
  ↓ [requires 14 & 15 for integration]
Testing & Iteration
  ↓ [requires time intervals]
Validated MVP
```

**Note:** Epic 16 can START in parallel with Epic 13 (framework design, database schema), but INTEGRATION requires Epic 14 & 15 to be complete.

---

## **Your Research Integration**

You mentioned doing independent research on teaching mechanisms for retention and application. **Perfect!**

### **Where to integrate your findings:**

1. **Pedagogical Framework:** Update `docs/LEARNING_EXPERIENCE_FRAMEWORK.md` (created in Epic 16)
2. **Question Types:** Add to question design guidelines
3. **Spaced Repetition:** Adjust algorithm parameters
4. **Assessment Methods:** Add new question types based on research
5. **Testing Protocol:** Refine based on learning science best practices

### **Suggested Research Areas:**

| Topic | Why It Matters | Where It Goes |
|-------|----------------|---------------|
| **Cognitive Load Theory** | Prevents overwhelming learners | Lesson chunking, question pacing |
| **Desirable Difficulties** | Some struggle enhances retention | Question difficulty calibration |
| **Transfer of Learning** | Application to new contexts | Assessment design |
| **Metacognition** | Self-awareness of learning | Confidence ratings, reflection prompts |
| **Dual Coding Theory** | Visual + verbal encoding | Content presentation |
| **Retrieval Practice** | Active recall vs. recognition | Question type mix |

---

## **What to Build First**

Given Epic 16 is critical but requires testing time, here's the recommended sequence:

### **Phase 1: Foundation (Week 1)**
1. **Epic 13:** Agent Orchestrator (full focus)
2. **Epic 16:** Pedagogical framework document (parallel, 4-6h)

### **Phase 2: Manager & Learner (Week 2-3)**
1. **Epic 14:** Manager Workflows (full focus Week 2)
2. **Epic 15:** Module Delivery (full focus Week 3)
3. **Epic 16:** Database schema & spaced repetition (parallel, 6-8h)

### **Phase 3: Learning Design Integration (Week 4)**
1. **Epic 16:** Integrate spaced repetition into Epic 15
2. **Epic 16:** Add contextual guidance (LLM)
3. **Epic 16:** Manager feedback loop into Epic 14
4. **Internal testing:** Validate with team members

### **Phase 4: Pilot Testing (Week 5-6)**
1. **Epic 16:** Recruit 10-15 learners
2. **Epic 16:** Manager testing (3-5 managers)
3. **Epic 16:** Monitor retention (7-day, 30-day)

### **Phase 5: Iteration (Week 7)**
1. **Epic 16:** Analyze pilot data
2. **Epic 16:** Make improvements
3. **Epic 16:** Re-test and validate

---

## **Bottom Line**

You're absolutely right: **lesson design, testing, and genuine adaptivity are critical**.

**What we have now:**
- ✅ Content generation infrastructure
- ✅ Adaptive difficulty (basic)
- ✅ Conversational UI
- ✅ Manager analytics (basic)

**What we're adding:**
- 🚨 **Epic 14:** Manager can create, refine, assign, track
- 🚨 **Epic 15:** Learner can complete adaptive modules
- 🚨 **Epic 16:** Learners actually learn and retain (proven with data)

**Without Epic 16, we're just an assignment tool. With it, we're a learning platform.**

---

## **Next Steps**

1. **Review Epic 16 prompt:** `docs/EPIC16_LEARNING_EXPERIENCE_DESIGN_PROMPT.md`
2. **Conduct your independent research:** Retention, application, memory mechanisms
3. **Update Epic 16 framework:** Integrate your findings
4. **Start Epic 13:** Agent Orchestrator (enables everything else)
5. **Begin Epic 16 framework work:** Can happen in parallel with Epic 13

---

**This is the complete picture. Epic 16 is the missing piece that proves our value proposition: learners don't just complete modules, they actually learn and improve.**

