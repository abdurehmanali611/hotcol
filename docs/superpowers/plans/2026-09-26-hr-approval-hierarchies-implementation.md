# HR Approval Hierarchies + ESS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Manager-configurable per-department approval chains (leave first), org fields (Leader/Employee + optional teams), and hotcol-emp ESS (leave, approvals, payslips, profile).

**Architecture:** Template step engine in `BackEnd/hrApprovalEngine.js` resolves `team_leader` / `department_leader` / `hr` / `manager` / `admin` against org data; flows stored in `hr_approval_flow`; actions in `hr_approval_action`. Staff GraphQL + Manager portal in `hotcol-user`; employee submit/approve/read in `hotcol-emp`. No biometric gateway.

**Tech Stack:** Prisma/MySQL, GraphQL (user + emp), Next.js, existing HR UI chrome.

**Spec:** `docs/superpowers/specs/2026-09-26-hr-approval-hierarchies-design.md`

## Global Constraints

- UI label **HR Manager** for credential role `HR`.
- Notifications = single bell channel only.
- Biometric gateway: **do not implement**.
- Café defaults: solo HR on → `[hr, admin]`; off → `[admin]`; lodging fallback → `[department_leader, manager]`.
- Position: `orgPosition` = `leader` | `employee`; specific role text stays in `jobTitle`.
- Multiple Leaders: any one; zero Leaders: escalate; if no steps left: desk Manager.
- Sync Prisma models into `hotcol-emp/BackEnd/prisma/schema.prisma` after user migrate/`db push`.

---

## File map

| Path | Responsibility |
|------|----------------|
| `BackEnd/prisma/schema.prisma` | `orgPosition`, `teamId`; `hr_team`; `hr_approval_flow`; `hr_approval_action`; leave flow fields |
| `BackEnd/hrApprovalEngine.js` | Resolve flow, assignees, advance/reject/escalate |
| `BackEnd/scripts/test-hr-approval-engine.mjs` | Unit tests for resolve/escalate |
| `BackEnd/hrGraphql.js` | Teams, flows, leave wired to engine; employee org fields |
| `components/hr/HrApprovalConfigPanel.tsx` | Manager portal: flows + teams toggle |
| `components/hr/HrTeamsPanel.tsx` | Team CRUD under departments |
| `components/hr/HrEmployeesPanel.tsx` | Hire/edit: department, team, position radio, specific role |
| `components/hr/HrDashboard.tsx` | Nav section `workflows` |
| `hotcol-emp/BackEnd/employeeGraphql.js` | Own leave, decide as leader, payslips, profile, pending approvals |
| `hotcol-emp/app/home/page.tsx` + routes | ESS nav: leave, approvals, payslips, profile |

---

### Task 1: Prisma — org + approval tables

**Files:**
- Modify: `BackEnd/prisma/schema.prisma`
- Sync: `hotcol-emp/BackEnd/prisma/schema.prisma`
- Create migration SQL under `BackEnd/prisma/migrations/` if migrate works; else `db push` (user consent if AI blocked)

**Produces:**
- `hr_employee.orgPosition String @default("employee")`
- `hr_employee.teamId Int?`
- `hr_team`, `hr_approval_flow`, `hr_approval_action`
- `hr_leave_request.flowId Int?`, `currentStepIndex Int @default(0)`

- [ ] **Step 1:** Add models/fields per spec §6.
- [ ] **Step 2:** Apply to DB (`db push` or migrate).
- [ ] **Step 3:** Copy relevant models to emp schema; `npx prisma generate` in both BackEnds.
- [ ] **Step 4:** Commit.

```bash
git commit -m "feat(hr): schema for teams and configurable approval flows"
```

---

### Task 2: Approval engine helpers + tests

**Files:**
- Create: `BackEnd/hrApprovalEngine.js`
- Create: `BackEnd/scripts/test-hr-approval-engine.mjs`

**Produces (exports):**
- `STEP_KINDS = ["team_leader","department_leader","hr","manager","admin"]`
- `normalizeSteps(steps): {kind}[]`
- `effectiveSteps(flow, { hasTeam }): {kind}[]` — strips `team_leader` if `!requireTeamLeaderFirst || !hasTeam`
- `pickFlow(flows, { requestType, departmentId })` — dept override then default
- `defaultSteps({ businessType, hrSoloManagerEnabled })` — café/lodging fallbacks
- `async resolveAssignees(prisma, { HotelName, kind, employee })` → `{ employeeIds: number[], roles: string[] }`
- `async advanceLeaveAfterDecision(prisma, { leave, approve, actor, note })` — writes `hr_approval_action`, updates leave

