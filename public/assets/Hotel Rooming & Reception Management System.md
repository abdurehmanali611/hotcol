# Hotel Rooming & Reception Management System

**Revised specification summary**  
Suitable for hotels, pensions, lodges, and resorts (≈10–500+ rooms). Cloud-capable, multi-user front-office PMS with a responsive hotel-style UI.

---

## 1. Purpose

An all-in-one front-office system covering:

| Domain | Capabilities |
|--------|----------------|
| Inventory | Rooms, room types, statuses, amenities |
| Guests | Registration, CRM, VIP/corporate/agency |
| Stay lifecycle | Reservations, walk-in, check-in, transfer, extension, check-out |
| Money | Folios, payments, invoices, taxes, discounts, cashier |
| Operations | Housekeeping, maintenance, night audit, reception desk |
| Control | Roles, settings, audit logs, reports |

---

## 2. Users & Access

**Default roles:** Super Admin, General Manager, Receptionist, Cashier, Housekeeping, Restaurant/Bar, Accountant, Maintenance, Auditor.

Permissions are configurable per role (view, create, edit, delete, approve, print, export, refund, discount, check-in, check-out, void).

---

## 3. Core Modules (summary)

### Dashboard
Real-time room counts (available, occupied, reserved, dirty/clean, OOO/maintenance), today’s arrivals/departures, occupancy %, revenue, outstanding balances, no-shows/overstays, plus charts for occupancy, revenue, and room-type performance.

### Rooms & room map
Full inventory (number, floor, type, bed, capacity, rate, amenities, photos, notes). Statuses: Available, Occupied, Reserved, Dirty, Clean, Inspected, Out of Order, Out of Service, Maintenance, Blocked. Visual board with assign / transfer / block / status change (drag-and-drop where useful).

### Reservations
Sources (walk-in, phone, web, OTA, agency, corporate, group). Statuses (tentative → confirmed → checked-in/out, cancelled, no-show). Supports modify, cancel, upgrade/downgrade, extend, multi-room and group bookings.

### Walk-in
Fast path: find room → register guest → rate/discount → deposit → registration card → check-in → receipt (minimal clicks).

### Guest CRM
Profiles with ID documents, preferences, VIP/company links, and history (stays, payments, services, complaints).

### Check-in / transfer / check-out
Individual, group, early/VIP, multi-room check-in. Transfers update inventory, folio, housekeeping, and audit. Checkout aggregates all charges, supports multi-method payment (cash, bank, Telebirr, credit, other), then closes folio, marks room Dirty, and notifies housekeeping.

### Folio, payments & cashier
Post room and ancillary charges; void/transfer/split/merge; company vs guest billing. Cashier open/close with expected vs actual cash. Receipts, invoices, refunds (authorized).

### Housekeeping & maintenance
Cleaning workflow: Occupied → Checkout → Dirty → Cleaning → Clean → Inspected → Available. Maintenance tickets take rooms out of sellable inventory until resolved.

### Night audit
Verify arrivals/departures, post room/tax charges, flag no-shows/overstays, close business day (restricted), generate daily reports and audit trail.

### Rates, tax & billing config
Standard, corporate, promo, seasonal, weekend, group, long-stay, event rates. Configurable VAT/service/WHT/custom taxes (not hard-coded). Preserve historical rates on folios when rates change later.

### POS / F&B
Post restaurant/bar (and related) charges to verified guest rooms; REST/webhook-ready for POS, laundry, accounting.

### Documents & reports
Branded invoices, receipts, registration cards, confirmations, cashier/daily reports. Front-office, financial, and management KPIs (occupancy, ADR, RevPAR, ALOS, source analysis). Filter and export PDF / Excel / CSV / print.

### Search, notifications, audit
Global search by guest, phone, ID, room, reservation, invoice, receipt. Alerts for arrivals, payments, VIP, maintenance, no-shows, etc. Immutable audit log of material actions.

### Settings & security
Hotel profile, numbering, currency (default ETB), check-in/out times, users/roles. Auth with hashed passwords, sessions, auto-logout, RBAC, input validation, XSS/SQLi/CSRF protections, backup/restore.

---

## 4. Business rules (non-negotiable)

1. No overlapping double-booking unless shared/group occupancy is explicitly allowed.  
2. OOO / Maintenance rooms cannot be reserved.  
3. Checkout → room Dirty; HK Dirty → Clean; only authorized staff Clean → Inspected.  
4. Check-in needs a valid guest and assigned room.  
5. Checkout must settle (or authorize credit for) outstanding balance.  
6. Refunds and high discounts need authorization / manager approval.  
7. Financial lines are voided, not hard-deleted; full audit trail required.  
8. Folio rates stay frozen historically after posting.

---

## 5. Non-functional expectations

- Production PMS quality (not a prototype): real workflows, validation, loading/empty/error states, transaction safety.  
- Performance: indexed search, server-side pagination, concurrent users.  
- UX: quick actions (reservation, walk-in, check-in/out, payment, transfer, search); responsive desktop/tablet/mobile.  
- Demo seed: e.g. “Apex Grand Hotel” with realistic rooms, guests, stays, payments, HK/maintenance so the dashboard is live on install.

---

## 6. Suggested data domains

Users/roles/permissions · Guests & documents · Room types/rooms/amenities · Reservations & stay events · Folios/payments/invoices · Housekeeping & maintenance · Rates/taxes/discounts · Cashier sessions · Night audits · Notifications · Hotel settings · Audit logs.

Normalized relational model with PKs/FKs, indexes, timestamps, soft delete where appropriate.

---

## 7. Acceptance path

End-to-end: **Reservation → Registration → Assignment → Check-in → Charges → Payment → POS charge → Transfer → Extension → Check-out → Invoice → Housekeeping → Night audit → Reports.**

---

*This document revises and consolidates the original build brief into a single readable specification. It does not prescribe implementation stack or code.*
