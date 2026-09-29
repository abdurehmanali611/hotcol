# HotCol ATS (Phase B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship multi-tenant ATS: Manager sets role OTPs in `hotcol-user`; public apply at `hotcol-ats/(Candidate)/[tin]`; Admin pipeline behind role OTP session; offer accepted hands off to HR hire + OTP.

**Architecture:** Shared MySQL. Manager ATS OTP create/rotate GraphQL in `hotcol-user/BackEnd`. Candidate + Admin GraphQL in `hotcol-ats/BackEnd` (Apollo, default port **4006**). `hotcol-ats` Next frontend calls `NEXT_PUBLIC_ATS_GRAPHQL_URL` (fallback `NEXT_PUBLIC_GRAPHQL_URL`, default `http://localhost:4006/graphql`).

**Tech Stack:** Next.js (`hotcol-user`, `hotcol-ats`), Prisma/MySQL, GraphQL, bcryptjs (reuse `hrPortalOtp` generators), Cloudinary raw upload for CVs.

**Spec:** `docs/superpowers/specs/2026-09-29-hr-phase-b-redesign-design.md` §2.6

## Global Constraints

- ATS OTPs: role `HR` | `Manager`; hashed at rest; plaintext globally unique; managed only in `hotcol-user`.
- Candidate URL: `(Candidate)/[tin]/…`; UI shows tenant **display name** from TIN.
- Admin actions audited with session **role**.
- CV: `NEXT_PUBLIC_CLOUDINARY_FILE_PRESET_NAME` + `/raw/upload`.
- Pipeline: `applied → screening → interview → offer → offer_accepted` (+ `rejected` | `withdrawn`).
- No unauthenticated OTP setup on `hotcol-ats`.

---

## File map

| File | Responsibility |
|------|----------------|
| `BackEnd/prisma/schema.prisma` (+ ats copy if mirrored) | `ats_access_otp`, `ats_vacancy`, `ats_application` |
| `BackEnd/atsPortalOtp.js` | Generate/hash/verify/uniqueness for ATS role OTPs |
| `BackEnd/atsGraphql.js` | GraphQL types + resolvers for OTP, vacancies, applications, admin session |
| `BackEnd/index.js` | Mount ATS schema |
| `constants/index.ts` | `hr-ats-otp` nav id |
| `components/hr/HrAtsOtpPanel.tsx` | Manager UI: role radio, Get OTP, Save |
| `app/(Hotel)/Manager/page.tsx` | Wire ATS OTP tab under HR |
| `lib/api/ats.ts` | Client API helpers |
| `hotcol-ats/app/(Candidate)/[tin]/…` | Public jobs + apply |
| `hotcol-ats/app/(Admin)/…` | OTP gate + vacancies/pipeline |
| `hotcol-ats/lib/atsSession.ts` | Client session helpers |
| `hotcol-ats/lib/cloudinary.ts` | Already has file upload |

---

## Task 1: Schema + ATS OTP backend

**Deliverable:** Tables exist; Manager can generate/save/list ATS OTPs via GraphQL (show plaintext once).

- [x] Add Prisma models `ats_access_otp`, `ats_vacancy`, `ats_application`
- [x] Add `atsPortalOtp.js` (reuse generate/hash from portal OTP; uniqueness vs `ats_access_otp.otpLookup` and optionally employee lookup)
- [x] GraphQL: `atsAccessOtps`, `upsertAtsAccessOtp(role)`, `atsTenantByTin(tin)` (+ vacancies/applications/admin unlock)
- [ ] Migrate / `prisma db push` (**run locally** — push may hang in agent env)
- [ ] Manual test: Manager mutation returns OTP once; hash stored; second tenant cannot reuse code

## Task 2: Manager ATS OTP UI

**Deliverable:** Polished **HR → ATS OTP** panel in Manager.

- [x] Nav id `hr-ats-otp` + section mapping
- [x] `HrAtsOtpPanel`: show existing roles status; radio HR/Manager; Get OTP + Save; copy; clear preview after leave
- [x] Wire Manager page + subscription module

## Task 3: Candidate public site

**Deliverable:** `/{tin}` careers page lists open jobs; apply with CV.

- [x] `(Candidate)/[tin]/page.tsx` — resolve name, list open vacancies
- [x] Job detail + apply form → create application + Cloudinary file upload
- [x] Soft empty state for unknown TIN

## Task 4: Admin OTP session + vacancies + pipeline

**Deliverable:** Unlock Admin with OTP; CRUD vacancies; move application stages; audit role.

- [x] Admin login page → `atsAdminUnlock(otp)` → localStorage token session
- [x] Vacancies list/create/close scoped to session TIN
- [x] Applications board by status; update status
- [x] Guard Admin APIs with session JWT

## Task 5: Offer → hire handoff (stretch in same epic)

**Deliverable:** `offer_accepted` can create employee + issue hire OTP (Manager approval F40 as required).

- [x] Mutation `hireAtsApplication` → `hr_employee` + portal OTP (Manager ATS session; offer/offer_accepted only)
- [x] F40: status → `offer` / `offer_accepted` requires Manager role OTP
- [x] UI **Hire → HR + OTP** on Admin applications when status is offer / offer_accepted

---

## Execution

Inline execution started 2026-09-29. Tasks 1–5 coded; Task 1 `prisma db push` still needs a local run.
