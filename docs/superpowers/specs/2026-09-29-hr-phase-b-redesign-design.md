# HotCol HR Phase B — Redesign Lock

**Date:** 2026-09-29  
**Updated:** 2026-09-29 (ATS TIN routes; role OTPs in Manager HR; Candidate display name)  
**Status:** Locked for review (implementation starts only when product owner says go)  
**Supersedes (Phase B backlog shape):** Part 2 of `docs/superpowers/plans/2026-09-25-hotcol-hr-ess-implementation.md` where this note conflicts  
**Parent:** `docs/superpowers/specs/2026-09-25-hotcol-hr-ess-design.md` (Phase A complete)  
**Repos:** `hotcol-user` (Manager ATS OTP settings + hire handoff), `hotcol-ats` (public Candidate + OTP-gated Admin pipeline), `hotcol` (Apex); `hotcol-emp` only where ESS surfaces apply  

---

## 1. Goal

Ship Phase B as short slices that deepen payroll, roster, hire lifecycle, **ATS recruiting**, and Finance handoff — without building unused PRD weight (full document vault, premature GL post).

Global Phase A constraints still apply: HR Manager label, notifications-only, OTP rules, module-gated Finance, emp least privilege, HotCol UI polish.

---

## 2. Locked product decisions

### 2.1 Employee import (ex-F26 / B1 import)

| Decision | Detail |
|----------|--------|
| **Where** | **Apex only** — same pattern as inventory item / stock / purchase import |
| **When** | After tenant account exists; **reusable** (not a one-shot script). Typical first use: seed roster after subscribe |
| **Ongoing hire** | `hotcol-user` HR **employee registration** (single + **batch insert**). No Excel mapper in Manager/HR portal |
| **Not** | Import at account-create wizard; import UI inside hotel Manager |

Profile field extensions (gender, education, TIN, medical note, etc.) may ship with Apex import / employee form in the same or adjacent slice.

### 2.2 Statutory tax & pension (ex-F29 / B3) — hotel-defined bands

**Approach:** Simplified hotel rules (not full ET progressive law tables). Schema should still store discrete band rows so a future compliance engine can upgrade.

**UI home:** Manager payroll settings, **Statutory** block adjacent to common deductions/increases (familiar place; not mixed into optional hotel deductions without a clear type).

**Band fields (per rule row):**

| Field | Required | Meaning |
|-------|----------|---------|
| Kind | Yes | `tax` \| `pension` (and later splits if needed) |
| Rate % | Yes | Applied to **full** matching salary/base when band matches |
| From (ETB) | Yes | Salary **≥** From |
| To (ETB) | No | If set: salary **&lt;** To. If empty: no upper bound (salary **≥** From) |
| Effective | Yes | `always` **or** calendar **From–To date range** (upgrade existing “always / day range” idea to date-range pickers) |

**Examples:**

- `10% · From 2000 · To 20000` → salaries in **[2000, 20000)** → **10% × full salary**
- `15% · From 20000 · To (empty)` → salaries **≥ 20000** → **15% × full salary**
- Salary **1500** with lowest From **2000** and **no** band covering below 2000 → **not taxable** for that kind (**0%**). Managers who want tax on low salaries must add an explicit band (e.g. From 0).

**Engine:** Pick the **single** matching band for the salary; apply that rate to the full chosen base (base salary / gross — pin in implementation to current payslip gross inputs). **Not** progressive slices across multiple bands.

**Validation:**

1. If To set → **To > From**
2. Bands of the same kind + overlapping effective period must **not overlap** on salary ranges
3. UI lists bands sorted by From ascending

**Approval:** Keep F29 spirit — publish/change statutory rules may require Manager (and Finance when HR+Fin) per existing matrix; exact bell wiring in implementation plan.

### 2.3 Shift templates (ex-F33 / B5) — additive

| Decision | Detail |
|----------|--------|
| **Keep** | Current shift scheduling UI and `HrShift` rows |
| **Add** | Optional **templates** (recipes without people) |
| **Apply** | Pick template + employees + date range → expand into existing shift create path |

**Template fields:** name/code, department, startTime, endTime (overnight allowed), weekday pattern, notes, active.

