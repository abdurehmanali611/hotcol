# HotCol HR + Employee ESS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase A (OTP portal, `hotcol-emp` ESS shell, unified notifications, Apex toggles, biometric code gated by switch, employee capability grants, Finance HR tasks when subscribed) then Phase B+ PRD slices; use the feature catalog below to lock **who approves** (Manager / Finance / Supervisor) before coding those features.

**Architecture:** Approach 1 — `hotcol-user` GraphQL for staff HR + Finance HR surfaces; `hotcol-emp` GraphQL for employee OTP/ESS + **granted capabilities** (e.g. supervisor leave approve); `hotcol` Apex for café `hrSoloManagerEnabled` + `hrBiometricsEnabled`; shared MySQL. **Finance role tasks are module-gated:** Inventory+Financial Management → inventory finance queues only; HR Module+Financial Management → HR finance (payroll/payslips/tax/pension) tasks; all three → both. Notifications are one channel (bell). OTP hire preview → HR only; OTP reset → Manager approve → Manager preview only; first login forces PIN change and clears preview.

**Tech Stack:** Next.js (user/emp/apex), GraphQL + Prisma/MySQL (`hr_employee`, `tenant_account`), JWT sessions, HotCol UI (sidebar, bell, sonner, InputOTP), bcrypt/argon for OTP hash.

**Spec:** `docs/superpowers/specs/2026-09-25-hotcol-hr-ess-design.md`

## Global Constraints

- UI label **HR Manager** for credential role `HR`; do not invent a fourth desk role string unless migrating carefully.
- Notifications only — no separate Announcement product or UI copy.
- Default employee OTP charset: `A–Z` + `0–9`, length 6 (e.g. `AB1234`); store hash; plaintext preview only while `portalOtpViewer` allows.
- Café: Apex toggles mirror `waiterOrderingEnabled` pattern on `tenant_account`.
- Biometrics: implement code; runtime only when `hrBiometricsEnabled === true`; otherwise HR manual clock in/out.
- Emp API always scopes by JWT `employeeId` + tenant; **capability grants** may widen allowlisted mutations (e.g. approve leave for assigned scope only).
- **Finance (**`Role=Finance`**)** requires `Financial Management`. UI/API tasks further split by whether tenant also has `Inventory` and/or `HR Module` (see Part 0b).
- Polish both `hotcol-user` and `hotcol-emp` to match HotCol patterns.
- Plan covers PRD backlog; implement A → test → B slices.

---

## Part 0 — Feature catalog, approval matrix, Finance modules, employee capabilities

**How to use:** For each feature row, set **Your decision** for whether **Manager** must approve via notification bell → portal (`YES` / `NO` / `N/A`).  
Separately use **Part 0b** (Finance by subscription) and **Part 0c** (employee capabilities).  
**Proposed** is a recommendation — edit before coding that feature.

### Part 0a — Manager-approval matrix (bell → portal)


