# HotCol HR + Employee ESS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase A (OTP portal, `hotcol-emp` ESS shell, unified notifications, Apex toggles, biometric code gated by switch) then Phase B+ PRD slices; use the feature catalog below to lock Manager-approval flows before coding those features.

**Architecture:** Approach 1 — `hotcol-user` GraphQL for staff HR; `hotcol-emp` GraphQL for employee OTP/ESS; `hotcol` Apex for café `hrSoloManagerEnabled` + `hrBiometricsEnabled`; shared MySQL. Notifications are one channel (bell). OTP hire preview → HR only; OTP reset → Manager approve → Manager preview only; first login forces PIN change and clears preview.

**Tech Stack:** Next.js (user/emp/apex), GraphQL + Prisma/MySQL (`hr_employee`, `tenant_account`), JWT sessions, HotCol UI (sidebar, bell, sonner, InputOTP), bcrypt/argon for OTP hash.

**Spec:** `docs/superpowers/specs/2026-09-25-hotcol-hr-ess-design.md`

## Global Constraints

- UI label **HR Manager** for credential role `HR`; do not invent a fourth desk role string unless migrating carefully.
- Notifications only — no separate Announcement product or UI copy.
- Default employee OTP charset: `A–Z` + `0–9`, length 6 (e.g. `AB1234`); store hash; plaintext preview only while `portalOtpViewer` allows.
- Café: Apex toggles mirror `waiterOrderingEnabled` pattern on `tenant_account`.
- Biometrics: implement code; runtime only when `hrBiometricsEnabled === true`; otherwise HR manual clock in/out.
- Emp API always scopes by JWT `employeeId` + tenant.
- Polish both `hotcol-user` and `hotcol-emp` to match HotCol patterns.
- Plan covers PRD backlog; implement A → test → B slices.

---

## Part 0 — Feature catalog & Manager approval matrix

**How to use:** For each row, set **Your decision** to `YES` (Manager must approve via notification bell → portal action), `NO` (HR or system acts; notify recipients if needed), or `N/A`.  
**Proposed** is a starting recommendation from current HotCol behavior + design spec — edit freely before Phase A/B coding of that feature.

