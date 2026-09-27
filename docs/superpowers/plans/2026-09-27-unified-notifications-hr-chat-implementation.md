# Unified notifications + HR employee chat — Implementation Plan

> **For agentic workers:** Use this as the checklist. Spec: `docs/superpowers/specs/2026-09-27-unified-notifications-hr-chat-design.md`

**Goal:** Ship (1) one Manager/Admin ops+HR notification bell with All/HR/Rooming/Inventory filters, and (2) emp↔emp + emp↔manager chat with blocks and Manager/Admin history portal.

**Architecture:** Adapter UI for notifications; new Prisma chat tables + GraphQL in hotcol-user backend; emp GraphQL surface in hotcol-emp.

---

## File map

### Notifications
- Create: `components/notifications/HotcolNotificationCenter.tsx`
- Create: `lib/hotcolUnifiedNotifications.ts` (merge + filter types)
- Modify: `app/(Hotel)/Manager/page.tsx`, `app/(Cafe)/Admin/page.tsx` (and other dual-bell terminals if needed)
- Keep: `HrNotificationCenter` internals reusable or inline fetch; `InventoryNotificationCenter` builders

### Chat — backend (hotcol-user)
- Modify: `BackEnd/prisma/schema.prisma` — chat tables
- Create: `BackEnd/hrChatGraphql.js` (or section in `hrGraphql.js`)
- Wire: `BackEnd/index.js` / typeDefs merge

### Chat — staff UI (hotcol-user)
- Create: `components/hr/HrEmployeeChatCenter.tsx` (Manager/Admin icon sheet)
- Create: `components/hr/HrChatControlPortal.tsx` (blocks + history)
- Create: `lib/api/hrChat.ts`
- Modify: Manager + Café Admin headers

### Chat — emp (hotcol-emp)
- Extend: emp `employeeGraphql.js` + `lib/api/employee.ts`
- Create: `components/emp/EmpChatCenter.tsx`
- Modify: `EmpAppShell` / home header for chat icon

---

## Task 1: Unified notification center

**Files:** create HotcolNotificationCenter + merge helper; wire Manager + Café Admin.

- [ ] Build merge adapter (HR fetch + inventory/lodging props)
- [ ] UI: badge, list, chips All/HR/Rooming/Inventory
- [ ] Replace dual bells on Manager + Café Admin
- [ ] Manual: open Manager with HR module — see mixed list and filters

## Task 2: Chat schema + staff GraphQL

- [ ] Add Prisma models + migrate/generate
- [ ] Resolvers: threads, messages, send, create, blocks CRUD, history query
- [ ] Enforce HR Module + Manager (hotel) / Admin (café) for control APIs
- [ ] Block checks on create/send

## Task 3: Manager/Admin chat UI + control portal

- [ ] Chat icon next to Apex feedback
- [ ] Thread list + composer
- [ ] Control portal: blocks form (path + comboboxes) + history filters

## Task 4: Emp chat API + UI

- [ ] Emp GraphQL for own threads/messages
- [ ] Chat icon next to notifications on emp shell/home
- [ ] DM + group create; respect blocks

## Task 5: Polish + verify

- [ ] Empty states, unread badges, polling
- [ ] Confirm Apex + billing icons untouched
- [ ] Smoke: emp↔emp, emp↔manager, blocked path refused

---

## Execution order

Do Task 1 first (independent). Then Task 2 → 3 → 4 → 5.
