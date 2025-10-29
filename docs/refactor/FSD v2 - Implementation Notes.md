# FSD v2.0 Implementation Notes

**Document Version:** 1.0  
**Date:** 29 October 2025  
**Purpose:** Track deviations from FSD v2.0 specification during initial implementation

---

## Overview

This document tracks implementation decisions that deviate from the FSD v2.0 specification. These deviations are intentional and pragmatic, allowing for faster initial delivery while maintaining a clear path to full compliance.

---

## Deviations from FSD v2.0

### 1. Auth & Roles (FSD Section 6)

**Status:** 🟡 DEFERRED  
**Priority:** P1 (Post-UAT)  
**Affects:** Certified flow, Consultant handover workflow

**FSD Specification Requirement:**
- Distinct roles with fine-grained permissions:
  - **Manager/Leader:** Build/edit Company Modules, approve consultant-created modules, create Module assignments, track, export
  - **Certifier:** Build, review, stamp, manage Certified Core
  - **Consultant:** Build, save drafts to client's Content Library, propose lock (requires manager approval), handover ownership
  - **Company Admin:** Manage users, teams, roles, content rules
  - **Cerply Admin:** Platform administration
  - **Learner:** Receive items, natural language interactions

**Current Implementation:**
- Uses existing auth infrastructure with three roles:
  - `admin` role → maps to **both** Company Admin and Cerply Admin capabilities
  - `manager` role → maps to Manager/Leader (no Certifier or Consultant distinction)
  - `learner` role → maps to Learner

**What's Missing:**
1. **Certifier role:** No distinction between regular managers and expert certifiers who stamp modules for the Certified catalogue
2. **Consultant role:** No "propose lock" workflow where consultant-created modules require manager approval before becoming locked Company Modules
3. **Fine-grained permissions:** All management capabilities lumped into the `manager` role

**Implementation Plan (Post-UAT):**
1. Add `certifier` and `consultant` to the `user_roles` table CHECK constraint
2. Create middleware to distinguish between Manager, Certifier, and Consultant capabilities
3. Implement approval workflow:
   - Consultant saves draft → flags as "needs approval"
   - Manager reviews and approves → module locks as Company Module
   - Ownership transfers to client admin
   - Consultant retains read-only history
4. Update UI to show different capabilities per role
5. Add audit events for all approval actions

**Current Workaround:**
- Managers can perform Certifier duties (review and stamp)
- No consultant handover workflow - managers create modules directly
- All audit events use existing `user_id` without role context

**Impact on UAT:**
- Cannot fully test Certified flow with dedicated Certifier role
- Cannot test Consultant handover workflow
- Managers have more permissions than they should in final spec

---

### 2. Design System (FSD Section 1, Epic B)

**Status:** ✅ ALIGNED  
**Deviation:** None - following Cursor-inspired design as per user requirement

**Implementation:**
- 3-pane resizable layout using `react-resizable-panels`
- Color palette matching Cursor (dark: `#1e1e1e`, light: `#ffffff`)
- System font stack (San Francisco, Segoe UI, fallback to system-ui)
- 8px grid spacing system
- Subtle borders and professional aesthetic

---

### 3. Model Orchestration (FSD Section 14)

**Status:** ✅ ALIGNED  
**Deviation:** None

**Implementation follows FSD exactly:**
- Top model (GPT-5 Pro) for outline and Module core drafting
- Second top model (Claude Sonnet 4.5) for quality check (hallucination protection)
- Fast model (GPT-5-mini or Haiku) for chat and small edits
- All jobs logged to `model_logs` table with label, tokens, cost, duration

---

### 4. Item Shapes (FSD Section 9.2)

**Status:** 🟡 PARTIAL  
**Priority:** P2 (Post-UAT)

**FSD Specification:**
- Multiple item types: choice, short text, arrange steps, label parts, short case, "do then reflect"

