# Unified notifications + HR employee chat

**Date:** 2026-09-27  
**Status:** Approved for implementation (Approach 1)  
**Repos:** hotcol-user, hotcol-emp

## Summary

1. **Unified notification bell** merges HR DB notifications with inventory + lodging (Rooming) client alerts. Apex feedback chat and billing alerts stay separate icons.
2. **HR Module chat** is **employee ↔ employee** and **employee ↔ Manager** only (ESS + Manager/Admin control). Staff terminal roles do not get their own chat — those people use the employee portal.

## Decisions

| Topic | Choice |
|--------|--------|
| Unified bell sources | HR + Inventory + Rooming (lodging) |
| Bell filters | All · HR · Rooming · Inventory |
| Kept separate | Apex `TenantFeedbackCenter`, subscription/billing icon |
| Chat participants | Active `hr_employee`s + Hotel Manager / Café Admin as Manager seat |
| Chat surfaces | Emp: chat icon next to notification bell. Manager/Admin: chat icon next to Apex chat |
| Thread kinds | 1:1 and groups |
| Who creates groups | Any employee (or Manager); membership subject to blocks |
| Block owner | Hotel **Manager** only; Café **Admin** only |
| Block paths | `emp_emp`, `emp_manager` |
| Block form | Path type + two item-name-style comboboxes (emp_manager: Side B fixed Manager) |
| Default | All chat allowed until blocked |
| Manager messaging | Can always **message out**; blocks stop others initiating to Manager |
| Chat unread | Badge on chat icon only (not flooded into unified ops/HR bell) |
| Transport | Poll ~10–15s (v1); text messages only |
| Module gate | HR Module required for chat |

## Section 1 — Unified notification bell

### UI

- New `HotcolNotificationCenter` replaces side-by-side `HrNotificationCenter` + `InventoryNotificationCenter` where both appear (Hotel Manager, Café Admin, and other terminals that already show the ops bell — keep audience rules).
- Single badge = unread across merged sources.
- Popover: newest first; source chip; title; body snippet; time.
- Filter chips: **All · HR · Rooming · Inventory**.
- Tap: mark read (HR → API; ops → existing localStorage seen) then navigate with existing handlers / HR tab map.

### Sources

- HR: existing `hr_notification` GraphQL.
- Inventory / Rooming: existing client builders + seen store; adapter only — no schema change.

### Out of scope

- Merging Apex feedback or billing into this bell.
- Pushing every chat message into this bell.

## Section 2 — Chat model

### Participants

- Employees via `hotcol-emp` (including people who also hold HR/Store/Chef staff logins — they chat as employees).
- Hotel Manager / Café Admin via Manager/Admin portal as `isManager` member (additional to Apex feedback).

### Allowed conversations

- emp ↔ emp (DM or group of employees)
- emp ↔ manager (DM or group including Manager seat)

### Removed

- No Chat tab on HR / Store / Chef / Finance / Reception terminals as roles.

### Icons

- Emp shell: chat icon beside notification bell.
- Manager/Admin header: chat icon beside Apex feedback icon.

## Section 3 — Blocks

### Form

1. Path type: `emp_emp` | `emp_manager`
2. Side A / Side B comboboxes (Crystal / hotel store item-name pattern)
   - `emp_emp`: both = active employees
   - `emp_manager`: Side A = employee; Side B = fixed Manager/Admin label
3. Optional note; save; list with remove

### Enforcement

- Blocked 1:1 cannot be started.
- Group create refused if any member pair is blocked (clear error).
- Existing threads: blocked pair cannot send; read-only banner.
- Manager/Admin may still message out to anyone.

## Section 4 — History portal + data model

### Chat control portal (Manager hotel / Admin café)

- **Blocks** tab + **History** tab
- History filters: from/to dates, employee combobox, thread type (All/Direct/Group), With Manager (All/Includes Manager/Emp-only)
- Open transcript read-only

### Schema (`HotelName`-scoped)

- `hr_chat_thread` — kind `direct`|`group`, title, createdByEmployeeId?, createdByManagerUserId?, timestamps
- `hr_chat_member` — threadId, employeeId?, isManager, joinedAt, lastReadAt
- `hr_chat_message` — threadId, senderEmployeeId?, senderIsManager, body, createdAt
- `hr_chat_block` — pathType, employeeIdA, employeeIdB?, createdBy, note, timestamps

### APIs

- Emp GraphQL: my threads, messages, send, create DM/group, unread
- Staff GraphQL: Manager/Admin chat + blocks CRUD + filtered history
- Gate: HR Module

## Section 5 — Non-goals (v1)

- Websockets / push
- Image attachments in HR chat
- Export transcripts
- Role-to-role chat matrices
- Merging Apex or billing into unified bell
- Chat message spam into unified notification list

## Self-review

- No placeholders for path types or owners.
- Chat scope matches emp↔emp / emp↔manager only (roles removed).
- Notifications and chat are one product story but two subsystems in Approach 1.
