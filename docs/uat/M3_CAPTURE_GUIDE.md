# M3 UAT - Screen Capture Guide

**Purpose:** Help testers capture high-quality screenshots and recordings during UAT.

---

## 📸 Screenshot Checklist

### Required Screenshots

For each scenario in `M3_UAT_SCRIPT.md`, capture:

1. **Scenario 1: Initial State**
   - Filename: `01-initial-state.png`
   - Content: Full page with UAT banner visible

2. **Scenario 2: Schedule API**
   - Filename: `02-schedule-network.png`
   - Content: DevTools Network tab showing schedule API call + response
   - Additional: `02-scheduled-cards.png` showing card interface

3. **Scenario 3: Flip Card**
   - Filename: `03-card-flipped.png`
   - Content: Card showing answer with grade buttons visible

4. **Scenario 4: Grade Card**
   - Filename: `04-graded-next-card.png`
   - Content: Next card after grading (progress bar updated)

5. **Scenario 5: Resume Session**
   - Filename: `05-resume-message.png`
   - Content: "Loaded X previous progress items" message

6. **Scenario 6: Complete Session**
   - Filename: `06-session-complete.png`
   - Content: "Session complete!" message with 100% progress

7. **Scenario 7: Progress Snapshot**
   - Filename: `07-progress-snapshot.png`
   - Content: Progress snapshot box displayed

### Optional Screenshots

- Console errors (if any): `error-console-[scenario].png`
- Network failures (if any): `error-network-[scenario].png`
- Mobile views: `mobile-[scenario].png`

---

## 🎥 Screen Recording

### Recommended Tools

| Platform | Tool | Free? | Notes |
|----------|------|-------|-------|
| macOS | **QuickTime** | ✅ | Built-in: File → New Screen Recording |
| macOS | **Loom** | ✅ | Easy sharing, 5min limit on free |
| Windows | **Xbox Game Bar** | ✅ | Win+G to start |
| Chrome | **DevTools Recorder** | ✅ | DevTools → Recorder tab |
| Cross-platform | **OBS Studio** | ✅ | Professional, more complex |

### Recording Checklist

**What to Record:**
1. Full walkthrough (Scenario 1-7) in one take (5-10 minutes)
2. Focus on user interactions + API calls in DevTools

**Before Starting:**
- [ ] Close unnecessary tabs/windows
- [ ] Set browser zoom to 100%
- [ ] Open DevTools (Network tab visible)
- [ ] Clear browser console
- [ ] Position window: DevTools on right, page on left

**During Recording:**
- [ ] Speak out loud what you're testing
- [ ] Pause briefly after each action (1-2 seconds)
- [ ] Call out any errors or unexpected behavior
- [ ] Show network requests completing

**After Recording:**
- [ ] Upload to Loom or save to `docs/uat/recordings/`
- [ ] Add link to `M3_UAT_FEEDBACK.md`

---

## 🖼️ Screenshot Guidelines

### Quality Standards

- **Resolution:** Minimum 1920x1080 for desktop
- **Format:** PNG (for clarity) or JPG (for smaller size)
- **Crop:** Include relevant context, avoid excessive whitespace
- **Annotations:** Use arrows/boxes to highlight issues (optional)

### Tools for Annotation

| Platform | Tool | Free? |
|----------|------|-------|
| macOS | **Preview** | ✅ |
| macOS | **CleanShot X** | 💰 |
| Windows | **Snipping Tool** | ✅ |
| Chrome | **Awesome Screenshot** | ✅ |
| Cross-platform | **Flameshot** | ✅ |

### Annotation Best Practices

- Use **red arrows** → to point to errors
- Use **green checkmarks** ✅ to confirm correct behavior
- Use **yellow boxes** ⬜ to highlight areas of interest
- Add text labels for clarity

---

## 📂 File Organization

### Directory Structure

