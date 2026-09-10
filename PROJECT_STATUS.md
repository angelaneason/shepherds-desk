# 📖 The Shepherd's Desk — Project Status & Master Roadmap

> **Single Source of Truth** for Angela, Octo, and AI Pair Programmers.  
> *Last Updated: September 10, 2026*

---

## 🧭 Project Quick Reference

| Attribute | Details |
| :--- | :--- |
| **Product Name** | The Shepherd's Desk |
| **Tagline** | *From Monday's ministry to Sunday's message.* |
| **Web Production URL** | [https://theshepherdsdesk.app](https://theshepherdsdesk.app) |
| **Web Repository** | `https://github.com/angelaneason/shepherds-desk` (`master` branch) |
| **Mobile Repository** | `https://github.com/angelaneason/shepherds-desk-mobile` (`main` branch) |
| **Hosting & CI/CD** | Vercel (Web), Local Gradle / EAS (Mobile) |
| **Database & Auth** | Supabase (`https://yyghygvyzpqzvxnjyqlb.supabase.co`) |
| **AI Integration** | Google Gemini API (`gemini-3.6-flash`) |
| **Email Delivery** | Resend API |
| **Apple App Store ID** | `6808595831` • Bundle: `com.theshepherdsdesk.app` |
| **Google Play Package** | `com.theshepherdsdesk.app` |

---

## 🚦 Live Store & Platform Status

### 🍎 Apple App Store (iOS)
* **Current Status:** `🟡 Waiting for Review` (Re-submitted Sept 10, 2026)
* **Target Version in Review:** `1.0` (Build `2.1.3 (2)`)
* **Review Console:** [App Store Connect — The Shepherd's Desk](https://appstoreconnect.apple.com/apps/6808595831/appstore)
* **Recent Resolution:** Resolved Guideline 2.1 info request regarding religious book/concordance content by unchecking China mainland territory in App Availability.
* **Next Step on Approval:** Once approved and live in App Store, submit the updated `v2.1.4 (Build 10)` featuring the Communication Hub & expanded Settings.

---

### 🤖 Google Play Store (Android)
* **Current Alpha / Closed Testing Track:** `v2.1.3` (Version Code `7`) — 177 testers
* **Latest Production Bundle Built:** `v2.1.4` (Version Code `10`)
* **Bundle Location:** `ShepherdsDesk-v2.1.4-build10.aab` (root workspace)
* **Play Console:** [Google Play Console — Closed Testing (Alpha)](https://play.google.com/console)
* **Next Step:** Upload `ShepherdsDesk-v2.1.4-build10.aab` to Closed Testing Alpha track to upgrade testers from build 7 to 10.

---

### 🌐 Direct Web & APK Distribution
* **Web App:** Live on Vercel (`master` branch)
* **Direct Android APK Download:** [https://theshepherdsdesk.app/download](https://theshepherdsdesk.app/download)
* **Hosted APK File:** `https://theshepherdsdesk.app/shepherds-desk-v2.1.4.apk` (v2.1.4 Build 10)

---

## ✅ Completed Milestones (What Was Done)

### 1. Communication Hub & Group Texting
- [x] Renamed "Announcements" to **"Communication"** across both web sidebar and mobile navigation.
- [x] Built dual-tab interface:
  - **Church Announcements:** Category badges (General, Event, Prayer, Volunteer, Celebration, Urgent), expiry dates, active/inactive toggling, clipboard copy.
  - **Group Text Broadcast:** Target audience filters (Active Members, All Directory, Visitors), contact selection checklist, message presets, AI message drafting, live character & SMS segment counter, native SMS launcher.
- [x] Mobile dashboard quick shortcut: Added `[💬 Group Text]` button directly on the pastor's home screen.

### 2. Mobile App Polish & Feature Parity
- [x] **Branding:** Replaced plain text top bar with official transparent logo in mobile dashboard header, drawer navigation, and loading splash screen.
- [x] **Settings Screen Parity:**
  - Subscription & Trial countdown badge with plan upgrade link.
  - Church Branding & Accent Color theme selector.
  - Sacred Study Time preferences (weekly hours stepper `+/-` and reminders).
  - Calendar Sync feed (`.ics` subscription link for Apple Calendar, Google Calendar, Outlook).
  - Data & Privacy (export ministry records, account deletion).
  - "Powered by Tiny Tech" official footer link.
- [x] Verified mobile TypeScript compilation (0 errors) and built release APK + AAB locally.

### 3. Pastoral Gift Subscription Package
- [x] **Public Gifting Studio (`/gift`):** 1-Year ($149) and 6-Month ($79) prepaid packages with live certificate preview.
- [x] **Printable Certificate (`/gift/certificate/[code]`):** High-res gold-bordered formal certificate with scripture dedication and 1-click print/PDF styling.
- [x] **Gift Redemption Portal (`/gift/redeem`):** Verification and claim flow that extends pastor's subscription without asking for a credit card.
- [x] **Automated Emails:** Giver receipts and pastor blessing notifications sent via Resend.
- [x] **Marketing Placements:** Added to `/welcome` page hero and Pastor Appreciation banners.

### 4. Core Pastoral Workflow Features
- [x] **Sermon Builder:** Rich text editor, Scripture concordance, Strong's Greek/Hebrew definitions, sermon series grouping, status pipeline (Draft → Review → Ready → Preached), and Fullscreen Pulpit Mode.
- [x] **Sacred Study Time:** Focus timer (Pomodoro & custom), weekly study hours tracker, auto-logging to calendar.
- [x] **Ministry Care CRM:** Follow-ups & hospital visits, Church Members directory, and Prayer Requests pipeline.
- [x] **Idea Capture:** Quick jotting with tags (`[Sermon Idea]`, `[Quote]`, `[Prayer]`), promote idea directly to new sermon draft.
- [x] **Community & Counseling Resources:** Categorized pastoral counseling guides and community emergency hotlines.

---

## 📋 What Needs To Be Done (Upcoming & Backlog)

### 🔴 Immediate (In Progress)
- [ ] **Monitor Apple App Store Approval:** Await Apple's response on the `2.1.3 (2)` resubmission following the China mainland territory update.
- [ ] **Upload Google Play Alpha Release:** Upload `ShepherdsDesk-v2.1.4-build10.aab` to Google Play Console Alpha track.
- [ ] **Deploy iOS v2.1.4 Build 10:** Once initial review approves `1.0 (2.1.3)`, submit the v2.1.4 build containing Communication Hub and full settings parity.

### 🟡 Near-Term Enhancements
- [ ] **In-App Messaging / Push Notifications:** Set up Expo push notifications on mobile for scheduled care reminders and study session alerts.
- [ ] **SMS Broadcast Delivery Service:** Optional Twilio integration for sending group texts directly from the cloud (in addition to native phone SMS).
- [ ] **Offline Sync on Mobile:** Enhance offline caching for sermon notes and member directories in low-connectivity areas.

---

## 🐙 Octo Requirements Checklist
*(Everything Octo needs to autonomously track, manage, and make this project functional for someone else)*

To allow Octo (and any human or AI agent) to manage Shepherd's Desk without friction, the following standards are maintained:

1. **Standardized Status File (`PROJECT_STATUS.md`):**
   - Kept up to date at the root of the repository after every major feature or store milestone.
2. **Centralized Service IDs & URLs:**
   - Apple App ID (`6808595831`), Google Package (`com.theshepherdsdesk.app`), Supabase project ref, and production URLs are documented directly in this file so Octo can populate dashboards automatically.
3. **Consistent Release Versioning:**
   - Always increment `versionCode` (Android) and `buildNumber` (iOS) monotonically with every build.
   - Match version strings across `app.json`, `build.gradle`, and the UI Settings screen.
4. **Clean Git Commit Standards:**
   - Use conventional commits (`feat:`, `fix:`, `chore:`) to allow Octo to generate automatic changelogs.
5. **No Secret Keys in Git:**
   - All credentials remain strictly in `.env.local` or Supabase secrets; `PROJECT_STATUS.md` contains only public IDs and URLs.
6. **Task Handoff Ready:**
   - Every backlog item contains clear context so Octo can generate prompt cards directly for Antigravity, ChatGPT, or Claude.
