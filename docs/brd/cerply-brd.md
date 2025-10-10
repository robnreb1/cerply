# MVP Use Cases
> **Pivot note:** Cerply has pivoted from consumer to B2B SaaS focus. All use cases below are scoped for MVP and post-pivot strategy.
> **Update (2025-10-10):** Aligned MVP with B2B strategy: Slack prioritized for channel delivery (WhatsApp Phase 2); ensemble content generation with 3-LLM pipeline for quality; gamification with levels/certificates/badges; conversational learning interface; true adaptive difficulty engine; consumer payments removed; Certified positioned as horizontal with expert panels; manager-centric curation and analytics emphasised.

## All users
AU-1. Web app plus at least one channel integration for delivery (Slack for MVP, WhatsApp Phase 2, Teams Phase 3).
AU-2. Users can access core learning flows: ingest, plan, learn, quiz, review.
AU-3. Multi-device sync and offline support for lessons and quizzes.
AU-4. User telemetry collected for progress, retention, and engagement.

### Beyond MVP
- Extended channels — WhatsApp (Phase 2), Microsoft Teams (Phase 3), Calendar, Telegram, and email digests.
- Multi-channel preferences: Primary + fallback channel configuration.
- Scheduled delivery: Daily/weekly cadence based on track subscription.
- Voice input for conversational interface.
- Mobile app with offline mode.
- Social features: share achievements, challenge friends.
- Personalized learning paths based on career goals.
- Integration with personal calendar for scheduled learning.

## Learner
L-1. Learners can create and join projects with assigned topics.
L-2. Learners receive truly adaptive lesson plans with dynamic difficulty adjustment (4 levels: Recall, Application, Analysis, Synthesis) based on real-time performance signals (correctness, response latency, confusion queries, spaced recall). System detects learning style (visual/verbal/kinesthetic) and adjusts content format accordingly. Weak topics (comprehension < 70%) automatically receive reinforcement.
L-3. Learner must be logged-in via enterprise single sign-on (SSO) to progress, otherwise Cerply can't adapt or ensure they remember over the long term.
L-5. Learners can flag confusing items and request clarifications.
L-6. Learners get spaced reviews based on forgetting curves.
L-7. They are prompted to complete short sets by default (10 items is the starting point), but progress is always tracked so finishing early is fine and managers can change the cadence.
L-8. Learners can export notes and progress reports.
L-9. Learners can participate in group challenges and competitions.
L-10. Learners can share feedback on content quality and difficulty.
L-11. Learners can request new topics or content updates. Cerply continues to refresh knowledge indefinitely while a topic remains active, so nothing important is forgotten.
L-12. Learner interacts via conversational interface (chat panel, Cmd+K shortcut) with natural language queries: "How am I doing?", "What's next?", "I don't understand this answer". System uses intent router to classify queries (progress/next/explanation/filter/help) and responds intelligently. Free-text answers encouraged over multiple choice wherever possible, with NLP validation and partial credit ("Close, but X is more accurate because..."). Confusion queries tracked to adjust adaptive difficulty.
L-13. Learners can bookmark items for later review.
L-14. Learners can access a glossary of key terms.
L-15. Learners receive notifications and reminders.
L-16. Learners progress through 5 levels per track (Novice → Learner → Practitioner → Expert → Master) based on correct attempts. Upon track completion, learners automatically receive downloadable PDF certificate with Ed25519 signature for verification. Learners unlock badges for achievements (Speed Demon, Perfectionist, 7-day Consistent, Knowledge Sharer, Lifelong Learner). Level-ups and certificate earnings trigger celebration UI and manager email notifications. Learners can query progress conversationally ("How am I doing?", "When will I complete this track?").
L-17. Learners can configure preferred delivery channel (Slack, web, email fallback) and set quiet hours to avoid notifications during specific times (e.g., "22:00-07:00"). Learners can pause and resume notifications as needed. Channel preferences stored per user with verification status.
L-18. Learners can answer questions using free-text input instead of multiple choice. System validates answers using NLP and LLM, accepts partial credit, and provides constructive feedback. Multiple choice reserved only for yes/no or categorical questions where free-text doesn't make sense.

## Expert
E-1. Experts can create and ratify Certified content.
E-2. Experts can review and approve topic plans.
E-3. Experts can monitor learner feedback and update content.
E-4. Experts can collaborate on panels for content curation.
E-5. Experts can provide rationale and citations for claims.
E-6. Experts can manage audit trails and sign-offs.
E-7. Experts can access analytics on content usage and outcomes.
E-8. Experts can participate in workshops and training sessions.
E-9. Experts can contribute to certification standards.
E-10. Experts can suggest new domains and topics.
E-11. Expert workflows are integrated with Cerply's Certified pipeline.
E-12. Certified topics are primarily horizontal (usable across firms), with adapters allowed for company-specific nuances and interpretations.
E-13. Panels are formed from recognised names in the field (not limited to regulatory experts) to increase trust and adoption.
E-14. Experts can review content generation provenance when certifying modules. System displays which LLMs contributed to content (Generator A, Generator B, Fact-Checker), confidence scores, and manager refinement history. Expert reviews for factual accuracy, pedagogical soundness, and brand alignment. Upon approval, expert's Ed25519 signature permanently attached to content with immutable audit trail (reviewer identity, timestamp, rationale, citations).

