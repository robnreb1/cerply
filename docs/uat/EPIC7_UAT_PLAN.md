# Epic 7: Gamification & Certification System - UAT Plan

**Date:** 2025-10-10  
**Epic:** Epic 7 - Gamification & Certification System  
**Priority:** P1 (Learner Engagement & Trust)

## Overview

This UAT plan validates the implementation of the gamification and certification system designed to increase learner completion rates from 30-40% to 60-80% through progression levels, achievement badges, verified certificates, and manager notifications.

## Prerequisites

### Environment Setup
- API running locally or on staging with Epic 7 feature flags enabled
- Database migrated to include Epic 7 tables
- Test user accounts with different roles (learner, manager, admin)
- At least one track with learning content

### Feature Flags Required
```bash
FF_GAMIFICATION_V1=true
FF_CERTIFICATES_V1=true
FF_MANAGER_NOTIFICATIONS_V1=true
```

### Test Data
- **Test Learner:** user-learner-1@test.com
- **Test Manager:** user-manager-1@test.com
- **Test Track:** Fire Safety Fundamentals (track-001)

## UAT Scenarios

### Scenario 1: Learner Progression Tracking

**User Story:** As a learner, I want to see my level increase as I answer questions correctly, so that I feel a sense of progression.

**Steps:**
1. Log in as test learner
2. Start a learning session on "Fire Safety Fundamentals" track
3. Answer 5 questions correctly
4. Check current level: `GET /api/learners/{userId}/level/{trackId}`
5. Continue answering questions (total 25 correct)
6. Check level again - should have progressed from 'novice' to 'learner'

**Expected Results:**
- Initial level: 'novice' (0-20 correct attempts)
- After 25 correct: 'learner' level
- API returns `nextLevel` and `attemptsToNext` fields
- Level progression is accurate based on thresholds

**Acceptance:**
- [ ] Level calculated correctly at each stage
- [ ] Level persists across sessions
- [ ] Progress toward next level displayed accurately

---

### Scenario 2: Badge Unlocking

**User Story:** As a learner, I want to unlock badges for specific achievements, so that I'm motivated to explore different learning behaviors.

**Steps:**
1. Log in as test learner
2. Answer 10 questions correctly, each in under 5 seconds
3. Check badges: `GET /api/learners/{userId}/badges`
4. Verify "Speed Demon" badge is awarded
5. Answer 20 questions correctly in a row (no mistakes)
6. Check badges again - should see "Perfectionist" badge

**Expected Results:**
- Badges endpoint returns earned badges with:
  - Badge name, description, icon (emoji)
  - Earned timestamp
  - Total badges count and remaining count
- Speed Demon unlocked after speed criteria met
- Perfectionist unlocked after streak criteria met

**Acceptance:**
- [ ] Speed Demon badge awarded correctly
- [ ] Perfectionist badge awarded correctly
- [ ] Badges appear with correct metadata
- [ ] Badge criteria documented and working

---

### Scenario 3: Certificate Generation

**User Story:** As a learner, I want to receive a certificate when I complete a track, so that I have verifiable proof of my learning.

**Steps:**
1. Log in as test learner
2. Complete all items in "Fire Safety Fundamentals" track
3. System automatically generates certificate
4. Check certificates: `GET /api/learners/{userId}/certificates`
5. Download certificate PDF: `GET /api/certificates/{certId}/download`
6. Verify certificate contains:
   - Learner name
   - Track title
   - Issue date
   - Organization name
   - Certificate ID
   - Verification URL

**Expected Results:**
- Certificate auto-generated on track completion
- Certificate includes Ed25519 signature (mock for MVP)
- PDF downloads successfully
- Verification URL provided

**Acceptance:**
- [ ] Certificate created on track completion
- [ ] PDF downloadable with correct content
- [ ] Certificate ID and signature present
- [ ] Verification URL accessible

---

### Scenario 4: Manager Notifications

**User Story:** As a manager, I want to be notified when my team members achieve milestones, so that I can celebrate their progress.

**Steps:**
1. Set up: Assign test learner to test manager's team
2. Test learner levels up from 'novice' to 'learner'
3. Log in as test manager
4. Check notifications: `GET /api/manager/notifications`
5. Verify notification contains:
   - Learner name
   - Event type: 'level_up'
   - Previous and new level
   - Timestamp
6. Mark notification as read: `PATCH /api/manager/notifications/{notifId}`
7. Verify notification marked as read

**Expected Results:**
- Notification created when learner levels up
- Notification appears in manager's dashboard
- Notification includes all relevant details
- Mark-as-read functionality works
- Unread count updates correctly

**Acceptance:**
- [ ] Level-up notification created
- [ ] Manager can view notifications
- [ ] Notification content is accurate
- [ ] Mark-as-read works
- [ ] Unread count accurate

---

### Scenario 5: Level Thresholds Validation

**User Story:** System validates correct level thresholds as specified.

**Steps:**
1. Create test user with known correct attempt counts
2. Test each threshold:
   - 0-20 attempts → 'novice'
   - 21-50 attempts → 'learner'
   - 51-100 attempts → 'practitioner'
   - 101-200 attempts → 'expert'
   - 201+ attempts → 'master'
3. Use API to verify level calculation for each range
4. Test boundary conditions (20, 21, 50, 51, etc.)

**Expected Results:**
- Level calculation matches specification
- Boundary values handled correctly
- No off-by-one errors

**Acceptance:**
- [ ] All 5 levels calculate correctly
- [ ] Boundary values correct
- [ ] Progress to next level accurate

---

### Scenario 6: Certificate Verification

**User Story:** External parties can verify certificate authenticity.

