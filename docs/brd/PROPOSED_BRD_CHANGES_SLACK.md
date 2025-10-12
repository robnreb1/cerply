# Proposed BRD Changes: Slack Channel Integration

**Date:** 2025-10-10  
**Epic:** Epic 5 - Slack Channel Integration  
**Status:** Proposed (Awaiting Approval)

---

## Summary

This document proposes updates to the Business Requirements Document (BRD) to reflect the prioritization of **Slack** as the MVP channel integration, replacing the previously mentioned WhatsApp focus. Rationale: Slack offers the fastest integration path (30 mins setup vs 1-3 days), free developer tier, and native webhook support ideal for B2B enterprise customers.

---

## Proposed Changes to `docs/brd/cerply-brd.md`

### 1. Update AU-1 (All Users)

**Current:**
```markdown
AU-1. Web app plus at least one channel integration for delivery (WhatsApp for MVP demo).
```

**Proposed:**
```markdown
AU-1. Web app plus at least one channel integration for delivery (Slack for MVP, WhatsApp and Teams post-MVP).
```

**Rationale:** Slack is the fastest path to MVP for B2B customers who already use Slack for team communication. WhatsApp remains important for hospitality/retail sectors (Phase 2).

---

### 2. Update "Beyond MVP" Section (All Users)

**Current:**
```markdown
### Beyond MVP
- Extended channels — Slack, Microsoft Teams, Calendar, Telegram, and email digests (WhatsApp is part of MVP).
```

**Proposed:**
```markdown
### Beyond MVP
- Extended channels — WhatsApp (Phase 2), Microsoft Teams (Phase 3), Calendar, Telegram, and email digests.
- Multi-channel preferences: Primary + fallback channel configuration.
- Scheduled delivery: Daily/weekly cadence based on track subscription.
```

**Rationale:** Clarify the phased rollout and add multi-channel preferences as a post-MVP enhancement.

---

### 3. Update B-7 (Business Requirements)

**Current:**
```markdown
B-7. They can establish channels by which Learners are reminded—WhatsApp for MVP—with Slack and Microsoft Teams planned next.
```

**Proposed:**
```markdown
B-7. They can establish channels by which Learners are reminded—Slack for MVP (OAuth 2.0 integration with interactive Block Kit buttons)—with WhatsApp and Microsoft Teams planned for Phase 2/3. Learners can configure channel preferences including quiet hours and pause/resume.
```

**Rationale:** Be explicit about Slack as MVP and add details about learner control over notifications.

---

### 4. Add New Use Case: L-17 (Learner Channel Preferences)

**Proposed Addition (after L-16):**
```markdown
L-17. Learners can configure their preferred delivery channel (Slack, web, email fallback) and set quiet hours to avoid notifications during specific times (e.g., "22:00-07:00"). They can pause and resume notifications as needed.
```

**Rationale:** Channel preferences are a core part of the learner experience and should be explicitly captured in the BRD.

---

### 5. Update "Pivot Note" at Top

**Current:**
```markdown
> **Update (2025-10-09):** Aligned MVP use cases with B2B pitch deck: WhatsApp delivery included in MVP; consumer payments and quotas removed; Certified positioned as horizontal with expert panels; manager-centric curation and analytics emphasised.
```

**Proposed:**
```markdown
> **Update (2025-10-10):** Aligned MVP channel strategy: Slack prioritized for MVP (fastest B2B integration), WhatsApp and Teams planned for Phase 2/3; consumer payments and quotas removed; Certified positioned as horizontal with expert panels; manager-centric curation and analytics emphasised.
```

**Rationale:** Keep the pivot note current with latest strategic decisions.

---

### 6. Add Technical Details Section (Optional)

**Proposed New Section (after use cases):**

```markdown
## Channel Integration Architecture

### Slack Integration (MVP)
- **OAuth 2.0**: Organizations install Cerply Slack app via OAuth flow
- **Scopes Required**: `chat:write`, `users:read`, `im:write`, `im:history`
- **Message Format**: Block Kit with interactive buttons for multiple choice questions
- **Response Handling**: Webhook receivers for button clicks and text messages
- **Signature Verification**: Validate `x-slack-signature` header for security
- **Rate Limiting**: Respect Slack's 1 message/second per user limit
- **Fallback**: Email delivery if Slack message fails

### WhatsApp Integration (Phase 2)
- **Provider**: Twilio WhatsApp Business API
- **Message Format**: Text with button options or free-text input
- **Response Handling**: Twilio webhook with NLP for free-text answers
- **Cost**: ~$0.005-$0.015 per message (varies by country)
- **Setup Time**: 2-3 days (number verification, business profile approval)

### Teams Integration (Phase 3)
- **Provider**: Microsoft Bot Framework + Azure Bot Service
- **Message Format**: Adaptive Cards with action buttons
- **Response Handling**: Bot Framework activity handlers
- **Setup Time**: 1-2 days (Azure AD app registration, manifest upload)
- **Auth**: Azure AD tenant integration

### Email Fallback (All Channels)
- **Trigger**: Any channel delivery failure (uninstalled app, network error, rate limit)
- **Format**: HTML email with embedded answer buttons (link to web)
- **Provider**: SendGrid or AWS SES
- **Tracking**: Open rates, click rates, response rates
```

**Rationale:** Provide technical stakeholders with implementation details and trade-offs for each channel.

---

## Summary of Changes

| Section | Type | Rationale |
|---------|------|-----------|
| AU-1 | **Update** | Slack is MVP channel (not WhatsApp) |
| Beyond MVP | **Update** | Clarify phased rollout |
| B-7 | **Update** | Detail Slack integration, add learner controls |
| L-17 | **New** | Capture channel preference requirements |
| Pivot Note | **Update** | Reflect latest strategy |
| Technical Details | **Optional Addition** | Implementation guidance |

---

## Business Justification

### Why Slack First?

1. **Fastest Time-to-Value**: 6-8 hours implementation vs 12-16 hours for WhatsApp
2. **Zero Cost**: Free developer tier vs $5-15/month per WhatsApp number
3. **B2B Alignment**: 75% of knowledge workers use Slack daily (vs 40% WhatsApp Business)
4. **Enterprise Trust**: OAuth 2.0 integration familiar to IT departments
5. **Rich Interactions**: Block Kit buttons > WhatsApp limited button support
6. **Testing**: Instant workspace setup vs phone number verification delays

### Phase 2/3 Strategy

- **WhatsApp (Phase 2)**: Target hospitality, retail, healthcare sectors where WhatsApp is primary communication tool
- **Teams (Phase 3)**: Target Fortune 500 enterprises with Microsoft 365 deployments
- **Email (Always)**: Universal fallback for all channels

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Customers expect WhatsApp in demos | Position Slack as "day 1 integration" with WhatsApp "coming Q2 2025" |
| Slack has lower penetration in some industries | Lead with web UI, position Slack as "optional add-on" |
| Multi-channel complexity deferred | Design API with channel abstraction layer (easy to add channels later) |

---

## Next Steps

1. **Approve this document** (sign-off from Product Owner)
2. **Update `docs/brd/cerply-brd.md`** with approved changes
3. **Proceed with Epic 5 implementation** (Slack integration)
4. **Update pitch deck** to reflect Slack-first messaging
5. **Plan Phase 2** (WhatsApp) for post-MVP

---

**Approval:**
- [ ] Product Owner: __________  
- [ ] Engineering Lead: __________  
- [ ] Date: __________