### Beyond MVP
- Expert collaboration tools for real-time content editing and versioning.
- Integration with external knowledge bases and standards bodies.
- Advanced provenance analytics: LLM contribution patterns, quality trends.

## Business
B-1. Businesses can create teams and assign topics.
B-2. Managers can track team progress and risk metrics.
B-3. Businesses can customize content for internal policies. Managers upload artefacts (documents, transcripts, policies) and receive LLM playback of understanding ("I understand this covers X, Y, Z"). Manager confirms or refines iteratively (max 3 rounds) until approved. System then triggers 3-LLM ensemble generation: Generator A and Generator B independently create content, then Fact-Checker LLM verifies accuracy, removes fluff, and selects best elements from both. Manager reviews generated content with provenance transparency (which LLM contributed each section) and can regenerate specific modules. Content tagged as generic (industry-standard, reusable across orgs) or proprietary (company-specific, never shared). Generic content stored in canon for cost-efficient reuse.
B-3.1. Managers can request learning content on any topic without uploading documents by typing topic requests like "Teach me complex numbers" or "Explain async/await". System automatically detects research mode (vs source transformation) and uses 3-LLM ensemble to research the topic: Understanding model extracts topic, domain, key concepts, and learning objectives. Generator A (technical focus) and Generator B (practical focus) independently research and create comprehensive modules with citations from credible sources (textbooks, papers, courses). Fact-Checker validates factual accuracy, citation credibility, and ethical concerns, then synthesizes the best content from both generators. Output includes 4-6 validated modules with sources, provenance tracking, and confidence scores. Cost: ~$0.20 per topic. Enables rapid catalog scaling: $100 investment generates 500 high-quality topics without requiring source documents. **Implementation:** Epic 6.5 (Research-Driven Content Generation) — Delivered 2025-10-10
B-4. Managers can schedule training cadences.
B-5. Businesses can export reports for compliance audits.
B-6. Businesses can integrate Cerply with HR and LMS systems.
B-7. They can establish channels by which Learners are reminded—Slack for MVP (OAuth 2.0 integration with interactive Block Kit buttons for immediate response feedback)—with WhatsApp (Phase 2) and Microsoft Teams (Phase 3) planned next. Organization admins configure workspace-level channel integrations. Learners set individual channel preferences including quiet hours and pause/resume. Email fallback automatically activates if channel delivery fails.
B-8. Businesses can manage user roles and permissions.
B-9. Businesses can access API endpoints for data integration.
B-10. Managers can request expert workshops and certification sessions.
B-11. Businesses can monitor usage and license consumption.
B-12. Managers can configure content approval workflows.
B-13. Managers can request certification or panel workshops on strategic topics; outputs become Certified modules their teams can consume.
B-14. Managers and leaders can track comprehension, retention, and risk at team and individual levels with simple rollups for reviews.
B-15. Managers receive real-time email notifications when team members achieve milestones: level-up (e.g., Practitioner → Expert), earn certificates (track completion), or unlock badges. Notification preferences configurable (immediate, daily digest, weekly summary, or off). Daily digest example: "3 team members leveled up this week, 2 earned certificates". Managers can view notification center in dashboard with unread count and mark-as-read functionality.

### Beyond MVP
- Advanced analytics dashboards for business KPIs.
- Integration with enterprise identity providers and SSO.
- Automated compliance reporting and alerts.
- Multi-channel orchestration: Smart routing based on learner availability.
- Scheduled content delivery: Daily/weekly cadence automation.
- WhatsApp Business API integration (Phase 2).
- Microsoft Teams Bot Framework integration (Phase 3).
- Custom badge creation and criteria.
- Advanced learning analytics: Predictive at-risk scoring.
- Content marketplace: Share proprietary content across departments.

## Admin / Cerply
A-1. Admins can manage user accounts and subscriptions.
A-2. Admins can oversee content publishing workflows.
A-3. Admins can monitor system health and telemetry.
A-4. Admins can manage API keys and integrations.
A-5. Admins can configure platform-wide settings.
A-6. Admins can manage billing and payments.
A-7. Admins can moderate community feedback and issues.
A-8. Admins can generate operational reports.
A-9. Admins can support customer success and onboarding.
A-10. Operate the Certified program and partner workshops: schedule panels, capture audit trails (signatures, rationale, citations), and publish updates to client libraries.

### Beyond MVP
- Admin tools for managing multi-tenant deployments.
- Automated content quality assurance and monitoring.

## Out of scope post-pivot (B2B-only)

### Consumer Payments & Billing (Removed)
- **L-4** — Learner is offered one free Cerply Certified topic per month
- **L-19** — Learner is limited to 5 certified topics per month on the subscription.
- **L-20** — Learner is limited to 1 certified topic per month on the free plan.
- **L-21** — Learner is limited to 5 non-certified topics per month on the free plan.
- **L-23** — Cerply must ensure Learner is wowed by the offering in order to drive them to, and maintain them in, the premium tier.

### Other Removed Use Cases
- L-17. Learners can transfer credits between accounts.
- L-18. Learners can gift topics to peers.
- L-22. Learners can participate in public leaderboards.
- E-11. Experts can monetize content contributions.
- B-9. Businesses can manage multiple billing accounts.
- B-10. Businesses can offer consumer subscriptions.
- B-11. Businesses can create multi-tier pricing plans.

### Other Out of Scope
- Consumer social features (friends, sharing).
- Consumer-facing marketing and onboarding flows.
- Public-facing content marketplaces.
