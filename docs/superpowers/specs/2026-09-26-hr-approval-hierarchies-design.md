# HotCol HR — Configurable Approval Hierarchies + ESS

**Date:** 2026-09-26  
**Status:** Ready for review  
**Parent:** `docs/superpowers/specs/2026-09-25-hotcol-hr-ess-design.md`  
**Supersedes (Phase A slice):** fixed “supervisor recommend → Manager countersign” as the *only* leave path; biometrics gateway (out of scope — devices collect punches themselves)

---

## 1. Goal

Give **Manager** an end-to-end **HR customization portal** to:

1. Maintain **departments** and optional **teams** under departments.
2. Configure **per-request-type approval chains** (leave first; OT and others reuse the same engine), optionally **per department**, including whether team members must pass a **team leader** before the **department leader**.
3. Support mixed step kinds: employee Leaders and desk roles (HR Manager, Manager, Admin).

Ship alongside **hotcol-emp ESS**: own leave, payslips, profile, attendance view, and **My approvals** when the employee is a Leader on a live step.

Café stays simple via default templates (solo HR on/off). Biometric device gateway is **not** built.

---

## 2. Locked decisions (this brainstorm)

| Topic | Decision |
|-------|----------|
| Hierarchy shape | Per department (and tenant default); request type selectable in Manager config |
| Approver kinds | Mix: employees (Leaders) + desk roles — option **B** |
| Dept / team leader | Hire fields: department (selector), optional team, **position** Leader \| Employee, **specific role** (text → existing `jobTitle`) |
| Multiple Leaders | Any one may approve |
| No Leader | Escalate to next step; if none left → desk **Manager** |
| Teams | Optional under department |
| Team routing | Manager toggle: team member requests require **team leader** first, or go straight to department leader |
| Café | emp → HR → Admin (if needed) when solo HR on; emp → Admin when solo HR off |
| Biometrics gateway | **Out of scope** |
| Engine approach | Template steps resolved at runtime (Approach 1) — not named-person chains |

---

## 3. Org model

### 3.1 Departments & teams

- Manager creates **departments** (`hr_department`) — already exists; used in employee selector.
- Manager may create **teams** under a department (`hr_team`, new).
- Tenant may use departments only (no teams).

### 3.2 Employee org fields

On hire / register / edit (staff HR):

| Field | UI | Storage |
|-------|-----|---------|
| Department | Selector from Manager departments | `hr_employee.department` (code) |
| Team | Optional selector (teams of that department) | `hr_employee.teamId` |
| Position | Radio: **Leader** \| **Employee** | `hr_employee.orgPosition` |
| Specific role | Free text (skill / professional name) | `hr_employee.jobTitle` (reuse) |

**Leader** on a team = team leader for that team.  
**Leader** on a department (no team, or department-level) = department leader for that department.

### 3.3 Café

- Same tables; default approval flows are short (see §5).
- Apex `hrSoloManagerEnabled` still controls whether café HR is hosted by Admin vs HR Manager role.

---

## 4. Approval engine

### 4.1 Flow definition

Manager config portal stores **`hr_approval_flow`**:

- `requestType`: `leave` | `overtime` | … (Phase A implement leave; UI can list OT for config)
- `departmentId`: null = **tenant default**; else department-specific override
- `requireTeamLeaderFirst`: boolean — when employee has a team, whether `team_leader` is enforced before other steps
- `stepsJson`: ordered list of `{ "kind": "team_leader" | "department_leader" | "hr" | "manager" | "admin" }`
- `active`: boolean

Resolution order when submitting:

1. Department-specific flow for `(requestType, employee.department)` if active  
2. Else tenant default flow for `requestType`  
3. Else built-in fallback: lodging → `[department_leader, manager]`; café + solo HR → `[hr, admin]`; café no solo HR → `[admin]`

### 4.2 Runtime

