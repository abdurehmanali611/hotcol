import {
  normalizeCrystalAiResponse,
  type CrystalAiAssistRequest,
  type CrystalAiAssistResponse,
} from "@/lib/crystalNameAiAssist";

export const runtime = "nodejs";

/**
 * Phase-2 proxy: browser → this route → CRYSTAL_AI_ASSIST_URL (Colab ngrok / deploy).
 *
 * Env:
 *   CRYSTAL_AI_ASSIST_URL=https://xxxx.ngrok-free.app/assist
 *   CRYSTAL_AI_ASSIST_TIMEOUT_MS=8000 (optional)
 *
 * When unset, returns 503 so the UI stays on Phase-1 fuzzy search only.
 */
export async function POST(req: Request) {
  const assistUrl = String(process.env.CRYSTAL_AI_ASSIST_URL || "").trim();
  if (!assistUrl) {
    return Response.json(
      {
        error: "crystal_ai_assist_unconfigured",
        message:
          "Set CRYSTAL_AI_ASSIST_URL in .env.local to your Colab/ngrok assist endpoint.",
      },
      { status: 503 },
    );
  }

  let body: CrystalAiAssistRequest;
  try {
    body = (await req.json()) as CrystalAiAssistRequest;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const query = String(body?.query || "").trim();
  if (!query) {
    return Response.json({ error: "query_required" }, { status: 400 });
  }
  if (!Array.isArray(body.candidates)) {
    return Response.json({ error: "candidates_required" }, { status: 400 });
  }

  const payload: CrystalAiAssistRequest = {
    query,
    candidates: body.candidates.slice(0, 15).map((c) => ({
      id: Number(c.id),
      amharic: String(c.amharic || ""),
      romanized: String(c.romanized || ""),
      english: String(c.english || ""),
      crystalLabel: String(c.crystalLabel || ""),
    })),
    source: body.source ? String(body.source) : undefined,
  };

  const timeoutMs = Math.min(
    Math.max(
      Number(process.env.CRYSTAL_AI_ASSIST_TIMEOUT_MS) || 8000,
      1000,
    ),
    30000,
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const upstream = await fetch(assistUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return Response.json(
        {
          error: "upstream_error",
          status: upstream.status,
          message: text.slice(0, 300),
        },
        { status: 502 },
      );
    }

    const raw = (await upstream.json()) as unknown;
    const normalized = normalizeCrystalAiResponse(raw);
    if (!normalized) {
      return Response.json(
        { error: "invalid_upstream_shape", raw },
        { status: 502 },
      );
    }

    // Guard: pick must be one of the candidates we sent.
    if (normalized.action === "pick") {
      const ok = payload.candidates.some((c) => c.id === normalized.crystalId);
      if (!ok) {
        const fallback: CrystalAiAssistResponse = {
          action: "none",
          reason: "pick_not_in_candidates",
        };
        return Response.json(fallback);
      }
    }

    return Response.json(normalized);
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return Response.json(
      {
        error: aborted ? "upstream_timeout" : "upstream_unreachable",
        message: e instanceof Error ? e.message : "Assist call failed",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
