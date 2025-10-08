# MVP Traceability Matrix

**Purpose:** Complete mapping of SSOT use cases to implementation evidence across BRD, FSD, and architecture components.

**Generated:** 2025-01-05  
**Last Updated:** 2025-10-08  
**Source:** [docs/specs/mvp-use-cases.md](mvp-use-cases.md)

## Status Legend

- **Implemented** → Must have FSD/BRD links and evidence (CI blocks if missing)
- **In Progress** → Partially implemented, evidence optional (CI warns only)
- **Planned** → Not yet started, no evidence required (CI warns only)
- **Deferred** → Intentionally delayed, no evidence required (CI warns only)
- **Removed (post-pivot)** → Out of scope due to B2B-only pivot (CI warns only, must include rationale + date)

## Coverage Summary

| Persona | Total Items | MVP Items | Implemented | In Progress | Planned | Coverage |
|---------|-------------|-----------|-------------|-------------|---------|----------|
| **All Users** | 4 | 4 | 2 | 1 | 1 | 50% |
| **Learner** | 24 | 24 | 8 | 3 | 13 | 33% |
| **Expert** | 11 | 11 | 1 | 0 | 10 | 9% |
| **Business** | 12 | 12 | 1 | 0 | 11 | 8% |
| **Admin** | 9 | 9 | 3 | 0 | 6 | 33% |
| **TOTAL** | **60** | **60** | **15** | **4** | **41** | **25%** |

## Detailed Matrix

