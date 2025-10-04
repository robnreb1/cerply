# Cerply — Business Requirements (BRD)
Version: v1.2
Status: AUTHORITATIVE — single source of truth for business requirements
Owner: Product (Robert Ford)
Changelog: see History section at bottom

SSOT: This document is the authoritative source for business requirements. Every technical delivery must reference a BRD requirement ID.

## 1) Elevator Pitch
One-liner: What will you master today? Cerply turns any prompt, note, link, or policy into adaptive lessons, quizzes, and spaced reviews. For teams, it produces Certified training packs with audit trails, SLAs, and telemetry.

## 2) Core Benefits
- Learners: bite-size steps, spaced reviews, always a next best item.
- Managers/L&D: certified training packs from internal policies; progress/risk visibility; export to GitHub/Notion/Jira.
- Orgs: faster onboarding & compliance; auditable content lineage; predictable infra & costs.

## 3) Moats
- Certified multi-agent pipeline: reproducible, auditable outputs (planner + two proposals + checker with citation verification -> locked content).
- Trust telemetry: per-item lineage, reviewer sign-off, measurable learning outcomes tied to revisions.
- Infra rigor: header-verified images and non-blocking, label-gated previews with auto-expiry.
- Content network effects: Certified catalog + internal packs become reusable templates & benchmarks.
- GTM wedge: publish 150+ Certified items; bundle Certified + IMA packs in pilots.

## 4) Certification Flavors (Business-facing)
- Highly Rated (organic): community/learner upvotes + outcomes; appears in public recommendations.
- Cerply Certified (multi-LLM curated):
  - Planner (LLM-1) builds scope & structure.
  - Proposers (LLM-2, LLM-3) generate candidates.
  - Checker (LLM-4) validates claims against real, credible citations and flags gaps.
  - Pipeline converges; content is locked with audit trail & metadata.
- Industry Certified (human-in-the-loop): subject-matter expert ratifies content. Primary for corporate/formal training.

## 5) Product Requirements (MVP)
B1. Learning Flow: create project -> ingest brief/source -> plan -> lessons -> quizzes -> spaced review.
B2. Adaptive Learning: flexible adjustments based on progress, strengths, preferences (topical difficulty, format, cadence).
B3. Group Learning: users can push topics to a group and track group stats (org teams, parents, friends).
B4. Certified Pipeline: multi-LLM converge with citations; human ratification for Industry Certified.
  - **Status: COMPLETED** - Certified v1 API endpoints implemented with Ed25519 signing, CDN-ready artifacts, and public verification. See docs/certified/README.md for full API contract and docs/certified/openapi.yaml for OpenAPI specification.
B5. Exports & Sharing: GitHub Issues exporter (repo/label picker), Markdown export, shareable read-only URL.
B6. Access & Pricing:
- Consumers (Free): limited concurrent topics; no access to Certified content.
- Certified Access: All-in subscription or pay-as-you-go.
B7. Platforms:
- **Core:** Web (first) and Desktop (app wrapper) for authoring and learning.
- **Mobile:** iOS/Android apps (consumer & corporate) for adaptive coach delivery and offline sync.
- **Chat Integrations:** Cerply must deliver adaptive coach modules through chat-based channels (Slack, Microsoft Teams, WhatsApp, Telegram, etc.) to enable habit formation (D2C) and seamless push training (D2B).
- **APIs:** Channel-agnostic coach API (`/api/coach/next`) outputs JSON payloads renderable by each channel adapter.
- **Acceptance:** At least one enterprise pilot delivered via chat integration; ≥30% of D2C active learners engage through non-web channels.
- **Verification:** Coach plan retrieved through web and chat adapters shows identical lesson state and telemetry events.
B8. Ops Guarantees: staging & prod available; version endpoint and headers present; previews are label-gated, auto-expire <=48h, never block merges.
B9. Success Metrics: TTFP < 60s; >=80% receive scheduled reviews in week one; >=150 Certified items published; >=3 design partners on Certified + IMA packs.

## 6) Certified v1 Implementation (COMPLETED)

**Epic Status:** ✅ COMPLETED - Deployed to staging and merged to main

**Key Deliverables:**
- **Admin Publish Endpoint:** `POST /api/certified/items/:itemId/publish` with Ed25519 signing and idempotent publishing
- **Public Artifact Endpoints:** `GET /api/certified/artifacts/:artifactId` (JSON) and `GET /api/certified/artifacts/:artifactId.sig` (binary signature)
- **Public Verification:** `POST /api/certified/verify` supporting three verification modes (by ID, inline signature, legacy plan-lock)
- **Plan Generation:** `POST /api/certified/plan` with proper error handling (415/413/429) and feature flag gating