| ID  | Feature                                           | Phase | App      | Proposed | Your decision | Notes                                                                                 |
| --- | ------------------------------------------------- | ----- | -------- | -------- | ------------- | ------------------------------------------------------------------------------------- |
| F01 | Create / update employee (non-salary) | A | user | NO | NO |  |
| F02 | Hire complete → issue portal OTP | A | user | NO | NO | HR sees OTP until first login |
| F03 | Employee first login + force change OTP | A | emp | N/A | N/A | System gate |
| F04 | OTP reset request | A | user | YES | YES | **Spec-locked:** HR requests → Manager approves |
| F05 | OTP reset reject | A | user | N/A | N/A | Manager action |
| F06 | Terminate employee | A/B | user | NO | YES | Manager must approve terminate (locked) |
| F07 | HR sends notification to employee(s) | A | user | NO | NO | Direct notify employees |
| F08 | Leave request (HR files for employee) | A | user | NO | NO | Creates pending leave |
| F09 | Leave approve / reject (Manager) | A | user | YES | YES | Manager path; Supervisor F48 recommends then Manager countersigns |
| F10 | Employee self leave request | A | emp | NO | NO | Creates pending; F09 and/or F47 |
| F11 | Manual clock in/out by HR | A | user | NO | NO | Default when biometrics off |
| F12 | Attendance correction by HR | A | user | NO | YES | Manager must approve attendance correction (locked) |
| F13 | Create / delete shift | A | user | NO | NO | **Manager** owns shifts (not HR) |
| F14 | Leave types / departments / incident types config | A | user | NO | NO | Manager/Admin config today |
| F15 | Record incident | A | user | NO | NO |  |
| F16 | Document metadata create/delete | A | user | NO | NO |  |
| F17 | Open payroll period / generate payslips | A | user | NO | YES | Manager must approve open/generate payroll (locked) |
| F18 | Mark payslips paid | A | user | NO | NO | Actors: HR + Finance when HR+Fin (Part 0b); not a Manager-bell item |
| F19 | Approve payroll payment (final) | A | user | YES | YES | When HR+Fin: Finance participates then Manager final approve; else Manager only |
| F20 | Payroll line rules / wage windows config | A | user | NO | NO | Manager config; Finance may view/edit tax rules when HR+Fin (B) |
| F21 | Apex: solo HR Manager toggle | A | apex | N/A | N/A | Apex only |
| F22 | Apex: HR biometrics toggle | A | apex | N/A | N/A | Apex only |
| F23 | Biometric device enroll / sync | A | user | NO | NO | Only when F22 on |
| F24 | Employee edit own profile (photo) | A | emp | NO | NO | Allowlisted fields |
| F25 | Employee view own payslip | A | emp | N/A | N/A | Read-only |
| F26 | Excel employee import | B | user | NO | NO | Imported by Apex-only (same pattern as inventory item import) |
| F27 | Extend profile (gender, education, TIN…) | B | user | NO | NO |  |
| F28 | Salary change (baseSalaryETB) | B | user | YES | YES | Manager approve + salary history; Finance notify when HR+Fin |
| F29 | Statutory tax/pension rule publish | B | user | YES | YES | Finance primary when HR+Fin; else Manager |
| F30 | Salary advance request | B | user/emp | YES | YES |  |
| F31 | Loan create | B | user | YES | YES |  |
| F32 | Bonus / incentive payout | B | user | YES | YES |  |
| F33 | Shift template / publish roster | B | user | NO | NO | Manager; propose YES for “publish” only |
| F34 | Overtime request | B | user/emp | YES | YES | Supervisor may approve if granted (extend F47) |
| F35 | Document vault upload + expiry | B | user | NO | NO |  |
| F36 | Onboarding checklist complete | B | user | NO | NO |  |
| F37 | Exit clearance complete | B | user | YES | YES | Multi-dept sensitive |
| F38 | Promotion / transfer | B | user | YES | YES |  |
| F39 | Formal disciplinary action | B | user | YES | YES |  |
| F40 | Vacancy / hire from ATS | B | user | YES | YES | Offer stage |
| F41 | Performance review finalize | B | user | YES | YES |  |
| F42 | Training assign | B | user | NO | YES | Manager approval required (locked) |
| F43 | Staff meal / housing / transport assign | B | user | NO | YES | Manager approval required (locked) |
| F44 | Asset issue / return | B | user | NO | NO | Exit clearance may YES via F37 |
| F45 | Export payroll bank file | B | user | YES | YES | **Finance** when HR+Fin; else Manager |
| F46 | Post payroll to Finance module | B | user | YES | YES | Finance when HR+Fin |
| F47 | Grant / revoke employee capabilities (supervisor) | A | user | NO | NO | HR/Manager configures; see Part 0c |
| F48 | Supervisor approve/reject leave (scoped) | A | emp | N/A | N/A | Supervisor recommend → Manager countersign; scope = departments + reportees |
| F49 | Finance HR payroll queue actions | A | user | N/A | N/A | Module-gated; see Part 0b |


