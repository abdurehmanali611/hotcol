"""
HotCol Crystal AI Assist — Phase 2 Colab / local starter
=======================================================

Paste into Google Colab or run locally:

  pip install fastapi uvicorn[standard] pyngrok
  python crystal_ai_assist_starter.py

Then set in hotcol-user `.env.local`:

  CRYSTAL_AI_ASSIST_URL=https://<ngrok-host>/assist

CONTRACT (must match HotCol):
  POST /assist
  body: { query, candidates:[{id,amharic,romanized,english,crystalLabel}], source? }
  resp: { action: "pick"|"none", crystalId?, confidence?, reason? }

Rules:
  - Only pick an id from candidates
  - Prefer "none" when unsure
  - HotCol never auto-saves; it only boosts the suggestion
"""

from __future__ import annotations

import re
from typing import Any, Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Replace this stub with YOUR model (embeddings, fine-tune, LLM+RAG, …)
# ---------------------------------------------------------------------------

def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def compact(text: str) -> str:
    return re.sub(r"[^a-z0-9\u1200-\u137f]+", "", normalize(text))


def stub_score(query: str, candidate: dict[str, Any]) -> float:
    """
    Toy scorer so the endpoint works before you plug a real model.
    Returns 0..1. Replace with your Colab model.
    """
    q = normalize(query)
    qc = compact(query)
    if not q:
        return 0.0

    fields = [
        candidate.get("romanized") or "",
        candidate.get("english") or "",
        candidate.get("amharic") or "",
        candidate.get("crystalLabel") or "",
    ]
    best = 0.0
    for field in fields:
        f = normalize(field)
        fc = compact(field)
        if not f:
            continue
        if f == q or fc == qc:
            best = max(best, 1.0)
        elif f.startswith(q) or fc.startswith(qc):
            best = max(best, 0.9)
        elif q in f or qc in fc:
            best = max(best, 0.75)
        else:
            # ordered subsequence density
            ti = 0
            hits = 0
            for ch in qc:
                j = fc.find(ch, ti)
                if j < 0:
                    hits = 0
                    break
                hits += 1
                ti = j + 1
            if hits == len(qc) and len(qc) >= 2:
                dens = hits / max(len(fc), 1)
                best = max(best, min(0.7, 0.35 + dens))
    return best


PICK_THRESHOLD = 0.55  # tune in Colab


def decide(query: str, candidates: list[dict[str, Any]]) -> dict[str, Any]:
    if not candidates:
        return {"action": "none", "confidence": 0.0, "reason": "no_candidates"}

    scored: list[tuple[float, dict[str, Any]]] = []
    for c in candidates:
        scored.append((stub_score(query, c), c))
    scored.sort(key=lambda x: x[0], reverse=True)
    best_score, best = scored[0]

    if best_score >= PICK_THRESHOLD:
        return {
            "action": "pick",
            "crystalId": int(best["id"]),
            "confidence": round(float(best_score), 4),
            "reason": "stub_scorer",
        }
    return {
        "action": "none",
        "confidence": round(float(best_score), 4),
        "reason": "below_threshold",
    }


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

class Candidate(BaseModel):
    id: int
    amharic: str = ""
    romanized: str = ""
    english: str = ""
    crystalLabel: str = ""


class AssistRequest(BaseModel):
    query: str
    candidates: list[Candidate] = Field(default_factory=list)
    source: str | None = None


class AssistResponse(BaseModel):
    action: Literal["pick", "none"]
    crystalId: int | None = None
    confidence: float | None = None
    reason: str | None = None


app = FastAPI(title="HotCol Crystal AI Assist", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True, "service": "hotcol-crystal-ai-assist"}


@app.post("/assist", response_model=AssistResponse)
def assist(body: AssistRequest) -> AssistResponse:
    result = decide(
        body.query,
        [c.model_dump() for c in body.candidates],
    )
    # Safety: never return an id that was not in the request
    if result.get("action") == "pick":
        allowed = {c.id for c in body.candidates}
        if result.get("crystalId") not in allowed:
            return AssistResponse(
                action="none",
                confidence=0.0,
                reason="pick_not_in_candidates",
            )
    return AssistResponse(**result)


if __name__ == "__main__":
    import uvicorn

    # Local: http://127.0.0.1:8089/assist
    # Colab: run uvicorn in a thread, then ngrok http 8089
    uvicorn.run(app, host="0.0.0.0", port=8089)
