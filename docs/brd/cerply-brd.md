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
B5. Exports & Sharing: GitHub Issues exporter (repo/label picker), Markdown export, shareable read-only URL.
B6. Access & Pricing:
- Consumers (Free): limited concurrent topics; no access to Certified content.
- Certified Access: All-in subscription or pay-as-you-go.
B7. Platforms: Web first; iOS/Android (consumer & corporate) planned; corporate apps aligned to enterprise security.
B8. Ops Guarantees: staging & prod available; version endpoint and headers present; previews are label-gated, auto-expire <=48h, never block merges.
B9. Success Metrics: TTFP < 60s; >=80% receive scheduled reviews in week one; >=150 Certified items published; >=3 design partners on Certified + IMA packs.

## Appendix A — GTM (Authoritative Marketing Plan)
Audience: L&D leaders, compliance managers, eng managers.
Motion: content-led (publish Certified), founder demos, design partner pilots.
Channels: site + waitlist, LinkedIn/communities, partner intros, webinars.
Offers: Certified + IMA pack pilot (setup + 30-day success plan).
KPIs: waitlist->demo, demo->pilot, content->inbound, pilot NPS, conversion to paid.

---

## History
- v1.2 (2025-09-19): Consolidated BRD; added certification flavors; adaptive/group learning; pricing; platforms; GTM as appendix.