```
docs/uat/
├── screenshots/
│   ├── 01-initial-state.png
│   ├── 02-schedule-network.png
│   ├── 03-card-flipped.png
│   └── ... (one per scenario)
├── recordings/
│   └── full-walkthrough-2025-10-06.mp4
├── logs/
│   ├── console-2025-10-06.txt
│   └── network-2025-10-06.har
└── M3_UAT_FEEDBACK.md (reference these files)
```

### Naming Convention

**Screenshots:**  
`[scenario-number]-[description]-[variant?].png`

Examples:
- `02-schedule-network.png`
- `03-card-flipped-mobile.png`
- `error-console-scenario4.png`

**Recordings:**  
`[type]-[date]-[tester-initials?].mp4`

Examples:
- `full-walkthrough-2025-10-06-rf.mp4`
- `bug-grade-button-2025-10-06.mp4`

---

## 🔍 DevTools Capture Techniques

### Capturing Network Tab

1. Open DevTools (F12 or Cmd+Option+I)
2. Go to **Network** tab
3. Filter by: **Fetch/XHR**
4. Right-click on request → **Copy** → **Copy as cURL** (save for reproduction)
5. Screenshot: Show request + response preview

### Capturing Console Errors

1. Open DevTools → **Console** tab
2. Right-click in console → **Save as...** → `console-[date].txt`
3. Screenshot: Show error stack trace clearly

### Capturing Full Network HAR

1. DevTools → **Network** tab
2. Reproduce the scenario
3. Right-click anywhere in Network panel → **Save all as HAR with content**
4. Save to: `docs/uat/logs/network-[date].har`
5. **⚠️ Warning:** HAR files contain request bodies - don't include sensitive data!

---

## 🎬 Quick Recording Workflow

### macOS QuickTime

1. Open **QuickTime Player**
2. File → **New Screen Recording**
3. Click **Options** → Set microphone (if narrating)
4. Click red record button
5. Click browser window to start
6. **⌘+Control+Esc** to stop
7. File → **Export As** → 1080p → Save

### Loom (Cross-platform)

1. Install Loom extension: https://www.loom.com/download
2. Click Loom icon in toolbar
3. Select: **Screen + Cam** (or just Screen)
4. Choose browser tab to record
5. Click **Start Recording**
6. **Pause/Stop** when done
7. Get shareable link instantly

### Chrome DevTools Recorder

1. DevTools → **Recorder** tab (may need to enable in settings)
2. Click **Create a new recording**
3. Name: "M3 UAT - [Scenario]"
4. Click **Start recording**
5. Perform actions in page
6. **End recording**
7. **Export** → JSON or HAR format

---

## ✅ Final Checklist

Before submitting UAT feedback, confirm:

- [ ] All 7 required screenshots captured
- [ ] Full walkthrough video recorded (or key scenarios)
- [ ] Screenshots saved to `docs/uat/screenshots/`
- [ ] Video uploaded to Loom or saved locally
- [ ] Console logs saved if errors occurred
- [ ] Network HAR saved if API issues occurred
- [ ] File names follow naming convention
- [ ] Links/paths added to `M3_UAT_FEEDBACK.md`

---

## 🆘 Troubleshooting

**Problem:** Screenshot tool cuts off DevTools  
**Solution:** Use full-screen capture, then crop in editor

**Problem:** Video file too large  
**Solution:** Use Loom (auto-uploads) or compress with Handbrake

**Problem:** Can't capture DevTools and page together  
**Solution:** Use **Responsive Design Mode** (Cmd+Option+M) or dock DevTools to side

**Problem:** Forgot to record a scenario  
**Solution:** Just record that one scenario separately and note in filename

---

## 📞 Need Help?

- **Technical issues:** Open GitHub issue with label `m3-uat-support`
- **Tool recommendations:** Ask in Slack #uat-testing
- **File sharing:** Upload to Google Drive if files are too large for GitHub

---

**Last Updated:** 2025-10-06  
**Version:** 1.0  
**Maintained by:** Engineering Team