| SSOT ID | Use Case | MVP? | BRD Section(s) | FSD Section(s) | Architecture Component(s) | Status | Tests/Evidence | Notes |
|---------|----------|------|----------------|----------------|---------------------------|--------|----------------|-------|
| **AU-1** | Web only | Yes | B7 | §15 ER-MUI | Web (Next.js), M2 Proxy | Done | `web/app/page.tsx`, `scripts/smoke-stg.sh` | Core web interface implemented |
| **AU-2** | Landing page impactful and clear | Yes | B1, B7 | §15 ER-MUI | Web Landing Page | Done | `web/app/page.tsx`, `web/components/ui/InputAction.tsx` | Enterprise-ready UI implemented |
| **AU-3** | Chat interaction over menus | Yes | B1 | §15 ER-MUI | Web Chat Interface | In Progress | `web/app/page.tsx` | Chat-first design in progress |
| **AU-4** | Direct user-groups to workflows | Yes | B1 | §15 ER-MUI | Web Navigation | Planned | - | User journey mapping needed |
| **L-1** | Prompt, load, link, click for topic | Yes | B1 | §22 M3 API | M3 API Surface, Preview Engine | Done | `api/src/routes/m3.ts`, `api/tests/m3.test.ts` | Preview endpoint implemented |
| **L-2** | Present summary for confirmation | Yes | B1 | §22 M3 API | M3 API Surface, Preview Engine | Done | `api/src/routes/m3.ts`, `POST /api/preview` | Summary generation working |
| **L-3** | Must be logged-in to progress | Yes | B4 | §12 Auth v0 | Auth & Session Management | Done | `api/src/routes/auth.ts`, `docs/functional-spec.md#12` | Anonymous sessions implemented |
| **L-4** | One free Certified topic per month | Yes | B6 | §9 Certified v1 | Certified Pipeline | Planned | - | Subscription limits needed |
| **L-5** | Basic preference details on sign-up | Yes | B1 | §15 ER-MUI | User Profile Management | Planned | - | Profile system needed |
| **L-6** | First interactions on signed-up topic | Yes | B1 | §22 M3 API | M3 API Surface, Study Flow | Done | `web/app/(preview)/certified/study/page.tsx` | Study session implemented |
| **L-7** | Complete ten questions each time | Yes | B1 | §22 M3 API | M3 API Surface, Study Flow | Done | `POST /api/score`, `api/tests/m3.test.ts` | Scoring system implemented |
| **L-8** | Continue for longer if choose | Yes | B1 | §22 M3 API | M3 API Surface | Done | `GET /api/daily/next` | Daily queue implemented |
| **L-9** | Show level for topic (beginner, etc.) | Yes | B2 | §22 M3 API | Adaptive Engine | In Progress | `api/src/routes/m3.ts` | Level tracking in progress |
| **L-10** | View topics and levels, turn on/off | Yes | B1 | §15 ER-MUI | User Dashboard | Planned | - | Topic management UI needed |
| **L-11** | Adapt to level and learning patterns | Yes | B2 | §22 M3 API | Adaptive Engine, SM2-lite | Done | `POST /api/certified/schedule`, `api/scripts/smoke-m3.sh` | Spaced repetition implemented |
| **L-12** | Always provided with explainer | Yes | B1 | §22 M3 API | M3 API Surface | Done | `POST /api/score`, response includes explanations | Feedback system implemented |
| **L-13** | Natural language interaction | Yes | B1 | §15 ER-MUI | Chat Interface | In Progress | `web/components/ui/InputAction.tsx` | Natural language input implemented |
| **L-14** | Time-limit weighting for topics | Yes | B2 | §22 M3 API | Adaptive Engine | Planned | - | Time-based prioritization needed |
| **L-15** | Never same content twice | Yes | B1 | §22 M3 API | M3 API Surface | Done | `POST /api/generate`, deterministic but varied | Content variation implemented |
| **L-16** | Set own time-limits | Yes | B1 | §15 ER-MUI | User Preferences | Planned | - | Time limit controls needed |
| **L-17** | Pay for premium features | Yes | B6 | - | Payment System | Removed (post-pivot) | - | D2C payments removed (B2B-only pivot, 2025-10-08) |
| **L-18** | Fee includes all updates | Yes | B6 | - | Subscription Management | Removed (post-pivot) | - | D2C subscriptions removed (B2B-only pivot, 2025-10-08) |
| **L-19** | 5 certified topics/month (subscription) | Yes | B6 | §9 Certified v1 | Certified Pipeline | Planned | - | Usage limits needed |
| **L-20** | 1 certified topic/month (free) | Yes | B6 | §9 Certified v1 | Certified Pipeline | Planned | - | Free tier limits needed |
| **L-21** | 5 non-certified topics/month (free) | Yes | B6 | §22 M3 API | M3 API Surface | Planned | - | Usage tracking needed |
| **L-22** | Pay in any currency including crypto | Yes | B6 | - | Payment System | Removed (post-pivot) | - | D2C crypto payments removed (B2B-only pivot, 2025-10-08) |
| **L-23** | Wowed by offering for premium tier | Yes | B1 | §15 ER-MUI | User Experience | Planned | - | Premium UX enhancements needed |
| **L-24** | Never left hanging during creation | Yes | B1 | §15 ER-MUI | Progress Feedback | Planned | - | Progress indicators needed |
| **E-1** | Understand paid certification | Yes | B4 | §9 Certified v1 | Expert Onboarding | Planned | - | Expert workflow needed |
| **E-2** | Complete expertise profile | Yes | B4 | §9 Certified v1 | Expert Profile System | Planned | - | Expert profiles needed |
| **E-3** | Name and role cited for topics | Yes | B4 | §9 Certified v1 | Certified Pipeline | Done | `POST /api/certified/items/:itemId/publish` | Expert citation in artifacts |
| **E-4** | Due diligence and rate decision | Yes | B4 | §9 Certified v1 | Expert Management | Planned | - | Expert vetting system needed |
| **E-5** | Enter pre-arranged rate codes | Yes | B4 | §9 Certified v1 | Expert Management | Planned | - | Rate code system needed |
| **E-6** | List of topics requiring certification | Yes | B4 | §9 Certified v1 | Expert Dashboard | Planned | - | Expert queue needed |
| **E-7** | Panel of experts for certification | Yes | B4 | §9 Certified v1 | Expert Collaboration | Planned | - | Multi-expert workflow needed |
| **E-8** | Remain on hand for queries | Yes | B4 | §9 Certified v1 | Expert Support System | Planned | - | Expert query system needed |
| **E-9** | Incremental topic refresh | Yes | B4 | §9 Certified v1 | Content Maintenance | Planned | - | Content update system needed |
| **E-10** | Access profile and statistics | Yes | B4 | §9 Certified v1 | Expert Dashboard | Planned | - | Expert analytics needed |
| **E-11** | Pay in any currency, no margin | Yes | B6 | - | Payment System | Removed (post-pivot) | - | D2C expert payments removed (B2B-only pivot, 2025-10-08) |
| **B-1** | Business owner, COO, L&D manager | Yes | B3 | §15 ER-MUI | Business User Interface | Planned | - | Business dashboard needed |
| **B-2** | Build team within portal | Yes | B3 | §23 Team Mgmt | Team Management | Done | `POST /api/teams`, `api/tests/team-mgmt.test.ts`, `EPIC3_UAT_RESULTS.md` | Team creation implemented (Epic 3) |
| **B-3** | Build topics like Learner, validate like Expert | Yes | B3 | §22 M3 API | Business Content Creation | Planned | - | Business content workflow needed |
| **B-4** | Cursor-type interface for content refinement | Yes | B3 | §15 ER-MUI | Business Content Editor | Planned | - | Business content editor needed |
| **B-5** | Guardrails around adaptive learning | Yes | B3 | §22 M3 API | Business Policy Engine | Planned | - | Business policy controls needed |
| **B-6** | Push topics to teams with timeframes | Yes | B3 | §23 Team Mgmt | Team Assignment System | Done | `POST /api/teams/:id/subscriptions`, `api/tests/team-mgmt.test.ts`, `EPIC3_UAT_RESULTS.md` | Team track subscriptions with cadence (Epic 3) |
| **B-7** | Establish reminder channels | Yes | B3 | - | Notification System | Planned | - | Notification system needed |
| **B-8** | Review team statistics | Yes | B3 | §23 Team Mgmt | Business Analytics | Done | `GET /api/teams/:id/overview`, `GET /api/ops/kpis`, `EPIC3_UAT_RESULTS.md` | Team overview and KPIs (Epic 3) |
| **B-9** | £100 per user per year | Yes | B6 | - | Pricing System | Removed (post-pivot) | - | D2C pricing model removed (B2B-only pivot, 2025-10-08) |
| **B-10** | Access lost when subscription ends | Yes | B6 | - | Subscription Management | Removed (post-pivot) | - | D2C subscription enforcement removed (B2B-only pivot, 2025-10-08) |
| **B-11** | 2-week guarantee for market changes | Yes | B6 | - | Content Update SLA | Removed (post-pivot) | - | D2C content SLA removed (B2B-only pivot, 2025-10-08) |
| **B-12** | Request accelerated certified topics | Yes | B6 | §9 Certified v1 | Certified Pipeline | Planned | - | Priority certification needed |
| **A-1** | Full write access to all areas | Yes | B8 | §9 Certified v1 | Admin Access Control | Done | `POST /api/certified/items/:itemId/publish` | Admin endpoints implemented |
| **A-2** | View all logs of changes (immutable) | Yes | B8 | - | Audit System | Planned | - | Audit logging needed |
| **A-3** | Manually add users to groups | Yes | B8 | - | User Management | Planned | - | Admin user management needed |
| **A-4** | Stats screens for all components | Yes | B8 | - | Admin Dashboard | Planned | - | Admin analytics needed |
| **A-5** | Analyse granular learning habits | Yes | B8 | - | Analytics System | Planned | - | Detailed analytics needed |
| **A-6** | Tweak prompts across interactions | Yes | B8 | - | Prompt Management | Planned | - | Admin prompt editing needed |
| **A-7** | Size-bound certified topics | Yes | B4 | §9 Certified v1 | Certified Pipeline | Done | `docs/certified/README.md` | Topic sizing guidelines implemented |
| **A-8** | Interim-certified status for net-new topics | Yes | B4 | §9 Certified v1 | Certified Pipeline | Done | `POST /api/certified/plan` | Interim certification implemented |
| **A-9** | Suggest blend of Certified and interim-certified | Yes | B4 | §9 Certified v1 | Content Recommendation | Planned | - | Content recommendation engine needed |

