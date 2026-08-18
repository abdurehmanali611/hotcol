import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

/** Lets cashier PCs download the double-click Windows launcher. */
export async function GET() {
  const filePath = join(
    process.cwd(),
    "pos-agent",
    "Start HotCol POS Agent.bat",
  );
  const body = await readFile(filePath);
  return new Response(body, {
    headers: {
      "Content-Type": "application/x-bat; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="Start HotCol POS Agent.bat"',
      "Cache-Control": "no-store",
    },
  });
}