| ID | Feature | Phase | App | Proposed | Your decision | Notes |
|----|---------|-------|-----|----------|---------------|-------|
| F01 | Create / update employee (non-salary) | A | user | NO | | |
| F02 | Hire complete → issue portal OTP | A | user | NO | | HR sees OTP until first login |
| F03 | Employee first login + force change OTP | A | emp | N/A | | System gate |
| F04 | OTP reset request | A | user | YES | | **Spec-locked:** HR requests → Manager approves |
| F05 | OTP reset reject | A | user | N/A | | Manager action |
| F06 | Terminate employee | A/B | user | NO | | Soft terminate; consider YES if you want Manager gate |
| F07 | HR sends notification to employee(s) | A | user | NO | | Direct notify employees |
| F08 | Leave request (HR files for employee) | A | user | NO | | Creates pending leave |
| F09 | Leave approve / reject | A | user | YES | | Already Manager/Admin in `hrCapabilities` |
| F10 | Employee self leave request | A | emp | NO | | Creates pending; Manager still F09 |
| F11 | Manual clock in/out by HR | A | user | NO | | Default when biometrics off |
| F12 | Attendance correction by HR | A | user | NO | | Propose YES if you want audit gate |
| F13 | Create / delete shift | A | user | NO | | |
| F14 | Leave types / departments / incident types config | A | user | NO | | Manager/Admin config today |
| F15 | Record incident | A | user | NO | | |
| F16 | Document metadata create/delete | A | user | NO | | |
| F17 | Open payroll period / generate payslips | A | user | NO | | HR runs payroll |
| F18 | Mark payslips paid | A | user | NO | | HR marks |
| F19 | Approve payroll payment | A | user | YES | | Already Manager/Admin |
| F20 | Payroll line rules / wage windows config | A | user | NO | | Manager/Admin config |
| F21 | Apex: solo HR Manager toggle | A | apex | N/A | | Apex only |
| F22 | Apex: HR biometrics toggle | A | apex | N/A | | Apex only |
| F23 | Biometric device enroll / sync | A | user | NO | | Only when F22 on |
| F24 | Employee edit own profile (photo) | A | emp | NO | | Allowlisted fields |
| F25 | Employee view own payslip | A | emp | N/A | | Read-only |
| F26 | Excel employee import | B | user | NO | | Validate then insert |
| F27 | Extend profile (gender, education, TIN…) | B | user | NO | | |
| F28 | Salary change (baseSalaryETB) | B | user | YES | | Propose Manager approve + salary history |
| F29 | Statutory tax/pension rule publish | B | user | YES | | Sensitive finance |
| F30 | Salary advance request | B | user/emp | YES | | |
| F31 | Loan create | B | user | YES | | |
| F32 | Bonus / incentive payout | B | user | YES | | |
| F33 | Shift template / publish roster | B | user | NO | | Propose YES for “publish” only |
| F34 | Overtime request | B | user/emp | YES | | |
| F35 | Document vault upload + expiry | B | user | NO | | |
| F36 | Onboarding checklist complete | B | user | NO | | |
| F37 | Exit clearance complete | B | user | YES | | Multi-dept sensitive |
| F38 | Promotion / transfer | B | user | YES | | |
| F39 | Formal disciplinary action | B | user | YES | | |
| F40 | Vacancy / hire from ATS | B | user | YES | | Offer stage |
| F41 | Performance review finalize | B | user | YES | | |
| F42 | Training assign | B | user | NO | | |
| F43 | Staff meal / housing / transport assign | B | user | NO | | |
| F44 | Asset issue / return | B | user | NO | | Exit clearance may YES via F37 |
| F45 | Export payroll bank file | B | user | YES | | Finance-sensitive |
| F46 | Post payroll to Finance module | B | user | YES | | |

**Phase A approval implement now (from Proposed until you change the table):** F04, F09, F19.  
**After you edit “Your decision”, update this section and Task 0 checklist before coding any YES feature.**

---

## File map (Phase A)

| Path | Responsibility |
|------|----------------|
| `hotcol-user/BackEnd/prisma/schema.prisma` | Extend `hr_employee` OTP fields; `hr_otp_reset_request`; `hr_notification`; `tenant_account.hrSoloManagerEnabled`, `hrBiometricsEnabled`; biometric stub models |
| `hotcol-user/BackEnd/hrPortalOtp.js` | Generate/normalize/validate alphanumeric OTP; hash/verify; issue hire OTP; clear preview on first login |
| `hotcol-user/BackEnd/hrNotifications.js` | Create/list/mark-read notifications; kinds + href helpers |
| `hotcol-user/BackEnd/hrGraphql.js` | Wire OTP issue/reset/approve; notification queries/mutations; biometric stubs gated by tenant flag |
| `hotcol-user/BackEnd/index.js` | Export new typeDefs/resolvers |
| `hotcol-user/lib/hrCapabilities.ts` | Keep Manager approve leave/payroll; HR Manager labeling helpers |
| `hotcol-user/components/hr/*` | Hire OTP reveal, reset request UI, Manager approval panel, notification bell integration, HR Manager label |
| `hotcol-user/lib/hrNotifications.ts` | Client helpers for bell (mirror inventory pattern) |
| `hotcol-emp/BackEnd/` | GraphQL server (pattern from `hotcol-room`): `employeeGraphql.js`, `lib/employeeAuth.js`, prisma client to shared DB |
| `hotcol-emp/app/*` | Login OTP, force change PIN, home, ESS panels, notification bell |
| `hotcol/…` (Apex) | Modules UI toggles for `hrSoloManagerEnabled` + `hrBiometricsEnabled` on café HR Module tenants |
| `hotcol-user/BackEnd/hrBiometric*.js` | Device adapter stubs; no-op unless tenant flag on |

Sync schema: after `hotcol-user` Prisma migrate, refresh `hotcol-emp/BackEnd/prisma/schema.prisma` (shared DB) the same way room shares lodging models.

