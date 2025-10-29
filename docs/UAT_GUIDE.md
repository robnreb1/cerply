# Cerply V2.0 - UAT Guide

**Version**: 2.0  
**Last Updated**: October 29, 2025  
**Target Audience**: UAT Testers, Product Managers, Stakeholders

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Test Environment Setup](#test-environment-setup)
4. [Test Scenarios](#test-scenarios)
5. [Known Issues](#known-issues)
6. [Reporting Issues](#reporting-issues)

---

## Overview

This guide provides comprehensive test scenarios for Cerply V2.0, covering all major user journeys:
- **Build**: Create and refine learning modules with AI
- **Push**: Assign modules to learners
- **Learn**: Interactive learning experience
- **Track**: Monitor progress and analytics
- **Certified**: Browse and use expert-stamped modules

---

## Prerequisites

### Access Requirements
- **Test Account**: Demo credentials provided by deployment team
- **Browser**: Chrome, Firefox, Safari (latest versions)
- **Network**: Access to staging environment

### Demo Users
The seed data includes these test users:

| Email | Role | Password |
|-------|------|----------|
| `manager@demo.cerply.com` | Manager | `demo2025` |
| `learner1@demo.cerply.com` | Learner | `demo2025` |
| `learner2@demo.cerply.com` | Learner | `demo2025` |

---

## Test Environment Setup

### 1. Access the V2 App
```
URL: https://app-staging.cerply.com/v2
```

### 2. Login
1. Navigate to login page
2. Enter test credentials
3. Verify successful authentication
4. Should land on V2 home page

### 3. Verify Demo Data Loaded
Check that you see:
- 2 company modules (Compliance Training, Product Knowledge)
- 1 certified module (Leadership Essentials)
- Progress data for learners

---

## Test Scenarios

### Scenario 1: Build Workspace - Create New Module

**User**: Manager  
**Objective**: Create a new learning module using AI chat

#### Steps:
1. Navigate to `/v2` home page
2. Click "Build" card
3. **Expected**: 3-pane workspace appears (Chat, Content, Calibration)
4. In Chat pane, type: "Create a module about effective team meetings"
5. Click "Send"
6. **Expected**: AI responds with confirmation, module ID shows in header
7. **Expected**: Content pane populates with sections
8. **Expected**: Calibration pane shows example items at difficulty 5
9. Refine with: "Add a section on virtual meeting best practices"
10. **Expected**: Content updates with new section
11. Move calibration slider to level 8
12. **Expected**: Calibration examples update to show harder questions
13. Click "Lock Module" in Content pane
14. **Expected**: Quality gate runs, shows any issues
15. **Expected**: If passed, module status changes to "Locked"

#### Success Criteria:
- [  ] Chat is responsive and natural
- [  ] Content pane updates in real-time
- [  ] Provenance badges visible on sections
- [  ] Calibration examples match difficulty level
- [  ] Lock flow validates before allowing lock
- [  ] Locked status shows in header

---

### Scenario 2: Build Workspace - Edit Existing Module

**User**: Manager  
**Objective**: Edit an existing draft module

#### Steps:
1. From home, click "Build"
2. Load existing "Product Knowledge" module (draft status)
3. **Expected**: Module content loads in Content pane
4. In Chat: "Make the first section more beginner-friendly"
5. **Expected**: AI revises content with simpler language
6. Verify provenance badges update if sources change
7. Try to lock the module
8. **Expected**: Quality gate checks pass/fail with specific feedback

#### Success Criteria:
- [  ] Draft modules can be loaded and edited
- [  ] Chat refines existing content
- [  ] Provenance reflects content sources
- [  ] Quality gates provide actionable feedback

---

### Scenario 3: Push - Assign Module to Learners

**User**: Manager  
**Objective**: Create a module assignment for specific learners

#### Steps:
1. Navigate to `/v2/push`
2. Click "+ New Assignment"
3. Select "Compliance Training 2025" module
4. Target: Select "learner1@demo.cerply.com" and "learner2@demo.cerply.com"
5. Set as "Mandatory"
6. Set start date to today
7. Enable "Quiet hours" (9PM-7AM)
8. Set daily cap: 5 items
9. Click "Create Assignment"
10. **Expected**: Assignment appears in list with "Active" status

#### Success Criteria:
- [  ] Can select target users from organization
- [  ] Mandatory/Recommended toggle works
- [  ] Scheduling options save correctly
- [  ] Assignment list shows all active assignments
- [  ] Can view assignment details

---

### Scenario 4: Learn - Complete Learning Items

**User**: Learner1  
**Objective**: Complete assigned learning items

#### Steps:
1. Login as `learner1@demo.cerply.com`
2. Navigate to `/v2/learn` (or receive Slack/Teams message)
3. **Expected**: First item from "Compliance Training" appears
4. Answer the multiple-choice question
5. **Expected**: Immediate feedback (✅ or ❌) with explanation
6. Click "Next"
7. **Expected**: Adaptive engine serves next item at appropriate difficulty
8. Click "💡 Help" button
9. **Expected**: Contextual hint appears
10. Answer correctly
11. Click "🔥 Challenge Me"
12. **Expected**: Receives harder question from same topic

#### Success Criteria:
- [  ] Items appear in logical sequence
- [  ] Feedback is immediate and helpful
- [  ] Help provides useful hints without giving answer
- [  ] Challenge serves appropriately harder content
- [  ] Progress updates in real-time

---

### Scenario 5: Learn - Natural Language Commands

**User**: Learner1  
**Objective**: Use conversational commands

#### Steps:
1. In learning session, type "skip this one"
2. **Expected**: Item skipped, next item served
3. Type "I don't understand this topic"
4. **Expected**: Help provided, simpler item offered
5. Type "show my progress"
6. **Expected**: Progress card displays with stats

#### Success Criteria:
- [  ] Natural language commands recognized
- [  ] "Skip", "Help", "Progress" commands work
- [  ] System responds conversationally

---

### Scenario 6: Track - Team Dashboard

**User**: Manager  
**Objective**: View team-level analytics

#### Steps:
1. Navigate to `/v2/track`
2. **Expected**: Team Dashboard view selected by default
3. Review "Mastery by Skill" chart
4. **Expected**: Shows proficiency rates for key skills
5. Check "Active Users" section
6. **Expected**: Lists learners with current streaks
7. Check "At-Risk Users"
8. **Expected**: Identifies learners who need attention
9. Review "Stale Modules"
10. **Expected**: Shows modules needing updates
11. Change date range to "Last 7 days"
12. **Expected**: Dashboard updates with filtered data

#### Success Criteria:
- [  ] All metrics load correctly
- [  ] Data reflects demo seed progress
- [  ] Date range filter works
- [  ] Charts are readable and informative

---

### Scenario 7: Track - Person Dashboard

**User**: Manager  
**Objective**: View individual learner progress

#### Steps:
1. On Track page, click "Person View" tab
2. Enter `learner1@demo.cerply.com` in search
3. Click "Search"
4. **Expected**: Individual dashboard loads
5. Review stats: Current Level, Completion Rate, Streak, Pace
6. **Expected**: Stats match learner's actual progress
7. Check "Areas to Strengthen"
8. **Expected**: Shows topics with low success rates

#### Success Criteria:
- [  ] Search finds learner by email
- [  ] All metrics display correctly
- [  ] Weak areas identified accurately
- [  ] Data matches learner's actual responses

---

### Scenario 8: Track - Module Dashboard

**User**: Manager  
**Objective**: Analyze module performance

#### Steps:
1. Click "Module View" tab
2. Enter module ID for "Compliance Training"
3. **Expected**: Module analytics load
4. Review "Core Freshness" score
5. **Expected**: Shows staleness of content
6. Check "Reach" metrics
7. **Expected**: Shows targeted vs started vs completed
8. Review "Problem Items"
9. **Expected**: Lists items with low success rates
10. **Expected**: Can identify confusing questions

#### Success Criteria:
- [  ] Module search works
- [  ] Freshness score makes sense
- [  ] Reach funnel is clear
- [  ] Problem items accurately identified

---

### Scenario 9: Certified - Browse Catalogue

**User**: Manager  
**Objective**: Find and review certified modules

#### Steps:
1. Navigate to `/v2/certified`
2. **Expected**: Catalogue search page loads
3. Search for "leadership"
4. **Expected**: "Leadership Essentials" module appears
5. **Expected**: Provenance badge shows "Certified Core"
6. **Expected**: Stamp metadata visible (stamped by, date)
7. Click on module card
8. **Expected**: Module details page opens
9. Review content and items
10. **Expected**: Can preview module before cloning

#### Success Criteria:
- [  ] Search returns relevant results
- [  ] Provenance badges accurate
- [  ] Stamp metadata visible
- [  ] Module preview functional

---

### Scenario 10: Certified - Clone and Wrap

**User**: Manager  
**Objective**: Clone certified module and add company-specific wrap

#### Steps:
1. From "Leadership Essentials" detail page
2. Click "Clone to My Organization"
3. **Expected**: Clone dialog appears
4. Add company-specific intro section
5. Add company values to wrap
6. Click "Create Clone"
7. **Expected**: New module created in organization
8. **Expected**: Provenance shows mix of Certified Core + Internal

#### Success Criteria:
- [  ] Clone process smooth
- [  ] Can add custom content (wrap)
- [  ] Provenance reflects both sources
- [  ] Cloned module appears in Build list

---

### Scenario 11: Full Journey - Build → Push → Learn → Track

**User**: Manager + Learner  
**Objective**: Test complete end-to-end workflow

#### Steps:
1. **Manager**: Create new module "Sales Process 101"
2. **Manager**: Lock module after quality gate passes
3. **Manager**: Assign to Learner2 as mandatory
4. **Learner2**: Receive assignment (check Slack/Teams if integrated)
5. **Learner2**: Complete 3 items, answer 2 correctly, 1 incorrectly
6. **Manager**: View Person Dashboard for Learner2
7. **Expected**: Progress reflects 3 completed items, 66% accuracy
8. **Manager**: View Module Dashboard for "Sales Process 101"
9. **Expected**: Reach shows 1 targeted, 1 started, 0 completed

#### Success Criteria:
- [  ] Each stage flows to next
- [  ] Data consistent across all views
- [  ] Real-time updates work
- [  ] No data loss or corruption

---

### Scenario 12: Slack/Teams Integration (if configured)

**User**: Learner  
**Objective**: Receive and respond to items via messaging

#### Steps:
1. **Setup**: Ensure Slack/Teams bot configured
2. **Manager**: Push assignment with Slack/Teams delivery
3. **Learner**: Receive DM from bot
4. **Expected**: Item formatted as Block Kit (Slack) or Adaptive Card (Teams)
5. Click answer button
6. **Expected**: Feedback appears in thread
7. Click "💡 Help"
8. **Expected**: Hint provided in thread
9. Click "Continue Learning" link
10. **Expected**: Opens web app to continue

#### Success Criteria:
- [  ] Messages delivered to correct users
- [  ] Formatting clean and readable
- [  ] Interactive buttons work
- [  ] Feedback immediate
- [  ] Deeplinks work

---

## Known Issues

### TypeScript Compilation Warnings
- **Issue**: Some V2 services have module resolution warnings
- **Impact**: None on runtime functionality
- **Status**: To be resolved in next iteration

### Auth Context
- **Issue**: Development mode uses mock user for V2 routes
- **Impact**: Cannot test multi-user scenarios locally
- **Workaround**: Use staging with real auth
- **Status**: Will implement JWT validation in next sprint

### Provenance Badge Edge Cases
- **Issue**: Mixed-source sections may show only primary provenance
- **Impact**: Minor visual inconsistency
- **Status**: Enhancement planned

---

## Reporting Issues

### Issue Template

```markdown
**Title**: [Brief description]

**Severity**: Critical / High / Medium / Low

**Scenario**: [Which test scenario]

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:

**Actual Behavior**:

**Screenshots**: [If applicable]

**Browser/Device**:

**User Role**:
```

### Where to Report
- **GitHub Issues**: Tag with `[UAT]` and `v2.0`
- **Slack**: `#cerply-v2-uat` channel
- **Email**: uat@cerply.com

---

## UAT Sign-Off Checklist

### Build Workspace
- [  ] Can create new modules via chat
- [  ] Can edit existing modules
- [  ] Calibration pane works
- [  ] Lock flow validates quality
- [  ] Provenance badges accurate

### Push Management
- [  ] Can create assignments
- [  ] Targeting works correctly
- [  ] Scheduling options functional
- [  ] Assignments list accurate

### Learn Experience
- [  ] Items delivered correctly
- [  ] Feedback immediate and helpful
- [  ] Help/Challenge buttons work
- [  ] Natural language commands recognized

### Track Dashboards
- [  ] Team dashboard accurate
- [  ] Person dashboard detailed
- [  ] Module dashboard insightful
- [  ] Date filters work

### Certified Catalogue
- [  ] Search functional
- [  ] Provenance clear
- [  ] Module preview works
- [  ] Clone/wrap process smooth

### Full Journey
- [  ] Build → Push → Learn → Track flows work
- [  ] Data consistency maintained
- [  ] Real-time updates work
- [  ] No critical bugs

---

## Next Steps After UAT

1. **Gather Feedback**: Compile all tester feedback
2. **Prioritize Issues**: Triage by severity
3. **Fix Critical Bugs**: Address blockers before production
4. **Enhancement Backlog**: Log nice-to-haves for future sprints
5. **Production Readiness**: Final checks before go-live

---

**Questions?** Contact the V2 team at `v2-support@cerply.com`

