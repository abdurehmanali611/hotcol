# HotCol HR + Employee Self-Service — Design Spec

**Date:** 2026-09-25  
**Status:** Draft for review (brainstorming complete; implementation plan not started)  
**Repos:** `hotcol-user` (staff HR), `hotcol-emp` (employee ESS), `hotcol` (Apex admin)  
**Architecture:** Approach 1 — split GraphQL apps, shared MySQL  

---

## 1. Goal

Expand HotCol HR toward the Hotel HRMS PRD while shipping in short **build → test → next** cycles.

- **Plan** covers the full PRD + gap analysis (master backlog).
- **Implement** Phase A first, then Phase B+ slices (A → B), without long idle gaps between phases.
- Staff ops stay in `hotcol-user`; employee self-service lives in `hotcol-emp`.
- Both frontends must match existing HotCol polish.
- Notifications are a **single** product concept (bell); do not split “announcement” vs “notification.”

---

## 2. System map

| App | Actors | Responsibility |
|-----|--------|----------------|
| `hotcol-user` | HR Manager, Manager; café Admin when solo-HR toggle is off | Hire, roster, leave, attendance, payroll, docs, incidents; issue hire OTP; request OTP reset; create notifications; Manager approval actions from bell |
| `hotcol-emp` | Employee | OTP login; forced first PIN change; ESS (least privilege); own notification bell |
| `hotcol` (Apex) | Apex admin | Café HR Module toggles: **solo HR Manager**, **HR biometrics** |
| Shared MySQL | — | Employee master, OTP fields, reset requests, notifications, existing HR tables |

### Auth boundary

- **Staff:** existing HotCol username/password credentials. Role `HR` is shown in UI as **HR Manager**.
- **Employee:** OTP/PIN session on `hotcol-emp` only (JWT scoped to `employeeId` + tenant). No access to HR admin mutations.

---

## 3. Roles

| Role | Notes |
|------|--------|
| **HR Manager** | UI label for credential role `HR`. Operates HR; sees hire OTP until employee first login; requests OTP reset (never sees reset OTP). |
| **Manager** | Approves OTP reset (and other approval-needed features as listed later). Sees reset OTP until employee first login with that code. Bell-only for approval items (open portal and act). |
| **Employee** | `hotcol-emp` only. |
| **Café Admin** | If Apex **solo HR Manager** is **off**, Admin hosts HR. If **on**, café uses dedicated HR Manager role. |

Further features that need Manager approval will be identified when the detailed build feature list is finalized (before the implementation plan). **Known today:** OTP reset/regenerate.

---

## 4. OTP / portal PIN

### Format

- Length: **6** characters.
- Preferred charset: `A–Z` + `0–9` (e.g. `AB1234`).
- Pure digits or letters allowed by validation; specials (`%`, `$`) optional/advanced — default generator uses alphanumeric only for InputOTP and messaging clarity.
- Store **hash** always; plaintext **preview** only while visibility rules allow.

### Hire flow

1. Hiring completes → generate OTP → store hash + preview; `portalOtpViewer = HR`; `mustChangeOtp = true`.
2. Only **HR Manager** may read preview until employee’s **first successful login**.
3. First login → clear preview; set viewer `none`; emp UI **forces change OTP** before any ESS.
4. After change → normal ESS; HR never sees that OTP again.

### Forgot / reset flow

1. HR Manager submits **OTP reset request** (no new OTP yet).
2. Manager receives a **notification** (bell) → opens portal → approve/reject.
3. On approve → generate new OTP; preview viewer = **Manager** only; `mustChangeOtp = true`; invalidate prior emp session if any.
4. HR Manager **never** sees reset OTPs.
5. After employee first login with new code → same force-change + hide preview as hire.

### Employee fields (conceptual)

- `portalOtpHash`
- `portalOtpPreview` (nullable; cleared after first login)
- `portalOtpViewer` (`HR` | `Manager` | `none`)
- `mustChangeOtp`
- `portalOtpIssuedAt`, `portalFirstLoginAt`
- `profileImageUrl` (ESS-editable)

### OTP reset request (conceptual)

- `employeeId`, `requestedBy`, `status` (`pending` | `approved` | `rejected` | `cancelled`)
- `decidedBy`, `decidedAt`

Resolvers must refuse preview OTP unless caller role matches `portalOtpViewer` and preview is non-null.

---

## 5. Notifications (single channel)

There is **one** messaging product: **Notifications** (in-app bell), consistent with inventory/lodging HotCol patterns.

- No separate Announcement entity or UI label.
- Manager approval items (e.g. OTP reset) are notifications → Manager opens portal and acts.
- HR → employee messages are notifications to those employees.
- Whether a feature requires Manager approval is **feature-configured**; if it does, Manager gets a bell item; if not, recipients are notified directly.
- Notification tap **redirects** to the correct portal screen (`href` / kind map).

### Notification fields (conceptual)

- tenant, recipient (`employeeId` and/or role), `kind`, title, body, `href`, optional action `status`, `readAt`, `createdBy`, `createdAt`

### Example redirect map

| Kind | Recipient | Opens |
|------|-----------|--------|
| OTP reset pending | Manager | Approve/reject reset |
| OTP ready (optional) | HR or Manager | Employee detail (preview while allowed) |
| HR → employee message | Employee | Emp notification detail / home |
| Leave / payroll (later) | Role or employee | Matching panel |

