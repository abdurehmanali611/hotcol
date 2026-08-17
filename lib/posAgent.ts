export type CafePrintLine = {
  title: string;
  quantity: number;
  price: number;
  station?: string;
};

export type CafePrintTicket = {
  isUpdate?: boolean;
  hotelName?: string;
  tableNo: number;
  waiterName?: string;
  lines: CafePrintLine[];
};

export const POS_AGENT_DEFAULT_URL = "http://127.0.0.1:1818";

export function posAgentBaseUrl(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_POS_AGENT_URL
      : undefined;
  const raw = String(fromEnv || POS_AGENT_DEFAULT_URL).trim();
  return raw.replace(/\/+$/, "");
}

function ticketTotal(lines: CafePrintLine[]): number {
  return lines.reduce(
    (sum, line) => sum + Number(line.price || 0) * Number(line.quantity || 0),
    0,
  );
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
        tableNo: ticket.tableNo,
        waiterName: ticket.waiterName || "",
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