---

## Part 1 — Phase A tasks

### Task 0: Lock approval matrix

**Files:**
- Modify: `docs/superpowers/plans/2026-09-25-hotcol-hr-ess-implementation.md` (this file, Part 0 table)

- [ ] **Step 1:** Fill **Your decision** for F01–F46 (at least F01–F25 for Phase A).
- [ ] **Step 2:** Confirm Phase A YES set (default F04, F09, F19 unless changed).
- [ ] **Step 3:** Commit matrix decisions.

```bash
git add docs/superpowers/plans/2026-09-25-hotcol-hr-ess-implementation.md
git commit -m "docs: lock HR Manager-approval matrix for Phase A/B"
```

---

### Task 1: Prisma — OTP, reset request, notifications, Apex flags

**Files:**
- Modify: `hotcol-user/BackEnd/prisma/schema.prisma` (`hr_employee` ~1445, `tenant_account` ~220)
- Create models: `hr_otp_reset_request`, `hr_notification`, optional `hr_biometric_device`

**Interfaces:**
- Produces: columns on `hr_employee`: `portalOtpHash String @default("")`, `portalOtpPreview String @default("")`, `portalOtpViewer String @default("none")`, `mustChangeOtp Boolean @default(false)`, `portalOtpIssuedAt DateTime?`, `portalFirstLoginAt DateTime?`, `profileImageUrl String @default("")`
- Produces: `tenant_account.hrSoloManagerEnabled Boolean @default(false)`, `hrBiometricsEnabled Boolean @default(false)`

- [ ] **Step 1:** Add fields/models to `schema.prisma` (mirror naming of existing `hr_*` models).
- [ ] **Step 2:** Run migrate in `hotcol-user/BackEnd`:

```bash
cd BackEnd
npx prisma migrate dev --name hr_portal_otp_notifications_flags
```

Expected: migration applied; client generated.

- [ ] **Step 3:** Copy/sync relevant models into `hotcol-emp/BackEnd/prisma/schema.prisma` and regenerate emp Prisma client.
- [ ] **Step 4:** Commit.

```bash
git add BackEnd/prisma
git commit -m "feat(hr): schema for portal OTP, notifications, Apex HR flags"
```

---

### Task 2: OTP helper library (alphanumeric)

**Files:**
- Create: `hotcol-user/BackEnd/hrPortalOtp.js`
- Test: `hotcol-user/BackEnd/hrPortalOtp.test.js` (or project’s existing test runner; if none, add a small node assert script `BackEnd/scripts/test-hr-portal-otp.mjs`)

**Interfaces:**
- Produces:
  - `normalizePortalOtp(raw: string): string`
  - `isValidPortalOtpFormat(otp: string): boolean` — length 6, charset `[A-Za-z0-9]` (case-normalize to upper)
  - `generatePortalOtp(): string` — prefer mix letters+digits
  - `hashPortalOtp(otp: string): Promise<string>`
  - `verifyPortalOtp(otp: string, hash: string): Promise<boolean>`
  - `clearOtpPreview(employee):` sets preview `""`, viewer `none`

- [ ] **Step 1:** Write failing tests for generate/normalize/validate/hash-verify.
- [ ] **Step 2:** Run tests — expect FAIL (module missing).
- [ ] **Step 3:** Implement `hrPortalOtp.js` (bcrypt cost same family as other HotCol password hashes).
- [ ] **Step 4:** Run tests — expect PASS.
- [ ] **Step 5:** Commit.

```bash
git add BackEnd/hrPortalOtp.js BackEnd/scripts/test-hr-portal-otp.mjs
git commit -m "feat(hr): alphanumeric portal OTP helpers"
```

---

### Task 3: Notifications helper + GraphQL (staff)

**Files:**
- Create: `hotcol-user/BackEnd/hrNotifications.js`
- Modify: `hotcol-user/BackEnd/hrGraphql.js`
- Modify: `hotcol-user/BackEnd/index.js`