**Steps:**
1. Generate certificate for test learner
2. Get certificate ID and signature from API
3. Verify certificate: `GET /api/certificates/{certId}/verify` (if implemented)
4. Try with invalid certificate ID
5. Try with tampered signature

**Expected Results:**
- Valid certificate verifies successfully
- Invalid ID returns 404 or verification failure
- Tampered signature detected
- For MVP: Basic verification (signature comparison)
- For production: Ed25519 cryptographic verification

**Acceptance:**
- [ ] Valid certificates verify
- [ ] Invalid certificates rejected
- [ ] Verification endpoint accessible

---

### Scenario 7: Multiple Tracks Progression

**User Story:** Learners can progress independently on multiple tracks.

**Steps:**
1. Log in as test learner
2. Start learning on Track A: "Fire Safety"
3. Complete 30 correct attempts (reach 'learner' level)
4. Start learning on Track B: "Data Protection"
5. Complete 10 correct attempts (remain 'novice')
6. Check levels for both tracks: `GET /api/learners/{userId}/levels`

**Expected Results:**
- Each track has independent level tracking
- Track A shows 'learner' level
- Track B shows 'novice' level
- Levels endpoint returns all tracks for user

**Acceptance:**
- [ ] Multiple tracks tracked independently
- [ ] Levels don't interfere across tracks
- [ ] All levels endpoint returns complete data

---

### Scenario 8: Badge Detection Timing

**User Story:** Badges are detected and awarded at the right time.

**Steps:**
1. Answer 9 questions correctly in under 5 seconds each
2. Check badges - Speed Demon should NOT be awarded
3. Answer 10th question correctly in under 5 seconds
4. Check badges immediately - Speed Demon SHOULD be awarded

**Expected Results:**
- Badge detection runs after each attempt or periodically
- Badge awarded as soon as criteria met
- No duplicate awards for same badge

**Acceptance:**
- [ ] Badge detection triggered correctly
- [ ] Badges awarded at right threshold
- [ ] No duplicate badge awards

---

## Regression Tests

### Existing Functionality
- [ ] Learner can still complete learning sessions without gamification
- [ ] Manager analytics still work (Epic 4)
- [ ] Team management still works (Epic 3)
- [ ] SSO authentication unaffected (Epic 2)

### Performance
- [ ] Level calculation doesn't slow down attempt submission
- [ ] Badge detection doesn't impact user experience
- [ ] Notification creation doesn't block learner actions

### Security
- [ ] Learners can only view own levels, badges, certificates
- [ ] Managers can only view notifications for their team members
- [ ] Admin token required for test endpoints
- [ ] RBAC enforced on all gamification endpoints

---

## Known Limitations (MVP)

1. **Certificate Signatures:** Using mock signatures instead of real Ed25519 (dependencies not installed)
2. **PDF Generation:** Using text-based mock PDFs instead of formatted PDFKit output
3. **Email Notifications:** Mock email sending (no SendGrid key configured)
4. **Daily/Weekly Digests:** Not implemented in MVP (Phase 5.5 deferred)
5. **Badge: Knowledge Sharer:** Requires shares tracking not yet implemented

---

## Success Criteria

### Must Have (P0)
- [x] Database migration runs without errors
- [x] All 5 gamification tables created
- [x] Level calculation service works correctly
- [x] API routes return valid responses
- [x] RBAC enforced on all endpoints
- [ ] At least 3 badges can be earned
- [ ] Manager notifications created on level-up
- [ ] Smoke tests pass

### Should Have (P1)
- [ ] Certificate PDF generation works (even if mock)
- [ ] All 5 badge types functional
- [ ] Email notifications sent (even if mock)
- [ ] Error handling robust

### Nice to Have (P2)
- [ ] Real Ed25519 certificate signing
- [ ] Formatted PDF certificates with PDFKit
- [ ] SendGrid email integration
- [ ] Daily/weekly digest emails
- [ ] Level-up celebration UI animation

---

## Sign-off

### Development Team
- [ ] All critical paths tested
- [ ] Known issues documented
- [ ] Dependencies noted for future installation

### Product Owner
- [ ] UAT scenarios completed successfully
- [ ] Acceptance criteria met
- [ ] Ready for staging deployment

### Stakeholders
- [ ] Demo reviewed
- [ ] Feature aligns with Epic 7 goals
- [ ] Approved for production rollout

---

## Next Steps

1. **Install Dependencies:**
   ```bash
   cd api
   npm install pdfkit @types/pdfkit @noble/ed25519 node-cron @types/node-cron
   ```

2. **Update Services:**
   - Replace mock certificate signing with real Ed25519
   - Replace mock PDF generation with PDFKit
   - Configure SendGrid for email notifications

3. **Run Database Migration:**
   ```bash
   cd api
   npm run db:migrate
   # or manually: psql < drizzle/010_gamification.sql
   ```

4. **Enable Feature Flags:**
   ```bash
   # In api/.env
   FF_GAMIFICATION_V1=true
   FF_CERTIFICATES_V1=true
   FF_MANAGER_NOTIFICATIONS_V1=true
   ```

5. **Run Smoke Tests:**
   ```bash
   cd api
   bash scripts/smoke-gamification.sh
   ```

6. **Deploy to Staging:**
   - Merge Epic 7 branch to staging
   - Run UAT scenarios on staging environment
   - Gather stakeholder feedback

7. **Production Rollout:**
   - Complete P0 and P1 requirements
   - Install production dependencies
   - Configure production email service
   - Deploy with feature flags (gradual rollout)

---

**UAT Status:** Ready for Testing  
**Last Updated:** 2025-10-10  
**Epic:** Epic 7 - Gamification & Certification System

