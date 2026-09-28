# Lodging Recent Actions — PDF & Excel export

**Date:** 2026-09-28  
**Status:** Approved (chat) — implement

## Goal

Add Export PDF and Export Excel to Manager Rooming → Reports → Recent actions (`LodgingActionHistoryPanel`).

## Decisions

- Export **all loaded** logs (not only the current page).
- Controls: two outline buttons in the card header (Export PDF, Export Excel), same pattern as Past guests.
- Columns: When, Action, Actor, Role, Entity, What changed (same readable detail string as the UI).
- Excel: reuse `exportRowsExcel`; sheet `Recent actions`; file `lodging-recent-actions.xlsx`.
- PDF: new helper `downloadLodgingActionHistoryPdf` beside other lodging PDF helpers; Helvetica-safe text; landscape table.

## Out of scope

- Server-side date-range fetch for export
- Changing what logs are loaded into the panel