**Interfaces:**
- Produces mutations/queries:
  - `hrNotifications: [HrNotification!]!`
  - `markHrNotificationRead(id: Int!): HrNotification!`
  - `createHrEmployeeNotification(employeeIds: [Int!]!, title: String!, body: String!, href: String): [HrNotification!]!`
  - kinds include `otp_reset_pending`, `otp_reset_decided`, `hr_message`, `leave_pending` (reuse existing leave where applicable)
- Produces: `createHrNotification(prisma, { HotelName, recipientRole?, employeeId?, kind, title, body, href, actionStatus? })`

- [ ] **Step 1:** Add Prisma-backed create/list/markRead helpers.
- [ ] **Step 2:** Wire typeDefs + resolvers in `hrGraphql.js` / `index.js` following existing HR patterns.
- [ ] **Step 3:** Manual GraphQL smoke: create notification for Manager role; list as Manager.
- [ ] **Step 4:** Commit.

```bash
git add BackEnd/hrNotifications.js BackEnd/hrGraphql.js BackEnd/index.js
git commit -m "feat(hr): unified HR notifications GraphQL"
```

---

### Task 4: Hire OTP issue + reset/approve GraphQL

**Files:**
- Modify: `hotcol-user/BackEnd/hrGraphql.js` (`createHrEmployee` / new `completeHrHirePortalAccess`, `requestHrOtpReset`, `decideHrOtpReset`)
- Modify: `hotcol-user/lib/api/hr.ts`
- Modify: `hotcol-user/components/hr/HrEmployeesPanel.tsx`

**Interfaces:**
- Produces:
  - On hire/activate portal: set hash, preview, `portalOtpViewer="HR"`, `mustChangeOtp=true`; return preview **only** to HR/Admin acting as HR.
  - `requestHrOtpReset(employeeId: Int!): HrOtpResetRequest!` — creates pending row + Manager notification (`kind=otp_reset_pending`, href to approval UI).
  - `decideHrOtpReset(id: Int!, approve: Boolean!): HrOtpResetRequest!` — Manager/Admin only; on approve mint OTP, viewer=`Manager`, return preview to Manager only; notify HR of decision without OTP plaintext.

- [ ] **Step 1:** Implement issue-on-hire (or explicit “Enable portal access” action if hire already created the row).
- [ ] **Step 2:** Implement reset request + decide; enforce viewer rules on any field that returns `portalOtpPreview`.
- [ ] **Step 3:** UI: show OTP dialog to HR after enable; Reset button; Manager approval panel reachable from bell href.
- [ ] **Step 4:** Manual test: hire preview → fake first-login clear via emp API later; reset path Manager-only preview.
- [ ] **Step 5:** Commit.

```bash
git add BackEnd/hrGraphql.js lib/api/hr.ts components/hr
git commit -m "feat(hr): hire OTP issue and Manager-approved OTP reset"
```

---

### Task 5: HR Manager label + café solo-HR + biometrics flags (Apex + user)

**Files:**
- Modify: `hotcol-user/BackEnd/prisma/schema.prisma` (flags already in Task 1)
- Modify: Apex `hotcol` modules/tenant UI (locate waiter ordering toggle; clone for HR Module café)
- Modify: `hotcol-user/lib/hrCapabilities.ts`, `components/hr/HrDashboard.tsx`, credential grant UI labels
- Modify: GraphQL tenant snapshot to expose `hrSoloManagerEnabled`, `hrBiometricsEnabled`

**Interfaces:**
- Produces: when café + HR Module + `hrSoloManagerEnabled=false` → Admin hosts HR (current Admin path); when true → require/grant HR role for HR ops.
- Produces: `hrBiometricsEnabled` read in attendance resolvers.

- [ ] **Step 1:** Apex UI toggles next to waiter ordering pattern for HR-subscribed cafés.
- [ ] **Step 2:** Wire flags into tenant subscription snapshot APIs used by `hotcol-user`.
- [ ] **Step 3:** Replace user-visible “HR” strings with “HR Manager” in HR chrome/nav.
- [ ] **Step 4:** Commit in respective repos.

