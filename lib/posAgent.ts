export type CafePrintLine = {
  title: string;
  quantity: number;
  price: number;
  station?: string;
};

export type CafePrintTicket = {
  isUpdate?: boolean;
  hotelName?: string;
  propertyName?: string;
  tableNo: number;
  tableLabel?: string;
  waiterName?: string;
  /** Kitchen ticket vs Bar ticket — printed as a large header. */
  station?: "Kitchen" | "Bar";
  lines: CafePrintLine[];
};

export const POS_AGENT_DEFAULT_URL = "http://127.0.0.1:1818";
export const POS_AGENT_DOWNLOAD_PATH = "/api/pos-agent/server";
export const POS_AGENT_LAUNCHER_DOWNLOAD_PATH = "/api/pos-agent/launcher";
const POS_PRINTER_STORAGE_KEY = "hotcol_pos_printer_name";

export function posAgentBaseUrl(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_POS_AGENT_URL
      : undefined;
  const raw = String(fromEnv || POS_AGENT_DEFAULT_URL).trim();
  return raw.replace(/\/+$/, "");
}

function cafePrintPropertyName(hotelName?: string): string {
  if (typeof window !== "undefined") {
    const display = localStorage.getItem("hotel_display_name")?.trim();
    if (display) return display;
  }
  const raw = String(hotelName || "").trim();
  if (!raw || /^TIN_/i.test(raw)) return "HotCol";
  return raw;
}

function cafePrintTableLabel(tableNo: number, tableLabel?: string): string {
  const explicit = String(tableLabel || "").trim();
  if (explicit) return explicit;
  if (Number.isFinite(tableNo) && tableNo > 0) return `Table ${tableNo}`;
  return "Counter";
}

function ticketTotal(lines: CafePrintLine[]): number {
  return lines.reduce(
    (sum, line) => sum + Number(line.price || 0) * Number(line.quantity || 0),
    0,
  );
}

export function readSavedPosPrinterName(): string {
  if (typeof window === "undefined") return "";
  return String(localStorage.getItem(POS_PRINTER_STORAGE_KEY) || "").trim();
}

export function writeSavedPosPrinterName(name: string): void {
  if (typeof window === "undefined") return;
  const next = String(name || "").trim();
  if (next) localStorage.setItem(POS_PRINTER_STORAGE_KEY, next);
  else localStorage.removeItem(POS_PRINTER_STORAGE_KEY);
}

export async function fetchPosAgentHealth(): Promise<{
  ok: boolean;
  printer?: string;
}> {
  const response = await fetch(`${posAgentBaseUrl()}/health`, {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("POS agent health check failed");
  }
  return (await response.json()) as { ok: boolean; printer?: string };
}

export async function fetchPosAgentPrinters(): Promise<string[]> {
  const response = await fetch(`${posAgentBaseUrl()}/printers`, {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Could not list printers from the POS agent");
  }
  const body = (await response.json()) as { printers?: string[] };
  return Array.isArray(body.printers) ? body.printers.filter(Boolean) : [];
}

export async function printPosAgentTestTicket(): Promise<void> {
  await printCafeOrderTicket({
    hotelName: "HotCol",
    tableNo: 0,
    tableLabel: "Test",
    waiterName: "Setup",
    station: "Kitchen",
    lines: [{ title: "Printer test", quantity: 1, price: 0 }],
  });
}

export async function printCafeOrderTicket(
  ticket: CafePrintTicket,
): Promise<void> {
  const lines = ticket.lines.filter((line) => Number(line.quantity) > 0);
  if (lines.length === 0) {
    throw new Error("Nothing to print");
  }

  const url = `${posAgentBaseUrl()}/print`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isUpdate: Boolean(ticket.isUpdate),
        hotelName: ticket.hotelName || "",
        propertyName: ticket.propertyName || cafePrintPropertyName(ticket.hotelName),
        tableNo: ticket.tableNo,
        tableLabel: cafePrintTableLabel(ticket.tableNo, ticket.tableLabel),
        waiterName: ticket.waiterName || "",
        station: ticket.station || "",
        printerName: readSavedPosPrinterName(),
        lines,
        total: ticketTotal(lines),
      }),
    });
  } catch {
    throw new Error(
      "POS agent is not running or the USB printer is disconnected. Start the POS agent and try again.",
    );
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      detail = String(body.error || body.message || "").trim();
    } catch {
      detail = "";
    }
    throw new Error(
      detail ||
        "The thermal printer did not accept the ticket. Check the USB connection and try again.",
    );
  }
}