**LOCKED — Phase A Manager-bell YES:** F04, F06, F09 (countersign after supervisor), F12, F17, F19.  
**LOCKED — Phase A other actors:** F18 mark-paid = HR **and** Finance when HR+Fin; F19 = Finance participates then **Manager** final when HR+Fin (Manager only if no Fin).  
**LOCKED — Supervisor (F47/F48):** recommend → **Manager countersign**; scope = **departments + reportees**.  
**Phase B Manager YES also locked where You set YES:** F28–F32, F34, F37–F43, F45–F46 (and Proposed YES rows).

---

### Part 0b — Finance role × subscription modules

Credential role `**Finance**` always requires module `**Financial Management**`.  
Which **tasks** appear on the Finance terminal / GraphQL allowlist depends on other modules:


| Tenant subscribed modules                           | Finance role gets                                                                                                               | Does **not** get (unless also subscribed)     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Inventory + Financial Management** (no HR)        | Existing inventory finance: purchase/registration/stock queues, VAT payments, etc.                                              | Payroll, payslips, tax/pension HR UI          |
| **HR Module + Financial Management** (no Inventory) | HR finance: payroll period review, payslip payment steps agreed in matrix, tax/pension/statutory views, payroll export/post (B) | Inventory purchase/stock finance queues       |
| **Inventory + Financial Management + HR Module**    | **Both** inventory finance **and** HR finance surfaces                                                                          | —                                             |
| Financial Management alone (edge)                   | Minimal / billing-adjacent only — confirm in Task 0; prefer requiring Inv and/or HR for meaningful Finance work                 | Full Inv or HR finance until those modules on |


**LOCKED Phase A Finance HR tasks** (when `HR Module` + `Financial Management`):


| Task | Finance can | HR Manager can | Manager can |
| ---- | ----------- | -------------- | ----------- |
| View payroll periods / payslip totals | YES | YES | YES |
| Generate / open payroll period | NO — HR creates; **Manager must approve (F17 YES)** | YES (create) | YES (approve open/generate) |
| Mark payslips paid (F18) | YES (with HR when HR+Fin) | YES | — |
| Final approve payroll payment (F19) | YES participates (review / prior step when HR+Fin) | NO | YES **final** (Manager with Finance) |
| Tax/pension rule view | YES | limited | YES |
| Tax/pension rule publish (B / F29) | YES + approval | propose | YES |


**Implementation rule:** `lib/financeHrCapabilities.ts` (new) + extend `filterFinanceSectionId` / Finance sidebar so HR payroll sections appear only when `tenantHasModule(..., "HR Module")`; inventory sections only when `Inventory` is subscribed (already mostly true for Inv flows).

**LOCKED Task 0 answers (Part 0b):**

1. **F19:** Manager **with** Finance when HR+Fin (Finance participates; Manager final approve). Without Financial Management, Manager only.
2. **F18:** **Both** HR and Finance may mark paid when HR+Fin.

---

### Part 0c — Employee capabilities (supervisor and future grants)

Employees in `hotcol-emp` remain ESS-only by default. HR Manager (or Manager) may **grant capabilities** on an employee record so that employee can perform limited workplace actions without a staff credential.


| Capability code (proposed)    | Allows in `hotcol-emp`                                                                     | Scope                                              | Phase        |
| ----------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------- | ------------ |
| `leave_approve_supervisor`    | Approve/reject **pending leave** for employees in assigned department(s) or direct reports | Department codes list and/or `reportsToEmployeeId` | A (F47/F48)  |
| `overtime_approve_supervisor` | Approve OT requests in scope                                                               | Same                                               | B (with F34) |
| `attendance_correct_team`     | Propose/correct team attendance                                                            | Same                                               | B optional   |


**Rules:**