---

### Task 6: Biometric adapter (implemented, gated)

**Files:**
- Create: `hotcol-user/BackEnd/hrBiometricGateway.js`
- Modify: `hotcol-user/BackEnd/hrGraphql.js` attendance mutations
- Modify: `hotcol-user/components/hr/HrAttendancePanel.tsx`

**Interfaces:**
- Produces: `syncHrBiometricAttendance(deviceId: String): SyncResult!` — if `!hrBiometricsEnabled`, throw or no-op with clear message; if enabled, call adapter interface (`pullPunches`, map to `upsertHrAttendance`).
- Produces: stub adapters `zktecoStub`, `hikvisionStub` behind factory.

- [ ] **Step 1:** Implement gateway + stubs with unit/script test: flag off → no writes; flag on → stub punches upsert attendance.
- [ ] **Step 2:** UI: show biometric sync controls only when flag on; always keep manual clock.
- [ ] **Step 3:** Commit.

```bash
git add BackEnd/hrBiometricGateway.js BackEnd/hrGraphql.js components/hr/HrAttendancePanel.tsx
git commit -m "feat(hr): biometric gateway gated by Apex toggle"
```

---

### Task 7: `hotcol-emp` GraphQL server + employee auth

**Files:**
- Create: `hotcol-emp/BackEnd/index.js`, `employeeGraphql.js`, `lib/employeeAuth.js`, `lib/auth.js` (JWT pattern from `hotcol-room`)
- Modify: `hotcol-emp/package.json` scripts (`dev` API on a free port, e.g. 4005)

**Interfaces:**
- Produces:
  - `employeeLogin(otp: String!): EmployeeSession!` — find employee by verifying OTP against hash among active tenant employees (strategy: require `HotelName`/TIN + otp, or globally unique active portal OTP — prefer **tenant code + otp** or phone+otp if you add tenant picker; default: OTP unique among `mustChangeOtp`/active portal users per deployment rules documented in code comments).
  - On first login success: clear preview, set `portalFirstLoginAt`, keep `mustChangeOtp` until change.
  - `changeOwnOtp(currentOtp: String!, newOtp: String!): Boolean!`
  - `employeeMe: HrEmployeePublic!`
  - Rate-limit login like room `consumeGuestLoginAttempt`.

**Recommended login identity:** `employeeLogin(tenantTin: String!, otp: String!)` to avoid cross-tenant OTP clash.

- [ ] **Step 1:** Scaffold GraphQL server copying `hotcol-room` structure.
- [ ] **Step 2:** Implement auth helpers (alphanumeric normalize/validate — shared logic copy from `hrPortalOtp.js` or shared package copy).
- [ ] **Step 3:** Implement login + changeOwnOtp + me.
- [ ] **Step 4:** Smoke with curl/GraphQL playground.
- [ ] **Step 5:** Commit in `hotcol-emp`.

---

### Task 8: `hotcol-emp` UI — login, force change, shell, notifications, ESS baseline

**Files:**
- Create/Modify: `hotcol-emp/app/page.tsx` (OTP login)
- Create: `hotcol-emp/app/(emp)/layout.tsx`, `home/page.tsx`, `change-otp/page.tsx`, leave/payslips/profile/notifications routes as needed
- Create: `hotcol-emp/lib/employeeSession.ts`, `lib/api/employee.ts`
- Create: notification bell component (pattern from `hotcol-user` inventory bell, renamed Notifications)

**Interfaces:**
- Consumes: Task 7 session JWT.
- Produces: if `mustChangeOtp`, redirect all routes to change-otp until cleared.

- [ ] **Step 1:** Polished login (HotCol look, InputOTP supporting alphanumeric — do not strip letters).
- [ ] **Step 2:** Force change OTP gate.
- [ ] **Step 3:** Home + notification bell (list/mark read/href).
- [ ] **Step 4:** ESS: profile (photo), own leave request/list, own attendance view, own payslips — GraphQL scoped.
- [ ] **Step 5:** Manual E2E against Phase A test gate in spec §12.
- [ ] **Step 6:** Commit in `hotcol-emp`.