**Technical Achievements:**
- **CDN-Ready Artifacts:** ETag and Cache-Control headers for efficient content delivery
- **Robust CORS:** Permissive `Access-Control-Allow-Origin: *` with credentials removal
- **Database Resilience:** Graceful handling of missing DATABASE_URL with SQLite fallback
- **Container Compatibility:** Fixed Prisma/OpenSSL compatibility for Alpine → Debian migration
- **Security Headers:** Comprehensive security headers (COOP/CORP/XFO) when enabled

**Acceptance Evidence:**
```bash
# Artifact endpoints return proper 404s with CORS headers
curl -sI "https://api-stg.cerply.com/api/certified/artifacts/unknown-id"
# HTTP/2 404, access-control-allow-origin: *

# Verify endpoint handles all three cases correctly
curl -si -X POST "https://api-stg.cerply.com/api/certified/verify" \
  -H 'content-type: application/json' \
  -d '{"artifactId":"does-not-exist"}'
# HTTP/2 404, x-cert-verify-hit: 1
```

**Documentation:**
- Full API contract: `docs/certified/README.md`
- OpenAPI specification: `docs/certified/openapi.yaml`
- Runbook and troubleshooting guides included

B10. Content Freshness & Regulatory Scanning
- Users can upload or paste regulatory/policy documents (PDF/DOCX/text).
- System extracts obligations, deadlines, compliance triggers, and detects changes vs. prior versions.
- Output: structured JSON and UI summary table; highlights new/changed obligations.
- Acceptance: scan completes <90s for <50pp docs; ≥80% precision on obligations (manual eval); change detection works for redlines/prior diffs; API: `POST /api/regscan/scan` always returns structured results.

B11. Adaptive Coach (Pedagogy Engine)
- System adapts learning flow, format, and cadence based on user progress, strengths, and preferences.
- Supports topical difficulty adjustment, spaced repetition, and format switching (text, quiz, scenario).
- Acceptance: at least two adaptive interventions per learner in first week; ≥70% of learners receive a personalized cadence; API: adaptive recommendations accessible per learner.

## 6) Cerply OKRs (v1)

⸻

O1. Be the trusted engine for learning anything, with retention that sticks.
    •    KR1.1: ≥80% of learners complete at least one scheduled review in week one.
    •    KR1.2: ≥60% retention of knowledge items after 30 days (measured via spaced recall).
    •    KR1.3: Time-to-first-plan (TTFP) < 60 seconds from artefact ingestion.
    •    KR1.4: ≥70 median learner satisfaction (NPS-style in-app feedback).

⸻

O2. Establish Cerply Certified as the gold standard for horizontal topics.
    •    KR2.1: ≥150 Certified items published within 6 months.
    •    KR2.2: ≥5 high-value, corporate-relevant domains covered (e.g. compliance, data protection, safety, finance basics, onboarding).
    •    KR2.3: 100% of Certified items have expert ratification + audit trail.
    •    KR2.4: ≥3 design partner orgs adopt Certified packs in pilots.

⸻

O3. Build enterprise-grade adoption and monetization (D2B).
    •    KR3.1: Secure ≥3 paying enterprise pilots by end of quarter.
    •    KR3.2: Convert ≥50% of pilots to paid subscriptions/contracts.
    •    KR3.3: Deliver ≥95% uptime and compliance with enterprise security requirements (SSO, audit logs, headers).
    •    KR3.4: Competitive pricing benchmark: ≥20% lower cost than average LMS pilot alternatives while maintaining margins.

⸻

O4. Leverage consumer use (D2C) as data + funnel, not revenue.
    •    KR4.1: Grow D2C waitlist to ≥5,000 users.
    •    KR4.2: ≥1,000 active weekly consumer learners feeding into insight pipeline.
    •    KR4.3: ≥25% of consumer learners share/export a module (GitHub/Notion/Markdown).
    •    KR4.4: ≥20 Certified topics originate from consumer ingestion patterns.

⸻

O5. Demonstrate defensibility through certification + telemetry.
    •    KR5.1: 100% of Certified items show per-item lineage and citations.
    •    KR5.2: Publish ≥1 external validation study (partner university, design partner audit).
    •    KR5.3: Telemetry dashboard live with daily token use, cost, and retention outcomes.
    •    KR5.4: ≥2 industry associations recognize Cerply Certified content as equivalent to CPD/CE credits.

## Appendix A — GTM (Authoritative Marketing Plan)
Audience: L&D leaders, compliance managers, eng managers.
Motion: content-led (publish Certified), founder demos, design partner pilots.
Channels: site + waitlist, LinkedIn/communities, partner intros, webinars.
Offers: Certified + IMA pack pilot (setup + 30-day success plan).
KPIs: waitlist->demo, demo->pilot, content->inbound, pilot NPS, conversion to paid.

---

## History
- v1.2 (2025-09-19): Consolidated BRD; added certification flavors; adaptive/group learning; pricing; platforms; GTM as appendix.