**Current Implementation:**
- Basic support for `micro-lesson`, `quick-check`, `quiz`, `guidance-note` types
- Item content stored as JSONB for flexibility
- Shape differentiation deferred to post-UAT

**Implementation Plan (Post-UAT):**
- Define schemas for each item shape
- Build UI components for each shape
- Update adaptive engine to mix shapes effectively

---

### 5. Directory Sync & SSO (FSD Section 8.2)

**Status:** 🟡 DEFERRED  
**Priority:** P3 (Client demand-driven)

**FSD Specification:**
- Invite links at launch
- Single sign-on can be added later based on client demand
- Directory sync can be accommodated

**Current Implementation:**
- Invite links only (existing infrastructure)
- SSO code exists but not configured for V2
- Groups managed in Cerply (no directory sync)

**No change needed for UAT** - FSD explicitly allows this deferral

---

## Migration Path

### Phase 1: UAT (Current)
- ✅ Fresh database schema for Module-centric model
- ✅ Reuse existing auth/org infrastructure
- ✅ 3 roles: admin, manager, learner
- ✅ Basic Build → Push → Learn → Track flow
- ✅ Certified catalogue with review (managers act as certifiers)

### Phase 2: Post-UAT (Within 2 weeks)
- 🔲 Add `certifier` and `consultant` roles
- 🔲 Implement approval workflow for consultant-created modules
- 🔲 Fine-grained permissions per role
- 🔲 Enhanced item shapes (arrange steps, label parts, etc.)
- 🔲 Additional dashboard views and filters

### Phase 3: Client-Driven (3-6 months)
- 🔲 Directory sync integration
- 🔲 SSO configuration per client
- 🔲 Email digests for managers
- 🔲 Native mobile apps
- 🔲 Service wrap in-app scheduling

---

## Testing Impact

### Can Test in UAT:
- ✅ Build workspace (3-pane, Chat/Content/Calibration)
- ✅ Prompt-to-Module with quality gates
- ✅ Lock as Company Module
- ✅ Push to teams with mandatory/recommended, quiet hours, daily cap
- ✅ Learner interactions (answer, help, challenge, progress card)
- ✅ Adaptive engine (difficulty adjustment, spaced repetition)
- ✅ Track dashboards (team/person/module views)
- ✅ Certified submission and review (managers acting as certifiers)
- ✅ PDF export with provenance badges
- ✅ Model logs and audit events

### Cannot Fully Test in UAT:
- ❌ Certifier role distinction (managers do both)
- ❌ Consultant handover workflow with approval
- ❌ Role-specific permissions enforcement
- ❌ All item shapes (only basic types implemented)
- ❌ Directory sync
- ❌ Client-specific SSO configuration

---

## Acceptance Criteria Adjustments

### Original FSD Acceptance (Section 1, end)
> "A consultant-created module cannot be locked as a Company Module without an explicit manager approval/certification step."

**UAT Adjustment:**
- Managers create modules directly (no consultant role yet)
- Approval workflow deferred to post-UAT

### Maintained FSD Acceptance:
All other acceptance criteria from FSD sections 1-9 remain as specified:
- ✅ Prompt-to-Module in under 1 hour
- ✅ Quality gates block lock until passed
- ✅ Model orchestration (top model → quality check → fast model)
- ✅ Provenance badges visible in Build and exports
- ✅ No exact repeats unless Compliance Critical
- ✅ Dashboards load under 2 seconds
- ✅ Audit events log all key actions

---

## Changelog

**2025-10-29 - Initial version**
- Documented auth/role deviation (Certifier, Consultant missing)
- Noted partial item shapes implementation
- Confirmed design system alignment (Cursor-inspired)
- Confirmed model orchestration alignment

---

**Document Owner:** Technical Lead  
**Review Frequency:** Weekly during UAT, monthly post-launch  
**Escalation:** CEO for any deviations affecting customer contracts or compliance

