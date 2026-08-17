# HotCol POS agent (analog café)

The POS agent is a **small local program that runs on the cashier PC**. The browser cannot talk to a USB thermal printer directly, so the café app sends the ticket to this agent on `http://127.0.0.1:1818`, and the agent sends raw ESC/POS bytes to Windows.

Use it only when the tenant’s café order mode is **analog (thermal printer)**. Digital tenants use kitchen/bar screens and do not need this agent.

## What it does

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Confirms the agent is running |
| `GET /printers` | Lists Windows printer names |
| `POST /print` | Prints one kitchen/bar ticket |

If print fails (agent down, USB unplugged, printer not shared), the cashier sees **Failed order**. The line is logged as Failed in manager reports and **is not treated as paid**. Payment is still collected later in the cashier Payment section (cash / bank / credit), same as digital.

## Trial on this development machine

1. Plug in a USB thermal printer (80mm or 58mm) and install its Windows driver. Share it in Windows so `\\localhost\<PrinterName>` works (`copy /b` needs a share).
2. From this repo:

```powershell
cd pos-agent
node server.mjs
```

You should see: `[hotcol-pos-agent] listening on http://127.0.0.1:1818`.

3. Optional env vars (PowerShell):

```powershell
$env:POS_AGENT_PORT = "1818"
$env:POS_PRINTER_NAME = "Exact Windows printer name"
node server.mjs
```

If `POS_PRINTER_NAME` is empty, the agent picks a printer whose name looks like POS / thermal / receipt / 80mm / 58mm, otherwise the first Windows printer.

4. Keep `npm run dev` running for the café app. Analog cashiers print from Orders; the app calls `http://127.0.0.1:1818/print`.
5. Quick checks:

```powershell
curl http://127.0.0.1:1818/health
curl http://127.0.0.1:1818/printers
```

If the café app is on another host, set `NEXT_PUBLIC_POS_AGENT_URL` (still usually `http://127.0.0.1:1818` because the **browser** talks to the agent on **that cashier PC**).

## Ground / production (each analog cashier PC)

Install Node.js LTS on the cashier computer. Copy the `pos-agent` folder (or a packaged start script). Run the agent **at Windows logon** (Task Scheduler, Startup folder, or a small service wrapper).

1. USB printer plugged into **that** cashier PC (not a remote print server unless you know the share name).
2. Share the printer in Windows (Devices and Printers → printer → Printer properties → Sharing).
3. Start the agent with the exact printer name:

```powershell
$env:POS_PRINTER_NAME = "POS-80"
node C:\HotCol\pos-agent\server.mjs
```

4. The cashier uses Chrome/Edge to open the HotCol café URL. The POS agent stays local; the GraphQL API stays on your server.
5. If two cashiers each have a printer, each PC runs its own agent on `127.0.0.1:1818`. Do not point one browser at another PC’s agent unless you intentionally change the URL (not recommended).

## Typical failures

| Symptom | Likely cause |
| --- | --- |
| “POS agent is not running…” | `node server.mjs` not started, or port not 1818 |
| “No Windows printer found” | Driver missing; set `POS_PRINTER_NAME` |
| “Could not send the ticket…” | Printer not shared as `\\localhost\Name` |
| Ticket prints but order Failed | API save failed after print — retry; manager sees Failed |

The Chrome extension timeout (`chrome: call method`) is unrelated to HotCol; it comes from a browser extension, not the POS agent.
