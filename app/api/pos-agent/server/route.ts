import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

/** Lets analog cashiers download the local USB print agent from the deployed app. */
export async function GET() {
  const filePath = join(process.cwd(), "pos-agent", "server.mjs");
  const body = await readFile(filePath);
  return new Response(body, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Content-Disposition": 'attachment; filename="server.mjs"',
      "Cache-Control": "no-store",
    },
  });
}
