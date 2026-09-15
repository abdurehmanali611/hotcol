/**
 * Phase-2 crystal AI assist — contract shared by Next proxy + Colab service.
 *
 * The model MUST only choose among provided candidates (or none).
 * Never invent a new crystal id. Never auto-write the form — UI confirms.
 */

export type CrystalAiCandidate = {
  id: number;
  amharic: string;
  romanized: string;
  english: string;
  crystalLabel: string;
};

export type CrystalAiAssistRequest = {
  query: string;
  candidates: CrystalAiCandidate[];
  /** Optional tenant/context hint for logging only */
  source?: string;
};

export type CrystalAiAssistResponse = {
  /** pick = choose one candidate id; none = no confident catalog match */
  action: "pick" | "none";
  crystalId?: number | null;
  /** 0..1 — UI may ignore low confidence picks */
  confidence?: number;
  reason?: string;
};

/** Minimum query length before calling AI. */
export const CRYSTAL_AI_MIN_QUERY_LEN = 2;

/** Send at most this many fuzzy candidates to the model. */
export const CRYSTAL_AI_CANDIDATE_LIMIT = 15;

/** Ignore pick if model confidence is below this (when provided). */
export const CRYSTAL_AI_MIN_CONFIDENCE = 0.45;

export function isCrystalAiAssistConfigured(): boolean {
  // Browser talks to our Next proxy; proxy needs CRYSTAL_AI_ASSIST_URL.
  // Client always may call /api/crystal-ai-assist — server returns 503 if unset.
  return true;
}

export function normalizeCrystalAiResponse(
  raw: unknown,
): CrystalAiAssistResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const action = obj.action === "pick" || obj.action === "none" ? obj.action : null;
  if (!action) return null;
  const crystalId =
    obj.crystalId == null || obj.crystalId === ""
      ? null
      : Number(obj.crystalId);
  const confidence =
    obj.confidence == null ? undefined : Number(obj.confidence);
  return {
    action,
    crystalId:
      crystalId != null && Number.isFinite(crystalId) ? crystalId : null,
    confidence:
      confidence != null && Number.isFinite(confidence)
        ? Math.min(1, Math.max(0, confidence))
        : undefined,
    reason: typeof obj.reason === "string" ? obj.reason : undefined,
  };
}

/**
 * Call HotCol Next proxy → your Colab/ngrok (or production) assist URL.
 * Returns null when assist is unavailable / disabled / errors (fuzzy-only fallback).
 */
export async function requestCrystalAiAssist(
  input: CrystalAiAssistRequest,
  opts?: { signal?: AbortSignal },
): Promise<CrystalAiAssistResponse | null> {
  const query = String(input.query || "").trim();
  if (query.length < CRYSTAL_AI_MIN_QUERY_LEN) return null;
  if (!Array.isArray(input.candidates) || input.candidates.length === 0) {
    // No catalog shortlist — model should return none; skip network when empty.
    return { action: "none", reason: "no_candidates" };
  }

  try {
    const res = await fetch("/api/crystal-ai-assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        candidates: input.candidates.slice(0, CRYSTAL_AI_CANDIDATE_LIMIT),
        source: input.source,
      }),
      signal: opts?.signal,
    });
    if (res.status === 503) {
      // Assist URL not configured — silent fuzzy-only mode.
      return null;
    }
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    return normalizeCrystalAiResponse(json);
  } catch {
    return null;
  }
}

/** Apply assist result onto a ranked candidate list (boost pick to index 0). */
export function applyCrystalAiPickToRows<
  T extends { id: number; crystalLabel: string },
>(
  rows: T[],
  assist: CrystalAiAssistResponse | null,
): { rows: T[]; aiPickedId: number | null } {
  if (!assist || assist.action !== "pick" || assist.crystalId == null) {
    return { rows, aiPickedId: null };
  }
  if (
    assist.confidence != null &&
    assist.confidence < CRYSTAL_AI_MIN_CONFIDENCE
  ) {
    return { rows, aiPickedId: null };
  }
  const idx = rows.findIndex((r) => r.id === assist.crystalId);
  if (idx < 0) return { rows, aiPickedId: null };
  if (idx === 0) return { rows, aiPickedId: assist.crystalId };
  const next = [...rows];
  const [hit] = next.splice(idx, 1);
  next.unshift(hit!);
  return { rows: next, aiPickedId: assist.crystalId };
}