1. Employee submits request → create row (`hr_leave_request` for leave) with `status=pending`, `currentStepIndex=0`, `flowId` set.
2. Build effective step list (apply `requireTeamLeaderFirst`: if false, strip `team_leader` steps when evaluating; if employee has no team, skip `team_leader` steps).
3. Resolve assignees for current step:
   - `team_leader` → active employees with `teamId` = requester’s team and `orgPosition=leader`
   - `department_leader` → active employees in same department with `orgPosition=leader` (and typically no conflicting rule; any Leader in dept)
   - `hr` → credential role `HR`
   - `manager` → credential role `Manager`
   - `admin` → credential role `Admin`
4. Empty assignees → **escalate** (record `hr_approval_action` decision `escalated`) → next step; if no steps left → treat as desk Manager inbox / auto-route to Manager step if not already present.
5. Approve → write action → next step or final `approved` + leave side effects.
6. Reject → `rejected`, notify employee, stop.

### 4.3 Surfaces

| Actor | App | Sees |
|-------|-----|------|
| Employee (requester) | hotcol-emp | Own leave list/status; notifications |
| Employee Leader | hotcol-emp | **My approvals** queue |
| HR / Manager / Admin | hotcol-user | Pending steps for their desk role; Manager config portal |

Notifications: unified bell only (no announcements product).

---

## 5. Manager customization portal (UI)

New HR section (Manager/Admin), e.g. **Workflows** / **Approval config**:

1. **Departments** — existing editor; link to teams.
2. **Teams** — CRUD under a department.
3. **Approval flows** — pick request type → edit default chain and optional per-department overrides; toggle require team leader first; drag/reorder step kinds.
4. Preview copy: “For Kitchen leave: Team leader → Department leader → Manager”.

Employee master (HR Manager): org fields from §3.2.

---

## 6. Data model (Prisma)

### Extend

- `hr_employee.orgPosition` String `@default("employee")` — `leader` | `employee`
- `hr_employee.teamId` Int?
- `hr_leave_request.flowId` Int?
- `hr_leave_request.currentStepIndex` Int `@default(0)`
- Final `decidedBy` / `decidedAt` still set on terminal approve/reject

### New

```
hr_team
  id, HotelName, departmentId, code, label, active, sortOrder, timestamps
  @@unique([HotelName, departmentId, code])

hr_approval_flow
  id, HotelName, requestType, departmentId?, requireTeamLeaderFirst, stepsJson, active, timestamps
  @@index([HotelName, requestType, active])

hr_approval_action
  id, HotelName, requestType, requestId, stepIndex, stepKind,
  actorType, actorEmployeeId?, actorUserName?, decision, note, createdAt
  @@index([HotelName, requestType, requestId])
```

### Not used for leave routing

- `hr_employee_capability` — retain for future grants; leave/OT use flows + `orgPosition`
- Biometric gateway / device sync — out of scope

---

## 7. hotcol-emp ESS (Phase A)

| Area | Behavior |
|------|----------|
| Login / force OTP change | Already shipped |
| Home + notification bell | Already shipped; wire leave/approval hrefs |
| Profile | View (and allowlisted edit e.g. photo); show department, team, position, specific role |
| Leave | Request + list own; status shows current step |
| My approvals | Pending items where user is Leader assignee |
| Payslips | Read-only own slips |
| Attendance | Read-only own clock/leave days |

---

## 8. Out of scope (this slice)

- Biometric device adapters / sync UI  
- Full Phase B profile fields (gender, TIN, education, …) beyond org fields above  
- Excel import  
- Named-person approval chains  

---

## 9. Relation to prior Phase A lock

Prior Task 0 “supervisor recommend → Manager countersign” becomes the **default lodging leave template**, not a hard-coded exclusive path. Manager may shorten or lengthen chains per department. F04 OTP reset and other Manager-bell items unchanged.

---

## 10. Success criteria

- Manager can create teams and a leave flow with ≥2 steps and a department override.  
- Leader in emp app can approve in-scope leave; non-Leader cannot.  
- No Leader → escalates; final approve/reject updates leave status and notifies employee.  
- Emp can request leave, see payslips and profile org fields.  
- Café defaults apply when no custom flow exists.  
- No biometric gateway code shipped.
