# Crystal AI Assist — Phase 2 (your Colab work)

HotCol Phase 1 already does fuzzy search + Apex pending proposals.
**Phase 2** adds an optional AI helper that runs **only when fuzzy match is weak**.

You build/train/serve the model in **Google Colab**. HotCol only calls your HTTP endpoint.

---

## When HotCol calls your model

1. User types in the crystal name selector.
2. Fuzzy search ranks catalog rows.
3. If the **best fuzzy score is weak** (`>= 50`, i.e. mostly subsequence / uncertain), HotCol POSTs to:

   `POST /api/crystal-ai-assist` (Next.js proxy)

4. The proxy forwards to:

   `CRYSTAL_AI_ASSIST_URL` (your Colab ngrok / Cloud Run URL)

5. If you return `pick`, HotCol **boosts that row to the top** and marks it **AI** — the user still presses **Enter** or clicks. **Never silent overwrite.**
6. If you return `none` (or assist is offline), Phase 1 behavior continues (Enter with no match → Apex proposal).

If `CRYSTAL_AI_ASSIST_URL` is unset → assist is off (503) → fuzzy only.

---

## Request / response contract (must match)

### Request `POST application/json`

```json
{
  "query": "shro bakela",
  "candidates": [
    {
      "id": 42,
      "amharic": "ሽሮ",
      "romanized": "Shero",
      "english": "Chickpea flour / shiro",
      "crystalLabel": "ሽሮ|Shero|Chickpea flour / shiro"
    }
  ],
  "source": "registration"
}
```

- `candidates`: shortlist from fuzzy search (max 15). **You may only pick an `id` from this list.**
- Do **not** invent new catalog rows here (that is Phase 1 “add as new” / Apex).

### Response `application/json`

```json
{
  "action": "pick",
  "crystalId": 42,
  "confidence": 0.82,
  "reason": "shro≈shero; bakela variant"
}
```

or

```json
{
  "action": "none",
  "confidence": 0.1,
  "reason": "no confident catalog match"
}
```

| Field | Rules |
|--------|--------|
| `action` | `"pick"` \| `"none"` only |
| `crystalId` | Required when `pick`; must be one of `candidates[].id` |
| `confidence` | Optional `0..1`. HotCol ignores picks below **0.45** |
| `reason` | Optional string (debug / audit) |

---

## Local wiring

In `hotcol-user/.env.local`:

```env
CRYSTAL_AI_ASSIST_URL=https://YOUR-NGROK/assist
# optional
CRYSTAL_AI_ASSIST_TIMEOUT_MS=8000
```

Restart `npm run dev`.

---

## Colab starter

Use:

- `scripts/colab/crystal_ai_assist_starter.py` — paste into Colab / run with FastAPI + ngrok

Minimal loop for you to replace with a real model:

1. Normalize `query` (lowercase, strip).
2. Score each candidate (string similarity / embeddings / your model).
3. If best score ≥ threshold → `{ action: "pick", crystalId, confidence }`
4. Else → `{ action: "none" }`

Later you can swap the stub scorer for Sentence-Transformers, a fine-tuned classifier, etc.

---

## Files in HotCol (already wired)

| File | Role |
|------|------|
| `lib/crystalNameAiAssist.ts` | Client contract + call proxy |
| `app/api/crystal-ai-assist/route.ts` | Server proxy + candidate guard |
| `lib/crystalNameSearch.ts` | `isWeakCrystalFuzzyMatch` / scored rank |
| `components/crystal/CrystalNameSelector.tsx` | Calls assist on weak fuzzy; AI badge |

---

## What you should code in Colab now

1. Implement `/assist` with the JSON contract above.
2. Expose with ngrok (or deploy).
3. Set `CRYSTAL_AI_ASSIST_URL`.
4. Test: type a weak spelling in registration item name — top row should show **AI** when your model picks.

When your endpoint is live, tell me the URL shape if anything fails (timeouts, CORS, shape errors) and we can tighten the proxy only — your model code stays yours.