If templates unused, scheduling behaves exactly as Phase A.

### 2.4 HR documentation library (ex-F35 / B6)

**Shipped (product lock):** Tenant library — **title**, **description**, Cloudinary **file** upload (same raw preset pattern as ATS CVs). **Not** per-employee vault.

| Role | Capability |
|------|------------|
| HR | Upload, list, download, delete |
| Manager | List, download, delete (no upload) |

Model: `hr_library_document`. Employee `hr_document` metadata API remains for legacy/employee-linked notes if needed.

### 2.5 Onboarding / exit checklists (ex-F36–F37 / B7)

| Piece | Behavior |
|-------|----------|
| **Templates** | Manager configures Onboarding and Exit item lists: label, required?, default owner (HR / Store / IT / Finance / Manager), sort |
| **Runs** | On hire / terminate, copy template → per-employee checklist run |
| **UI** | Checkbox items: done/pending, completedBy, completedAt, optional note |
| **Complete** | Required items must be done. **Exit complete** requires **Manager approval** (F37). Onboarding complete (F36) no Manager bell |

### 2.6 ATS (ex-F40) — **in scope** (`hotcol-ats` ready)

Repo: `Documents/Projects/hotcol-ats` (Next.js + Cloudinary). First-class Phase B workstream.

#### Apps & routes

| Piece | App / route | Who |
|-------|-------------|-----|
| **ATS OTP create / rotate** | `hotcol-user` → Manager → **HR → ATS OTP** (polished UI) | Manager (staff login) |
| **Public jobs + apply + CV** | `hotcol-ats` `(Candidate)/[tin]/…` | Anyone (no account) |
| **Vacancy CRUD, pipeline, offer** | `hotcol-ats` `(Admin)/…` after ATS OTP unlock | HR or Manager **role** bound to the OTP used |
| **Offer accepted → employee + hire OTP** | Handoff into existing HR path in `hotcol-user` | After F40 / offer flow |

SaaS: one ATS deploy; tenant isolation by **TIN**. Jobs and applications are always stored under the posting tenant’s TIN.

#### Public Candidate URL & branding

- Path uses **TIN** for routing/lookup: `(Candidate)/[tin]/…`.
- UI shows the **tenant display name** resolved from that TIN (not the raw TIN as the hero title).
- Candidate sees **open** vacancies only; unknown/inactive TIN → empty or soft not-found (limit enumeration).
- Apply: name, phone, email, CV, optional note. No candidate account in v1.

#### Admin access — role OTPs (not HotCol staff password inside ATS)

Weak “one shared PIN for everyone” is rejected. Instead:

| Rule | Detail |
|------|--------|
| **Where managed** | **`hotcol-user` only** — Manager HR sidebar: **ATS OTP** menu (create / edit), polished UI |
| **Per tenant** | Up to **two** access codes: role **HR** and role **Manager** (radio when creating/updating) |
| **Flow in Manager UI** | Select role (HR \| Manager) → **Get OTP** → **Save** → generates code, stores **hash** + role + tenant TIN |
| **Update later** | Same screen: rotate OTP for that role (re-hash; invalidate old Admin sessions for that role when practical) |
| **Uniqueness** | Plaintext OTP must be **globally unique** across tenants (and roles) at generate/save time |
| **At rest** | **Hash only** (same discipline as employee portal OTP) — never store plaintext after show-once |
| **ATS Admin unlock** | Enter OTP → verify hash → issue **short-lived httpOnly session** bound to `{ tin, role }` |
| **Action tracking** | Every Admin mutation records actor as the session **role** (`HR` \| `Manager`) so moves/offers are audit-friendly |

Do **not** expose “set ATS OTP” on an unauthenticated `hotcol-ats` URL.

#### CV upload (locked tech)

