import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { mkdtemp, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.POS_AGENT_PORT || 1818);
const PRINTER_NAME = String(process.env.POS_PRINTER_NAME || "").trim();

function esc(text) {
  return Buffer.from(String(text ?? ""), "utf8");
}

function money(n) {
  return Number(n || 0).toFixed(2);
}

function buildEscPos(ticket) {
  const chunks = [];
  const push = (buf) => chunks.push(Buffer.isBuffer(buf) ? buf : esc(buf));
  push(Buffer.from([0x1b, 0x40]));
  push(Buffer.from([0x1b, 0x61, 0x01]));
  if (ticket.isUpdate) {
    push(Buffer.from([0x1b, 0x21, 0x30]));
    push("*** ORDER UPDATE ***\n");
    push(Buffer.from([0x1b, 0x21, 0x00]));
  }
  push(Buffer.from([0x1b, 0x21, 0x10]));
  push(`${ticket.hotelName || "HotCol"}\n`);
  push(Buffer.from([0x1b, 0x21, 0x00]));
  push("--------------------------------\n");
  push(Buffer.from([0x1b, 0x61, 0x00]));
  push(`Table: ${ticket.tableNo}\n`);
  if (ticket.waiterName) push(`Waiter: ${ticket.waiterName}\n`);
  push(`${new Date().toLocaleString("en-GB", { timeZone: "Africa/Addis_Ababa" })}\n`);
  if (ticket.isUpdate) push("Kitchen/Bar: this is an UPDATE ticket\n");
  push("--------------------------------\n");
  for (const line of ticket.lines || []) {
    const qty = Number(line.quantity) || 0;
    const title = String(line.title || "");
    const station = line.station ? ` [${line.station}]` : "";
    push(`${qty} x ${title}${station}\n`);
    push(`    ${money(Number(line.price) * qty)} ETB\n`);
  }
  push("--------------------------------\n");
  push(Buffer.from([0x1b, 0x21, 0x08]));
  push(`TOTAL  ${money(ticket.total)} ETB\n`);
  push(Buffer.from([0x1b, 0x21, 0x00]));
  push("\n\n");
  push(Buffer.from([0x1d, 0x56, 0x41, 0x20]));
  return Buffer.concat(chunks);
}

async function listWindowsPrinters() {
  try {
    const { stdout } = await execFileAsync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        "Get-Printer | Select-Object -ExpandProperty Name",
      ],
      { windowsHide: true },
    );
    return String(stdout)
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function printRaw(buffer) {
  const printers = await listWindowsPrinters();
  const name =
    PRINTER_NAME ||
    printers.find((p) => /pos|thermal|receipt|80mm|58mm/i.test(p)) ||
    printers[0];
  if (!name) {
    throw new Error(
      "No Windows printer found. Set POS_PRINTER_NAME to your USB thermal printer.",
    );
  }
  const dir = await mkdtemp(join(tmpdir(), "hotcol-pos-"));
  const file = join(dir, "ticket.bin");
  await writeFile(file, buffer);
  try {
    await execFileAsync(
      "cmd",
      ["/c", `copy /b "${file}" "\\\\localhost\\${name}"`],
      { windowsHide: true },
    );
  } catch (error) {
    throw new Error(
      `Could not send the ticket to printer "${name}". Share the USB printer or set POS_PRINTER_NAME. ${
        error instanceof Error ? error.message : ""
      }`.trim(),
    );
  } finally {
    await unlink(file).catch(() => {});
  }
  return name;
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(json);
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);

  if (req.method === "GET" && url.pathname === "/health") {
    send(res, 200, { ok: true, printer: PRINTER_NAME || "auto" });
    return;
  }

  if (req.method === "GET" && url.pathname === "/printers") {
    const printers = await listWindowsPrinters();
    send(res, 200, { printers });
    return;
  }

  if (req.method === "POST" && url.pathname === "/print") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    let ticket;
    try {
      ticket = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    } catch {
      send(res, 400, { error: "Invalid print payload" });
      return;
    }
    if (!Array.isArray(ticket.lines) || ticket.lines.length === 0) {
      send(res, 400, { error: "Ticket has no lines" });
      return;
    }
    try {
      const printer = await printRaw(buildEscPos(ticket));
      send(res, 200, { ok: true, printer });
    } catch (error) {
      send(res, 503, {
        error:
          error instanceof Error
            ? error.message
            : "Thermal printer connection failed",
      });
    }
    return;
  }

  send(res, 404, { error: "Not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[hotcol-pos-agent] listening on http://127.0.0.1:${PORT}`);
  if (PRINTER_NAME) console.log(`[hotcol-pos-agent] printer: ${PRINTER_NAME}`);
});