---

### Task 9: Staff notification bell in `hotcol-user`

**Files:**
- Create: `hotcol-user/lib/hrStaffNotifications.ts`
- Create: `hotcol-user/components/hr/HrNotificationCenter.tsx`
- Modify: `components/hr/HrDashboard.tsx`, Manager page header near other bells

- [ ] **Step 1:** Bell lists `hrNotifications` for current role; unread badge.
- [ ] **Step 2:** Click marks read and `router.push(href)`.
- [ ] **Step 3:** Manager sees OTP reset items; HR sees decision/messages without reset OTP body.
- [ ] **Step 4:** Commit.

```bash
git add lib/hrStaffNotifications.ts components/hr/HrNotificationCenter.tsx components/hr/HrDashboard.tsx
git commit -m "feat(hr): staff notification bell with redirects"
```

---

### Task 10: Phase A verification gate

- [ ] **Step 1:** Run through spec §12 checklist (hire OTP, reset OTP, notifications-only, café toggle, biometrics toggle, emp isolation).
- [ ] **Step 2:** Fix blockers.
- [ ] **Step 3:** Tag/commit “Phase A complete” notes in plan checkboxes.
- [ ] **Step 4:** Only then start Part 2 slices.

---

## Part 2 — Phase B+ slices (after A)

Implement in order below unless you reprioritize. Each slice: schema → GraphQL → UI → test → commit. Apply Part 0 approval decisions when wiring mutations.

### Task B1: Excel import + profile fields

**Files:** `hr_employee` new columns (gender, education, experienceText, taxTin, medicalNote); `components/hr/HrEmployeeImport.tsx`; parse/validate Elitro-like sheets; job→department mapping UI.

- [ ] Import dry-run + commit insert.
- [ ] Manual test with `public/assets` sample after cleanup.
- [ ] Commit.

### Task B2: Salary history + salary change approval

**Files:** `hr_salary_history`; change salary mutation respects F28 decision; Manager notification if YES.

- [ ] Never overwrite without history row.
- [ ] Commit.

### Task B3: ET tax/pension configurable rules

**Files:** `hr_payroll_stat_rule` (brackets JSON + effectiveFrom); engine in `hrPayrollHelpers.js`; UI under payroll settings; F29 approval if YES.

- [ ] Commit.

### Task B4: Advances / loans / bonuses

**Files:** new models + payroll line integration; F30–F32 approvals.

- [ ] Commit.

### Task B5: Shift templates + roster polish

**Files:** `hr_shift_template`; roster UI; F33.

- [ ] Commit.

### Task B6: Documents vault + expiry notifications

**Files:** upload storage (Cloudinary pattern); issue/expiry; notify via `hr_notification`.

- [ ] Commit.

### Task B7: Onboarding / exit clearance

**Files:** checklist models; F36–F37.

- [ ] Commit.

### Task B8: Career / discipline / ATS / performance / hotel add-ons

**Files:** per PRD domains F38–F44; only after earlier B slices stable.

- [ ] Commit per subdomain.

### Task B9: Payroll export / Finance post

**Files:** export CSV/bank file; Finance handoff; F45–F46.

- [ ] Commit.

---

## Spec coverage self-check

| Spec section | Plan task |
|--------------|-----------|
| Split GraphQL apps | Tasks 4, 7, 8 |
| OTP hire/reset visibility | Tasks 2, 4, 7, 8, 10 |
| Unified notifications | Tasks 3, 8, 9 |
| Apex solo HR + biometrics toggles | Tasks 5, 6 |
| Biometric code gated | Task 6 |
| Phase A ESS baseline | Task 8 |
| Phase B PRD backlog | Part 2 B1–B9 |
| Approval identification | Part 0 + Task 0 |

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-25-hotcol-hr-ess-implementation.md`.

**First action for you:** fill **Your decision** in Part 0 (especially F01–F25). Reply with changes (e.g. “F06 YES, F12 YES, rest as proposed”) so we lock Task 0.

**Then choose execution:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