---

## 6. Attendance & biometrics

- **Default / biometrics toggle OFF:** HR selects employees and clock-in / clock-out (current HotCol behavior).
- **Implement biometric/ZKT/Hikvision integration code** in the codebase.
- **Apex (`hotcol`) HR biometrics toggle:** when **ON**, system uses the biometric code path; when **OFF**, biometric path has **no runtime effect** (UI and resolvers stay on manual clock).
- Same activation pattern as café solo HR Manager switch.

---

## 7. Phase cut

### Phase A (implement first)

- Role UI label HR Manager; café solo-HR Apex toggle.
- Hire OTP + first-login force change + preview rules.
- OTP reset request → Manager notification → approve → Manager-only preview.
- `hotcol-emp`: GraphQL backend, login, session, polish, home, notification bell, ESS baseline.
- Unified notifications (create/list/read/redirect).
- Polish existing `hotcol-user` HR (employees, leave, attendance, shifts, docs, incidents, payroll as today).
- Biometric **code implemented** + Apex toggle (off = manual only).

### Phase B+ (in same master plan; code after A passes)

Short slices from PRD/gap backlog, e.g.:

- Excel import + client profile fields (gender, education, TIN, …)
- Deeper ET payroll (tax/pension, advances, salary history)
- Shift templates / roster depth
- Document vault + expiry
- Onboarding / exit checklists
- Later: ATS, performance, training, housing/meals, etc.
- Hardware go-live when devices purchased (toggle already exists)

Approval-needed features beyond OTP reset: finalize on the build feature list before the written implementation plan.

---

## 8. ESS permission rules (`hotcol-emp`)

Default: **own data only**. GraphQL always scopes by JWT `employeeId` + tenant.

| Feature | Employee |
|---------|----------|
| Profile | View; edit allowlisted fields (e.g. photo; optionally phone) — not salary, department, status |
| Leave | Request own; view own balance/history — not approve |
| Attendance / shifts | View own — not clock others while biometrics off |
| Payroll | View/download **own** payslips only |
| Documents | View own allowed docs |
| Notifications | List own; mark read; follow href |
| Incidents | View own if exposed — never manage others |
| HR admin | Denied |

Rule: hotel-wide people management → `hotcol-user`. “My work life” → `hotcol-emp` with least privilege.

---

## 9. GraphQL surface split

| Surface | Repo | Examples |
|---------|------|----------|
| Staff HR API | `hotcol-user` / `BackEnd` | Employees, hire+issue OTP, `requestEmployeeOtpReset`, Manager approve reset, notifications CRUD/actions, leave/attendance/payroll, biometric hooks gated by toggle |
| Employee API | `hotcol-emp` / `BackEnd` | `employeeLogin(otp)`, `changeOwnOtp`, `me`, own leave/payslips/attendance/docs, own notifications, limited profile update |
| Apex | `hotcol` / GraphQL backend | Persist/read `hrSoloManager`, `hrBiometricsEnabled` (names TBD to match existing module flag style) |

---

## 10. UI / polish

- Shared HotCol language: sidebar/shell, cards, badges, DataTable, dialogs, sonner toasts, notification bell.
- `hotcol-user`: HR Manager labeling; Manager actions reachable from bell.
- `hotcol-emp`: polished OTP login, forced change-PIN gate, simple ESS sections, **Notifications** bell (same naming everywhere).

---

## 11. Error handling

- Invalid OTP: generic error + rate limit (room-portal style).
- Preview OTP only when viewer matches; wipe on first login / after PIN change.
- Reset: no double-approve; reject cancels; new OTP only on approve.
- Biometrics off: device sync/mutations no-op or UI-disabled; no half-enabled behavior.

---

## 12. Phase A test gate (before B)

1. Hire → HR sees OTP → emp first login → force change → HR preview gone.
2. Reset → Manager bell → approve → Manager sees OTP → emp login → Manager preview gone; HR never saw reset OTP.
3. Notifications only (no separate announcement product).
4. Café solo-HR toggle on/off.
5. Biometrics toggle off = manual clock; on = biometric path active (device may be mocked until hardware exists).
6. Emp cannot access other employees’ payroll/profile admin fields or staff mutations.

---

## 13. Out of scope for Phase A coding (still on master plan)

Full PRD domains not listed in Phase A (ATS, loans, performance suites, housing, etc.) wait for B+ slices. Spec and backlog remain PRD-complete at planning time.

---

## 14. Open items for implementation plan (not blockers for this design)

- Exact Prisma model/table names aligned with existing `HrEmployee` schema.
- Exact Apex module flag keys to match waiter-ordering toggle pattern.
- Final list of Manager-approval features beyond OTP reset (when feature build list is ready).
- Whether hire OTP is also pushed as a notification to HR or only shown on employee detail.

---

## 15. Approval record (brainstorming)

- Approach 1 (split GraphQL, shared DB) — approved  
- Phased A→B implement; plan includes PRD — approved  
- OTP hire/reset visibility rules — approved  
- Notifications unified (no announcement split) — approved  
- Biometrics code + Apex toggle — approved  
- Café solo HR Manager Apex toggle — approved  
- Design §§1–4 — approved  

---

*Next after user review of this spec: writing-plans → detailed implementation plan; then implement Phase A.*
