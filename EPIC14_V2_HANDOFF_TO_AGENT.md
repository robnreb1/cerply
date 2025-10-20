# Epic 14 v2.0 - Handoff to Epic Building Agent

**Date:** October 20, 2025  
**From:** User + AI Pair Programming Session  
**To:** Epic Building Agent  
**Priority:** P0 (MVP-CRITICAL)

---

## 🎯 Executive Summary

**What:** Transform manager module workflows from form-based UI to AI-first conversational interface  
**Why:** v1.0 implementation didn't match Cerply's "infinite expertise at infinite scale" vision  
**Impact:** This is the core value proposition for B2B customers

---

## 📄 Documentation Locations

### **Primary Epic Specification:**
**File:** `docs/EPIC14_V2_AI_FIRST_CONVERSATIONAL_MODULES.md`

This is your **complete implementation guide** containing:
- Full technical specification (32-40 hours)
- Database schema changes
- API routes and service architecture
- UI/UX specifications with code examples
- Acceptance criteria and testing strategy
- Phase-by-phase implementation plan

**READ THIS FIRST** before starting implementation.

---

### **Requirements Clarification:**
**File:** `docs/EPIC14_V2_REQUIREMENTS_SUMMARY.md`

This contains:
- User feedback and direct quotes
- Requirement interpretations with rationale
- Open questions for edge cases
- Success criteria

**Use this** to understand the "why" behind the technical decisions.

---

## 🔑 Key Requirements (Quick Reference)

### 1. **Conversational Interface (Not Forms)**
```
Manager → "I need to train my sales team on our new product pricing model"
Agent → Asks clarifying questions, generates module preview
Manager → Refines via natural language prompts
```

**Technical:** Chat-based UI + conversation API + module creation agent service

---

### 2. **Two Content Creation Modes**

**Mode A:** Manager prompts → Agent researches public sources → Manager refines + adds proprietary content  
**Mode B:** Manager uploads proprietary docs → Agent structures → Optionally supplements with public research

**Technical:** Both modes must tag content provenance (`proprietary`, `public_web`, `ai_generated`)

---

### 3. **Proprietary Content = Ring-Fenced**

- **Access control:** `organizationId` filter on all queries
- **Privacy:** Never used for AI training, never leaked to other orgs
- **Audit:** All access logged

**Technical:** Add `content_source`, `is_ring_fenced`, `access_control` columns to `module_proprietary_content`

---

### 4. **Proficiency = Mastery of Difficulty Level**

**NOT:** "Answered 17/20 questions correctly"  
**IS:** "Can answer Expert-level questions with 80% accuracy in recent attempts"

**Technical:** Calculate proficiency based on success rate at `target_difficulty` level (last 10-20 attempts)

---

### 5. **Time-Bound = Deadline for Proficiency**

**NOT:** "This module takes 30 minutes"  
**IS:** "Learner must reach 85% proficiency by Jan 15, 2026"

**Technical:** Add `target_proficiency_pct`, `deadline_at`, `current_proficiency_pct`, `risk_status` to `module_assignments`

---

### 6. **Difficulty = Question-Level (Not Module-Level)**

- Module defines `target_mastery_level` (e.g., "Expert")
- Questions tagged with difficulty (1-5)
- Adaptive engine adjusts which questions are presented

**Technical:** Drop `difficulty_level` from `manager_modules`, add `target_mastery_level`

---

## 🏗️ Implementation Phases

### **Phase 1: Conversational Infrastructure (12-16h)**
- Migration: `030_manager_modules_ai_first.sql`
- API: `POST /api/curator/modules/conversation`
- Service: `api/src/services/module-creation-agent.ts`
- File upload processing

**Deliverable:** Manager can have a conversation that generates a module preview

---

### **Phase 2: Proficiency & Deadline Management (8-10h)**
- Proficiency calculation logic
- Background job (hourly) for proficiency updates
- Risk status determination (`on_track`, `at_risk`, `overdue`, `achieved`)
- Notification triggers (manager + learner)

**Deliverable:** Proficiency tracking and deadline escalation work end-to-end

---

### **Phase 3: UI Implementation (12-14h)**
- `/manager/modules/create` - Chat interface
- Module preview component
- File upload inline in chat
- Suggestion buttons
- Analytics page with proficiency tracking

**Deliverable:** Full conversational module creation flow in production

---

## ✅ Acceptance Criteria (Must-Pass)

1. ✅ Manager can create module via conversation (< 3 minutes)
2. ✅ Manager can upload proprietary files inline
3. ✅ Agent generates module preview after collecting info
4. ✅ Proprietary content is ring-fenced (access control enforced)
5. ✅ Proficiency is calculated based on difficulty mastery
6. ✅ Deadline tracking triggers at-risk/overdue alerts
7. ✅ Manager and learner are notified appropriately
8. ✅ UI feels conversational and intelligent (not forms)

---

## 🚨 Critical Guardrails

### **Must NOT:**
1. Use form-based UI (replaced by conversational)
2. Allow cross-org access to proprietary content
3. Calculate proficiency as raw quiz scores
4. Treat "time-bound" as module duration

### **Must:**
1. Tag all content with provenance (`proprietary`, `public_web`, `ai_generated`)
2. Filter by `organizationId` on all proprietary content queries
3. Calculate proficiency based on difficulty mastery
4. Set deadlines for proficiency targets (not completion)

---

## 📊 Database Changes Summary

**manager_modules:**
- ✅ Add `target_mastery_level` (replaces `difficulty_level`)
- ✅ Add `starting_level` (optional)
- ✅ Add `content_generation_prompt`

**module_proprietary_content:**
- ✅ Add `content_source` (`proprietary`, `public_web`, `ai_generated`)
- ✅ Add `is_ring_fenced` (boolean)
- ✅ Add `access_control` (`org_only`, `public`)

**module_assignments:**
- ✅ Add `target_proficiency_pct` (70-100%)
- ✅ Add `deadline_at` (timestamp)
- ✅ Add `current_proficiency_pct` (auto-calculated)
- ✅ Add `risk_status` (`on_track`, `at_risk`, `overdue`, `achieved`)

**New table:**
- ✅ `module_creation_conversations` (stores conversation history)

---

## 🧪 Testing Requirements

### **Unit Tests:**
- Module creation agent logic
- Proficiency calculation
- Risk status determination
- Access control for proprietary content

### **Integration Tests:**
- End-to-end conversational module creation
- File upload and processing
- Proficiency tracking background job
- Notification triggers

### **Manual UAT:**
1. Create module via conversation (upload file mid-flow)
2. Assign module with deadline, simulate learner progress
3. Verify proficiency updates and risk alerts trigger
4. Verify proprietary content access control (cross-org test)

---

## 📞 Questions? Blockers?

**Check:**
1. Epic specification: `docs/EPIC14_V2_AI_FIRST_CONVERSATIONAL_MODULES.md`
2. Requirements summary: `docs/EPIC14_V2_REQUIREMENTS_SUMMARY.md`
3. Existing Epic 6 (content generation) and Epic 13 (agent orchestrator) for patterns

**If stuck:**
- Ask user for clarification (don't guess)
- Reference user's direct quotes in requirements summary
- Follow existing patterns from learner conversational flow

---

## 🎯 Success = User Vision

> "We have access to infinite experts and infinite scale; let's make it feel like that."

**Build an interface that feels like working with an expert consultant, not filling out database forms.**

---

**You have everything you need. Good luck! 🚀**