## Implementation Evidence

### Completed Components

1. **M3 API Surface** (L-1, L-2, L-6, L-7, L-8, L-11, L-12, L-15)
   - **Files:** `api/src/routes/m3.ts`, `api/tests/m3.test.ts`
   - **Tests:** `api/scripts/smoke-m3.sh` (31/31 assertions)
   - **Evidence:** `EPIC_M3_API_SURFACE.md`, `STAGING_TEST_REPORT.md`

2. **Certified v1 Pipeline** (E-3, A-7, A-8)
   - **Files:** `api/src/routes/certified.ts`, `docs/certified/README.md`
   - **Tests:** `api/scripts/smoke-m3.sh`
   - **Evidence:** `docs/functional-spec.md#9`, `docs/brd/cerply-brd.md#6`

3. **Auth & Session Management** (L-3)
   - **Files:** `api/src/routes/auth.ts`
   - **Tests:** Auth endpoints in smoke tests
   - **Evidence:** `docs/functional-spec.md#12`

4. **Web UI Foundation** (AU-1, AU-2)
   - **Files:** `web/app/page.tsx`, `web/components/ui/InputAction.tsx`
   - **Tests:** `scripts/smoke-stg.sh`
   - **Evidence:** `docs/functional-spec.md#15`

5. **Admin Access Control** (A-1)
   - **Files:** `POST /api/certified/items/:itemId/publish`
   - **Tests:** Admin endpoint tests
   - **Evidence:** `docs/functional-spec.md#9`