- [ ] **Step 1:** Write test file covering: strip team_leader when no team; dept override wins; empty leaders → escalate to next; final approve sets status approved.
- [ ] **Step 2:** Implement engine until tests PASS.
- [ ] **Step 3:** Commit.

```bash
node BackEnd/scripts/test-hr-approval-engine.mjs
# Expected: PASS
git commit -m "feat(hr): approval engine resolve and escalate helpers"
```

---

### Task 3: Staff GraphQL — teams, flows, employee org, leave engine

**Files:**
- Modify: `BackEnd/hrGraphql.js`
- Modify: `lib/api/hr.ts`

**Produces:**
- Queries: `hrTeams(departmentId)`, `hrApprovalFlows(requestType)`
- Mutations: `upsertHrTeam`, `deleteHrTeam`, `upsertHrApprovalFlow`, `deleteHrApprovalFlow`
- `createHrEmployee` / `updateHrEmployee` accept `orgPosition`, `teamId`
- `createHrLeaveRequest` attaches flow + notifies first assignees
- `decideHrLeaveRequest` uses engine (desk roles on their step); Manager can still act on manager/admin steps

- [ ] **Step 1:** Wire typeDefs + resolvers.
- [ ] **Step 2:** Client API helpers in `lib/api/hr.ts`.
- [ ] **Step 3:** Commit.

```bash
git commit -m "feat(hr): GraphQL for teams, approval flows, leave engine"
```

---

### Task 4: Manager portal UI + employee org fields

**Files:**
- Create: `components/hr/HrApprovalConfigPanel.tsx`
- Create: `components/hr/HrTeamsPanel.tsx` (or combine into config panel)
- Modify: `components/hr/HrEmployeesPanel.tsx`
- Modify: `components/hr/HrDashboard.tsx`, `hrChrome.tsx`

**Produces:**
- Nav section `workflows` (Manager/Admin): request type selector, step chips reorder, require-team-leader toggle, per-department override, teams CRUD
- Employee form: department select, team select (filtered), Leader/Employee radio, specific role text

- [ ] **Step 1:** Implement panels + nav.
- [ ] **Step 2:** Manual smoke: save leave flow with department_leader → manager.
- [ ] **Step 3:** Commit.

```bash
git commit -m "feat(hr): Manager approval workflow config portal"
```

---

### Task 5: hotcol-emp — leave, approvals, payslips, profile GraphQL

**Files:**
- Modify: `hotcol-emp/BackEnd/employeeGraphql.js`
- Copy/share: approval engine or thin re-export of decide path using same Prisma models
- Modify: `hotcol-emp/lib/api/employee.ts`

**Produces:**
- `myLeaveRequests`, `createOwnLeaveRequest(...)`
- `pendingApprovalsForMe`, `decideLeaveAsAssignee(id, approve, note)`
- `myPayslips`, `employeeMe` includes org fields; `updateOwnProfile(profileImageUrl)` allowlisted

- [ ] **Step 1:** Implement resolvers (scope: own rows only; decide only if assignee).
- [ ] **Step 2:** Client API.
- [ ] **Step 3:** Commit in hotcol-emp.

```bash
git commit -m "feat(emp): leave submit, leader approve, payslips GraphQL"
```

---

### Task 6: hotcol-emp ESS UI

**Files:**
- Modify: `hotcol-emp/app/home/page.tsx` — nav cards
- Create: `app/leave/page.tsx`, `app/approvals/page.tsx`, `app/payslips/page.tsx`, `app/profile/page.tsx`
- Gate: mustChangeOtp redirect on all routes

- [ ] **Step 1:** Leave request + list.
- [ ] **Step 2:** My approvals queue.
- [ ] **Step 3:** Payslips + profile.
- [ ] **Step 4:** Commit.

```bash
git commit -m "feat(emp): ESS leave, approvals, payslips, profile UI"
```

---

### Task 7: Verification + plan checkboxes

- [ ] Manager: create team, leave flow with team_leader → department_leader → manager; override one department.
- [ ] Emp Leader: sees approval; non-leader does not.
- [ ] No Leader: escalates to Manager desk.
- [ ] Emp: leave, payslips, profile work.
- [ ] Café default when no custom flow.
- [x] Update `docs/superpowers/plans/2026-09-25-hotcol-hr-ess-implementation.md` — mark biometric cancelled; point to this plan for 5c.

---

## Spec coverage

| Spec § | Task |
|--------|------|
| Org departments/teams/Leader | 1, 4 |
| Flow templates + café defaults | 2, 3 |
| Lifecycle approve/reject/escalate | 2, 3, 5 |
| Manager portal | 4 |
| Emp ESS | 5, 6 |
| No biometrics | Global constraint |