- Stored on employee (e.g. `hr_employee_capability` rows: `employeeId`, `code`, `scopeJson`, `grantedBy`, `active`).
- Emp GraphQL checks JWT employee + active capability + scope before `decideLeaveAsSupervisor`.
- **LOCKED:** Supervisor leave is **recommend → Manager countersign** (notification to Manager). Out-of-scope leave stays Manager-only (F09).
- **LOCKED scope:** **both** department codes **and** named reportees (`scopeJson`).
- Granting capability does **not** give payroll, OTP reset, or HR admin.
- Café/hotel: same model; link employee to department used by leave/shifts.

**LOCKED Task 0 answers (Part 0c):**

1. Supervisor leave: **Manager countersign** (not final).
2. Scope: **both** departments and reportees.

---

**Phase A approval / actor implement now (LOCKED):**

- Manager bell YES: **F04**, **F06**, **F09** (incl. countersign after supervisor), **F12**, **F17**, **F19** (with Finance when HR+Fin).
- Supervisor path: **F47/F48** enabled (recommend only).
- Finance HR surface: **F49** when HR Module + Financial Management; mark-paid **F18** = HR + Finance.

---

## File map (Phase A)


| Path                                       | Responsibility                                                                                                                                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hotcol-user/BackEnd/prisma/schema.prisma` | Extend `hr_employee` OTP fields; `hr_otp_reset_request`; `hr_notification`; `hr_employee_capability`; `tenant_account.hrSoloManagerEnabled`, `hrBiometricsEnabled`; biometric stub models |
| `hotcol-user/BackEnd/hrPortalOtp.js`       | Generate/normalize/validate alphanumeric OTP; hash/verify; issue hire OTP; clear preview on first login                                                                                   |
| `hotcol-user/BackEnd/hrNotifications.js`   | Create/list/mark-read notifications; kinds + href helpers                                                                                                                                 |
| `hotcol-user/BackEnd/hrGraphql.js`         | Wire OTP issue/reset/approve; notification queries/mutations; capability grant mutations; biometric stubs gated by tenant flag; Finance-allowed HR payroll queries                        |
| `hotcol-user/BackEnd/index.js`             | Export new typeDefs/resolvers; assert Finance + module checks                                                                                                                             |
| `hotcol-user/lib/hrCapabilities.ts`        | Manager/HR/Admin; HR Manager labeling helpers                                                                                                                                             |
| `hotcol-user/lib/financeHrCapabilities.ts` | Derive Finance inventory vs HR finance task allowlist from tenant modules                                                                                                                 |
| `hotcol-user/lib/subscriptionModules.ts`   | Extend `FINANCE_SECTION_MODULES` / Finance nav for HR payroll sections when HR Module present                                                                                             |
| `hotcol-user/app/(Hotel)/Finance/page.tsx` | Show inventory queues iff Inventory; show HR finance sections iff HR Module                                                                                                               |
| `hotcol-user/components/hr/*`              | Hire OTP reveal, reset request UI, Manager approval panel, capability grant UI, notification bell, HR Manager label                                                                       |
| `hotcol-user/lib/hrNotifications.ts`       | Client helpers for bell (mirror inventory pattern)                                                                                                                                        |
| `hotcol-emp/BackEnd/`                      | GraphQL server (pattern from `hotcol-room`): `employeeGraphql.js`, supervisor leave decide when capability granted                                                                        |
| `hotcol-emp/app/*`                         | Login OTP, force change PIN, home, ESS panels, supervisor leave queue, notification bell                                                                                                  |
| `hotcol/…` (Apex)                          | Modules UI toggles for `hrSoloManagerEnabled` + `hrBiometricsEnabled` on café HR Module tenants                                                                                           |
| `hotcol-user/BackEnd/hrBiometric*.js`      | Device adapter stubs; no-op unless tenant flag on                                                                                                                                         |


Sync schema: after `hotcol-user` Prisma migrate, refresh `hotcol-emp/BackEnd/prisma/schema.prisma` (shared DB) the same way room shares lodging models.

---

## Part 1 — Phase A tasks

### Task 0: Lock approval matrix + Finance modules + supervisor capabilities

**Files:**

- Modify: `docs/superpowers/plans/2026-09-25-hotcol-hr-ess-implementation.md` (this file, Part 0a–0c)

- [x] **Step 1:** Fill **Your decision** for F01–F49 (at least F01–F25 + F47–F49 for Phase A).
- [x] **Step 2:** Answer Part 0b questions (F19 actor; F18 mark-paid).
- [x] **Step 3:** Answer Part 0c questions (supervisor final vs countersign; scope model).
- [x] **Step 4:** Confirm Phase A YES / actor set.
- [x] **Step 5:** Commit matrix decisions.

```bash
git add docs/superpowers/plans/2026-09-25-hotcol-hr-ess-implementation.md
git commit -m "docs: lock HR approval, Finance module tasks, supervisor capabilities"
```

---

### Task 1: Prisma — OTP, reset request, notifications, Apex flags

**Files:**

- Modify: `hotcol-user/BackEnd/prisma/schema.prisma` (`hr_employee` ~1445, `tenant_account` ~220)
- Create models: `hr_otp_reset_request`, `hr_notification`, optional `hr_biometric_device`

**Interfaces:**

- Produces: columns on `hr_employee`: `portalOtpHash String @default("")`, `portalOtpPreview String @default("")`, `portalOtpViewer String @default("none")`, `mustChangeOtp Boolean @default(false)`, `portalOtpIssuedAt DateTime?`, `portalFirstLoginAt DateTime?`, `profileImageUrl String @default("")`
- Produces: `tenant_account.hrSoloManagerEnabled Boolean @default(false)`, `hrBiometricsEnabled Boolean @default(false)`
- Produces: model `hr_employee_capability` (`employeeId`, `code`, `scopeJson`, `grantedBy`, `active`, timestamps)

- [x] **Step 1:** Add fields/models to `schema.prisma` (mirror naming of existing `hr_`* models).
- [x] **Step 2:** Run migrate in `hotcol-user/BackEnd`:

```bash
cd BackEnd
npx prisma migrate dev --name hr_portal_otp_notifications_flags_capabilities
```

Expected: migration applied; client generated.

- [x] **Step 3:** Copy/sync relevant models into `hotcol-emp/BackEnd/prisma/schema.prisma` and regenerate emp Prisma client.
- [x] **Step 4:** Commit.

```bash
git add BackEnd/prisma
git commit -m "feat(hr): schema for portal OTP, notifications, flags, capabilities"
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

- [x] **Step 1:** Write failing tests for generate/normalize/validate/hash-verify.
- [x] **Step 2:** Run tests — expect FAIL (module missing).
- [x] **Step 3:** Implement `hrPortalOtp.js` (bcrypt cost same family as other HotCol password hashes).
- [x] **Step 4:** Run tests — expect PASS.
- [x] **Step 5:** Commit.

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

- [x] **Step 1:** Add Prisma-backed create/list/markRead helpers.
- [x] **Step 2:** Wire typeDefs + resolvers in `hrGraphql.js` / `index.js` following existing HR patterns.
- [x] **Step 3:** Manual GraphQL smoke: create notification for Manager role; list as Manager.
- [x] **Step 4:** Commit.

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

- [x] **Step 1:** Implement issue-on-hire (or explicit “Enable portal access” action if hire already created the row).
- [x] **Step 2:** Implement reset request + decide; enforce viewer rules on any field that returns `portalOtpPreview`.
- [x] **Step 3:** UI: show OTP dialog to HR after enable; Reset button; Manager approval panel reachable from bell href.
- [x] **Step 4:** Manual test: hire preview → fake first-login clear via emp API later; reset path Manager-only preview.
- [x] **Step 5:** Commit.

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

- [x] **Step 1:** Apex UI toggles next to waiter ordering pattern for HR-subscribed cafés.
- [x] **Step 2:** Wire flags into tenant subscription snapshot APIs used by `hotcol-user`.
- [x] **Step 3:** Replace user-visible “HR” strings with “HR Manager” in HR chrome/nav.
- [x] **Step 4:** Commit in respective repos.

---

### Task 5b: Finance role — module-gated inventory vs HR finance surfaces

**Files:**

- Create: `hotcol-user/lib/financeHrCapabilities.ts`
- Modify: `hotcol-user/lib/subscriptionModules.ts` (`FINANCE_SECTION_MODULES`, filters)
- Modify: `hotcol-user/app/(Hotel)/Finance/page.tsx` (and café Admin finance host if any)
- Modify: `hotcol-user/BackEnd/hrGraphql.js` — allow `Finance` on selected payroll queries/mutations per Task 0 (F18/F19/F49)
- Modify: `hotcol-user/BackEnd/index.js` — module asserts: Finance + Inventory for inv queues; Finance + HR Module for HR payroll actions

**Interfaces:**

- Produces:
  - `financeCapabilities(modules)` → `{ canInventoryFinance: boolean, canHrFinance: boolean }`
  - Finance sidebar: inventory sections only if `canInventoryFinance`; HR payroll sections only if `canHrFinance`
  - When both modules present, both section groups visible
- Consumes: Task 0 decisions for F18/F19 actors

- [x] **Step 1:** Implement `financeHrCapabilities` + section filters (unit/script test: Inv only / HR only / both).
- [x] **Step 2:** Wire Finance page nav + GraphQL role checks.
- [x] **Step 3:** Manual: tenant with Inv+Fin sees no HR payroll; HR+Fin sees no purchase queues; all three sees both.
- [x] **Step 4:** Commit.

```bash
git add lib/financeHrCapabilities.ts lib/subscriptionModules.ts app/(Hotel)/Finance/page.tsx BackEnd/hrGraphql.js BackEnd/index.js
git commit -m "feat(finance): gate inventory vs HR finance tasks by subscribed modules"
```

---

### Task 5c: Employee capability grants (supervisor leave)

**Files:**

- Modify: `hotcol-user/BackEnd/hrGraphql.js` — `replaceHrEmployeeCapabilities` / list
- Modify: `hotcol-user/components/hr/HrEmployeesPanel.tsx` (or capability editor)
- Modify: `hotcol-emp/BackEnd/employeeGraphql.js` — `pendingLeaveForSupervisor`, `decideLeaveAsSupervisor`
- Modify: `hotcol-emp` UI — supervisor leave queue when capability present

**Interfaces:**

- Produces: capability `leave_approve_supervisor` with `scopeJson` (`departmentCodes: string[]` and/or `employeeIds: number[]`) per Task 0c
- Produces: emp mutation scoped; refuses out-of-scope leave; supervisor recommend sets leave to awaiting Manager countersign + Manager notification (locked)

- [x] **Step 1:** Staff GraphQL + UI to grant/revoke capabilities.
- [x] **Step 2:** Emp GraphQL supervise leave decide + tests for scope denial.
- [x] **Step 3:** Emp UI queue when capability active.
- [x] **Step 4:** Commit in user + emp repos.

```bash
git commit -m "feat(hr): supervisor leave capability for employees in hotcol-emp"
```

---

### Task 6: Biometric gateway — **CANCELLED**

> **Cancelled (locked):** Devices collect punches themselves; no HotCol biometric gateway/adapters in Phase A.
> Apex `hrBiometricsEnabled` toggle remains for future use; attendance stays manual clock (F11) + Manager-approved corrections (F12).
> See `docs/superpowers/specs/2026-09-26-hr-approval-hierarchies-design.md`.

- [x] **Cancelled:** No `hrBiometricGateway.js` / device enroll (F23) in Phase A.
- [x] Manual clock retained; F12 corrections use Manager-pending approval.

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

- [x] **Step 1:** Scaffold GraphQL server copying `hotcol-room` structure.
- [x] **Step 2:** Implement auth helpers (alphanumeric normalize/validate — shared logic copy from `hrPortalOtp.js` or shared package copy).
- [x] **Step 3:** Implement login + changeOwnOtp + me.
- [x] **Step 4:** Smoke with curl/GraphQL playground.
- [x] **Step 5:** Commit in `hotcol-emp`.

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

- [x] **Step 1:** Polished login (HotCol look, InputOTP supporting alphanumeric — do not strip letters).
- [x] **Step 2:** Force change OTP gate.
- [x] **Step 3:** Home + notification bell (list/mark read/href).
- [x] **Step 4:** ESS: profile (photo), own leave request/list, own attendance view, own payslips — GraphQL scoped; if `leave_approve_supervisor` capability, show team leave queue (Task 5c).
- [x] **Step 5:** Manual E2E against Phase A test gate in spec §12 + Finance module matrix + supervisor leave.
- [x] **Step 6:** Commit in `hotcol-emp`.

---

### Task 9: Staff notification bell in `hotcol-user`

**Files:**

- Create: `hotcol-user/lib/hrStaffNotifications.ts`
- Create: `hotcol-user/components/hr/HrNotificationCenter.tsx`
- Modify: `components/hr/HrDashboard.tsx`, Manager page header near other bells

- [x] **Step 1:** Bell lists `hrNotifications` for current role; unread badge.
- [x] **Step 2:** Click marks read and `router.push(href)`.
- [x] **Step 3:** Manager sees OTP reset items; HR sees decision/messages without reset OTP body.
- [x] **Step 4:** Commit.

```bash
git add lib/hrStaffNotifications.ts components/hr/HrNotificationCenter.tsx components/hr/HrDashboard.tsx
git commit -m "feat(hr): staff notification bell with redirects"
```

---

### Task 10: Phase A verification gate

> Implementation complete (2026-09-26): OTP, notifications, Apex toggles, ESS, approval hierarchies, hire team selector, Manager-pending F06/F12/F17, Finance F18 mark-paid. Biometrics gateway cancelled. Run manual cases from canvas **Phase A test cases**.

- [x] **Step 1:** Run through spec §12 checklist (hire OTP, reset OTP, notifications-only, café toggle, biometrics toggle, emp isolation).
- [x] **Step 2:** Verify Finance: Inv-only / HR-only / both module combinations show correct Finance tasks.
- [x] **Step 3:** Verify supervisor capability: in-scope leave approve works; out-of-scope denied; no capability → no queue.
- [x] **Step 4:** Fix blockers.
- [x] **Step 5:** Tag/commit “Phase A complete” notes in plan checkboxes.
- [x] **Step 6:** Only then start Part 2 slices.

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

**Files:** export CSV/bank file; Finance handoff; F45–F46; only when `canHrFinance` (HR Module + Financial Management).

- [ ] Commit.

---

## Spec coverage self-check


| Spec section                      | Plan task                   |
| --------------------------------- | --------------------------- |
| Split GraphQL apps                | Tasks 4, 7, 8               |
| OTP hire/reset visibility         | Tasks 2, 4, 7, 8, 10        |
| Unified notifications             | Tasks 3, 8, 9               |
| Apex solo HR + biometrics toggles | Tasks 5, 6                  |
| Biometric code gated              | Task 6                      |
| Phase A ESS baseline              | Task 8                      |
| Finance Inv vs HR by modules      | Task 5b, Part 0b            |
| Employee supervisor capabilities  | Task 5c, Part 0c, Task 8    |
| Phase B PRD backlog               | Part 2 B1–B9                |
| Approval identification           | Part 0a–0c + Task 0         |


---

## Execution handoff

Plan locked for Phase A actors: `docs/superpowers/plans/2026-09-25-hotcol-hr-ess-implementation.md`.

**Task 0 status:** Decisions locked in Part 0a–0c. Remaining Task 0 step: commit this plan file (Step 5), then start Task 1.

**Nothing else blocks implementation** except choosing how to execute Tasks 1+.

**Choose execution:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks
2. **Inline Execution** — execute tasks in this session with checkpoints

Which approach?