### In Progress Components

1. **Chat Interface** (AU-3, L-13)
   - **Files:** `web/components/ui/InputAction.tsx`
   - **Status:** Natural language input implemented, full chat flow in progress

2. **Adaptive Level Tracking** (L-9)
   - **Files:** `api/src/routes/m3.ts`
   - **Status:** Basic level tracking, full adaptive engine needed

### Architecture Components

- **Web (Next.js, M2 Proxy):** AU-1, AU-2, AU-3, L-13, B-1, B-4
- **API (Fastify):** L-1, L-2, L-3, L-6, L-7, L-8, L-11, L-12, L-15, E-3, A-1, A-7, A-8
- **Certified v1 Pipeline:** E-3, A-7, A-8
- **Retention Engine (SM2-lite):** L-11
- **M3 API Surface:** L-1, L-2, L-6, L-7, L-8, L-11, L-12, L-15
- **Auth & Session:** L-3
- **Storage/Prisma:** All components (foundation)
- **CI/CD:** All components (deployment)
- **Observability:** All components (monitoring)

## Next Priority Items

### High Priority (Next Sprint)
1. **L-10:** Topic management UI
2. **L-5:** User profile system
3. **B-1:** Business dashboard
4. **A-2:** Audit logging system

### Medium Priority
1. **L-4, L-19, L-20, L-21:** Subscription and usage limits
2. **E-1, E-2, E-4:** Expert onboarding workflow
3. **B-3, B-4:** Business content creation tools
4. **A-4, A-5:** Admin analytics and dashboards

### Low Priority
1. **L-17, L-18, L-22:** Payment system integration
2. **B-6, B-7:** Team management and notifications
3. **E-5 through E-11:** Advanced expert features
4. **B-8 through B-12:** Advanced business features

## Notes

- **Total MVP Items:** 60 (all current items are MVP)
- **Beyond MVP items:** 0 (all post-MVP items moved to separate tracking)
- **Coverage:** 25% of MVP items have implementation evidence
- **Focus Areas:** Learning flow (M3) and Certified pipeline are most complete
- **Gaps:** Expert workflow, Business features, and advanced Learner features need significant development
