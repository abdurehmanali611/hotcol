# HR Module UI Polish (Pass 1) — Design

**Date:** 2026-09-28  
**Scope:** hotcol-user HR role day-to-day surfaces  
**Direction:** Teal / emerald / cyan (option A)  
**Approach:** Chrome-first cascade (option 1)

## Goals

- Make the HR workspace feel more styled, attractive, and colorful without changing behavior.
- Keep shadcn + existing DataTable / form patterns.
- Avoid purple gradients, cream-serif, and generic “AI SaaS” looks.

## In scope

1. Shared chrome (`hrChrome.tsx`): panel shell, section cards, metric cards, status badges, empty states, optional page hero.
2. HR-role panels: Overview, Employees, Leave, Attendance, Documents, Payroll (generate / runs / history as HR uses them), Incidents.
3. `HrDashboard` header / nav active states aligned to the same palette.

## Out of scope (later)

- Manager-only: approvals, workflows, OTP reset, payroll settings deep redesign.
- hotcol-emp portal styling.
- Logic / API / payroll rules changes.

## Visual system

- Accents: teal-600 / cyan-500 / emerald-500 (light + dark-friendly).
- Section cards: thin gradient top rail + soft ring.
- Metrics: tinted gradient tiles with icon wells.
- Badges: status-colored (emerald paid/approved, amber pending, rose reject/unpaid).
- Nav: active pill with teal/emerald wash.

## Success

- HR role screens read as one coherent, colorful workspace.
- No functional regressions; polish is presentation-only.