| Item | Detail |
|------|--------|
| Storage | Same Cloudinary cloud as HotCol |
| Image preset | `NEXT_PUBLIC_CLOUDINARY_PRESET_NAME` → `…/image/upload` |
| File/CV preset | `NEXT_PUBLIC_CLOUDINARY_FILE_PRESET_NAME` → `…/raw/upload` |
| Helper | `hotcol-ats/lib/cloudinary.ts` — `uploadImageToCloudinary` + `uploadFileToCloudinary` |
| Allowed CV types | PDF (required); DOC/DOCX optional |
| Persist | `secureUrl`, `publicId`, bytes, format, original filename on the application |

#### Pipeline (minimum)

`applied → screening → interview → offer → offer_accepted`  
Terminal: `rejected` \| `withdrawn`  

**Offer accepted** → create employee + hire OTP via existing HR path. Offer/hire-from-ATS follows **F40** (Manager YES at offer stage) per Part 0a.

#### Data

Shared MySQL with HotCol (`ats_*` models keyed by TIN / HotelName). GraphQL or ATS API on shared DB — no duplicate employee master.

### 2.7 Finance handoff (ex-F45–F46 / B9)

| Concept | Meaning | Phase B |
|---------|---------|---------|
| Mark paid (F18) | Existing payslip payment workflow | Keep |
| Manager final (F19) | Existing | Keep |
| Bank / payment file (F45) | Export CSV/file for bank transfer | **In scope** when prioritized |
| Post to Finance GL (F46) | Journal/ledger entries | **Out** until Finance has real GL; do not label mark-paid as “post” |

---

## 3. Suggested implementation order (when go is given)

ATS may proceed **in parallel** with payroll/roster slices (separate repo), but offer→hire OTP still depends on existing HR hire path in `hotcol-user`.

1. **Statutory bands** in payroll settings + generate engine  
2. **Apex employee import** (+ profile fields as needed)  
3. **HR batch register** polish if not already enough  
4. **ATS** — Manager **ATS OTP** in `hotcol-user`; `(Candidate)/[tin]` + `(Admin)` OTP session + pipeline in `hotcol-ats`; offer accepted → employee + hire OTP  
5. **Shift templates** (additive)  
6. **Onboarding / exit checklists**  
7. **Payroll bank export**  
8. **Document vault** (when reopened)  
9. **True GL post** (when Finance ledger exists)

Salary history / advances / loans / bonuses (F28, F30–F32) remain desirable B payroll depth; schedule relative to statutory bands in the writing-plans pass when implementation starts.

---

## 4. Out of scope (this lock)

- Full Ethiopian progressive tax law tables as the only engine  
- Removing current shift scheduling  
- HR document vault / file expiry product (ATS CVs are separate)  
- Fake “post to Finance” that is only mark-paid renamed  
- Excel import inside Manager portal  
- Unauthenticated ATS OTP setup inside `hotcol-ats`  

---

## 5. Approval record (2026-09-29 brainstorming)

- Apex reusable import + HR register/batch for ongoing hire — accepted  
- Hotel-defined tax/pension bands; one matching band × full salary; uncovered below From = not taxable — accepted  
- Band To optional; To > From; no overlaps — accepted  
- Effective always or calendar date range — accepted  
- Shift templates additive — accepted  
- Document vault deferred — accepted  
- Onboarding/exit checkbox runs + exit Manager approval — accepted  
- **ATS in scope** via `hotcol-ats` — accepted  
  - Candidate public `(Candidate)/[tin]`; display **tenant name** from TIN — accepted  
  - Admin OTP-gated pipeline in `hotcol-ats`; short-lived session after unlock — accepted  
  - **Role OTPs (HR \| Manager)** created/rotated only in **`hotcol-user` Manager → HR → ATS OTP**; Get OTP + Save; hashed; globally unique; actions tracked by role — accepted  
  - Cloudinary file preset for CVs; offer accepted → employee + hire OTP — accepted  
- Bank export before true GL post — accepted  
- Implementation starts **only when product owner says go** — accepted  

---

## 6. Next step

1. Product owner reviews this file.  
2. On “go,” invoke writing-plans for the chosen first slice(s) — statutory bands and/or ATS — then implement.  
3. Optionally patch Part 2 of `2026-09-25-hotcol-hr-ess-implementation.md` to point at this redesign lock.

---

*Design note only — no code until go (except ATS Cloudinary helpers already added in `hotcol-ats`).*
