import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { mkdtemp, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.POS_AGENT_PORT || 1818);
const PRINTER_NAME = String(process.env.POS_PRINTER_NAME || "").trim();
const VIRTUAL_PRINTER_RE =
  /onenote|xps|fax|anydesk|microsoft print to pdf|pdf creator|cutepdf|adobe pdf/i;
const THERMAL_PRINTER_RE = /pos|thermal|receipt|80mm|58mm|epson|star |xp-|rongta|xprinter|bixolon/i;

function esc(text) {
  return Buffer.from(String(text ?? ""), "utf8");
}

function money(n) {
  return Number(n || 0).toFixed(2);
}

const TICKET_WIDTH = 32;

function padLine(left, right = "", width = TICKET_WIDTH) {
  const l = String(left ?? "");
  const r = String(right ?? "");
  if (!r) return l.slice(0, width);
  const space = Math.max(1, width - l.length - r.length);
  return `${l.slice(0, width - r.length - 1)}${" ".repeat(space)}${r}`.slice(
    0,
    width,
  );
}

function wrapWords(text, width) {
  const raw = String(text ?? "").trim() || "-";
  const words = raw.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const piece = word.length > width ? word.slice(0, width) : word;
    if (!current) {
      current = piece;
      continue;
    }
    if (`${current} ${piece}`.length <= width) {
      current = `${current} ${piece}`;
    } else {
      lines.push(current);
      current = piece;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function divider() {
  return `${"-".repeat(TICKET_WIDTH)}\n`;
}

function stationTitle(station) {
  const key = String(station || "").trim().toLowerCase();
  if (key === "bar" || key === "barista") return "BAR";
  if (key === "kitchen" || key === "chef") return "KITCHEN";
  return key ? String(station).toUpperCase() : "ORDER";
}

function stationSubtitle(station) {
  const key = String(station || "").trim().toLowerCase();
  if (key === "bar" || key === "barista") return "Barista ticket";
  if (key === "kitchen" || key === "chef") return "Chef ticket";
  return "Order ticket";
}

function tableLabel(ticket) {
  if (ticket.tableLabel) return String(ticket.tableLabel).trim();
  const n = Number(ticket.tableNo);
  if (Number.isFinite(n) && n > 0) return `Table ${n}`;
  return "Counter";
}

function propertyName(ticket) {
  return (
    String(ticket.propertyName || ticket.hotelName || "").trim() || "HotCol"
  );
}

function buildEscPos(ticket) {
  const chunks = [];
  const push = (buf) => chunks.push(Buffer.isBuffer(buf) ? buf : esc(buf));
  const lines = Array.isArray(ticket.lines) ? ticket.lines : [];
  const itemCount = lines.reduce(
    (sum, line) => sum + (Number(line.quantity) || 0),
    0,
  );
  const when = new Date().toLocaleString("en-GB", {
    timeZone: "Africa/Addis_Ababa",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  push(Buffer.from([0x1b, 0x40]));
  push(Buffer.from([0x1b, 0x61, 0x01]));
  push(Buffer.from([0x1b, 0x21, 0x08]));
  push(`${propertyName(ticket)}\n`);
  push(Buffer.from([0x1b, 0x21, 0x00]));
  if (ticket.isUpdate) {
    push(Buffer.from([0x1b, 0x21, 0x30]));
    push("UPDATE\n");
    push(Buffer.from([0x1b, 0x21, 0x00]));
    push("Add these items\n");
  }
  push(Buffer.from([0x1b, 0x21, 0x30]));
  push(`${stationTitle(ticket.station)}\n`);
  push(Buffer.from([0x1b, 0x21, 0x00]));
  push(`${stationSubtitle(ticket.station)}\n`);
  push(Buffer.from([0x1b, 0x61, 0x00]));
  push(divider());
  push(`${padLine("Table", tableLabel(ticket))}\n`);
  if (ticket.waiterName) {
    push(`${padLine("Waiter", String(ticket.waiterName).trim())}\n`);
  }
  push(`${padLine("Time", when)}\n`);
  push(divider());
  push(Buffer.from([0x1b, 0x21, 0x08]));
  push(`${padLine("Qty  Item", "ETB")}\n`);
  push(Buffer.from([0x1b, 0x21, 0x00]));

  for (const line of lines) {
    const qty = Math.max(1, Math.floor(Number(line.quantity) || 1));
    const title = String(line.title || "Item").trim();
    const amount = money(Number(line.price || 0) * qty);
    const qtyText = String(qty).padStart(2, " ");
    const titleWidth = TICKET_WIDTH - 4;
    const wrapped = wrapWords(title, titleWidth);
    push(Buffer.from([0x1b, 0x21, 0x10]));
    push(`${qtyText}  ${wrapped[0] || "-"}\n`);
    push(Buffer.from([0x1b, 0x21, 0x00]));
    for (const extra of wrapped.slice(1)) {
      push(`    ${extra}\n`);
    }
    push(`    ${padLine("", amount, TICKET_WIDTH - 4)}\n`);
  }

  push(divider());
  push(Buffer.from([0x1b, 0x21, 0x08]));
  push(`${padLine("TOTAL", `${money(ticket.total)} ETB`)}\n`);
  push(Buffer.from([0x1b, 0x21, 0x00]));
  push(Buffer.from([0x1b, 0x61, 0x01]));
  push(`${itemCount} item${itemCount === 1 ? "" : "s"}  ·  Unpaid\n`);
  push("Collect payment at cashier\n");
  push(Buffer.from([0x1b, 0x61, 0x00]));
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

async function resolvePrinterName(requested = "") {
  const printers = await listWindowsPrinters();
  const want = String(requested || PRINTER_NAME || "").trim();
  if (want) {
    const exact = printers.find(
      (p) => p.toLowerCase() === want.toLowerCase(),
    );
    if (!exact) {
      throw new Error(
        `Printer "${want}" was not found on this PC. Installed printers: ${
          printers.join(", ") || "(none)"
        }`,
      );
    }
    return exact;
  }
  const thermal = printers.find((p) => THERMAL_PRINTER_RE.test(p));
  if (thermal) return thermal;
  const real = printers.find((p) => !VIRTUAL_PRINTER_RE.test(p));
  if (real) return real;
  throw new Error(
    "No USB thermal printer found. In the café app open Printer setup, pick the Windows printer name, then try again. Software printers (OneNote, PDF, Fax) are not used.",
  );
}

async function printRaw(buffer, requestedName = "") {
  const name = await resolvePrinterName(requestedName);
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
      `Could not send the ticket to printer "${name}". Share the USB printer in Windows (Printer properties → Sharing) or set POS_PRINTER_NAME. ${
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

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/print")) {
    send(res, url.pathname === "/print" ? 405 : 200, {
      ok: url.pathname === "/",
      service: "hotcol-pos-agent",
      printer: PRINTER_NAME || "auto (thermal only — not OneNote/PDF)",
      endpoints: {
        health: "GET /health",
        printers: "GET /printers",
        print: "POST /print",
      },
      note:
        url.pathname === "/print"
          ? "Open /print in the browser does nothing. The café app POSTs JSON here."
          : "The café analog cashier prints via POST /print. GET /health and GET /printers are for checks only.",
    });
    return;
  }

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
      const printer = await printRaw(buildEscPos(ticket), ticket.printerName);
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
