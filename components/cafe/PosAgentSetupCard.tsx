"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Download,
  Loader2,
  Printer,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchPosAgentHealth,
  fetchPosAgentPrinters,
  POS_AGENT_DOWNLOAD_PATH,
  POS_AGENT_LAUNCHER_DOWNLOAD_PATH,
  printPosAgentTestTicket,
  readSavedPosPrinterName,
  writeSavedPosPrinterName,
} from "@/lib/posAgent";

const VIRTUAL_PRINTER_RE =
  /onenote|xps|fax|anydesk|microsoft print to pdf|pdf creator|cutepdf|adobe pdf/i;

export default function PosAgentSetupCard() {
  const [agentUp, setAgentUp] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [printerName, setPrinterName] = useState("");
  const [testing, setTesting] = useState(false);

  const usablePrinters = useMemo(
    () => printers.filter((name) => !VIRTUAL_PRINTER_RE.test(name)),
    [printers],
  );

  const refreshAgent = useCallback(async () => {
    setChecking(true);
    try {
      await fetchPosAgentHealth();
      setAgentUp(true);
      const list = await fetchPosAgentPrinters();
      setPrinters(list);
    } catch {
      setAgentUp(false);
      setPrinters([]);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    setPrinterName(readSavedPosPrinterName());
    void refreshAgent();
  }, [refreshAgent]);

  const savePrinter = (name = printerName) => {
    const next = name.trim();
    if (!next) {
      toast.error("Select or type the Windows printer name");
      return false;
    }
    writeSavedPosPrinterName(next);
    setPrinterName(next);
    toast.success(`Orders will print to "${next}"`);
    return true;
  };

  const testPrint = async () => {
    if (!savePrinter()) return;
    setTesting(true);
    try {
      await printPosAgentTestTicket();
      toast.success("Test ticket sent. Check the thermal printer.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Test print failed. Start the POS agent on this PC.",
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl">
      <Card className="overflow-hidden border-primary/15 bg-card/95 shadow-lg ring-1 ring-black/3 dark:ring-white/6">
        <div className="h-1 bg-linear-to-r from-sky-500 via-cyan-400 to-primary/80" />
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
            <Printer className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            Printer setup
          </CardTitle>
          <CardDescription className="max-w-2xl text-pretty leading-relaxed">
            Do this once on this cashier PC that has the USB printer. Start the
            POS agent, pick the Windows printer name, then keep the agent
            running while analog tickets are printed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5">
            <p className="text-sm font-semibold">1. Install and start the agent</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Install{" "}
              <a
                className="font-medium text-foreground underline underline-offset-2"
                href="https://nodejs.org/"
                target="_blank"
                rel="noreferrer"
              >
                Node.js LTS
              </a>
              , download the launcher and the agent file into the same folder,
              then double-click{" "}
              <code className="rounded bg-background px-1.5 py-0.5 text-foreground">
                Start HotCol POS Agent.bat
              </code>
              . Keep that window open while the café is open.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="h-10">
                <a
                  href={POS_AGENT_LAUNCHER_DOWNLOAD_PATH}
                  download="Start HotCol POS Agent.bat"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download launcher
                </a>
              </Button>
              <Button asChild className="h-10" variant="outline">
                <a href={POS_AGENT_DOWNLOAD_PATH} download="server.mjs">
                  <Download className="mr-2 h-4 w-4" />
                  Download server file
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={() => void refreshAgent()}
                disabled={checking}
              >
                {checking ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Check agent
              </Button>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
              {agentUp === null || checking ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : agentUp ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <span>
                {agentUp === null || checking
                  ? "Looking for the agent on this PC…"
                  : agentUp
                    ? "Agent is running. Choose the printer next."
                    : "Agent is not running. Download both files and double-click the launcher here."}
              </span>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5">
            <p className="text-sm font-semibold">2. Choose the thermal printer</p>
            {usablePrinters.length > 0 ? (
              <Select
                value={
                  usablePrinters.includes(printerName) ? printerName : undefined
                }
                onValueChange={(value) => {
                  setPrinterName(value);
                  writeSavedPosPrinterName(value);
                }}
              >
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue placeholder="Select the USB receipt printer" />
                </SelectTrigger>
                <SelectContent>
                  {usablePrinters.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                {agentUp
                  ? "No thermal printer listed yet. Plug it in, share it in Windows, then check the agent again — or type the exact name below."
                  : "Start the agent to load printers from this PC."}
              </p>
            )}
            <Input
              value={printerName}
              onChange={(e) => setPrinterName(e.target.value)}
              placeholder="Exact Windows printer name"
              className="h-10 bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Skip OneNote, PDF, and Fax. Share the printer: Devices and
              Printers → printer → Printer properties → Sharing.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="h-11 flex-1"
              onClick={() => savePrinter()}
            >
              Save printer
            </Button>
            <PendingButton
              type="button"
              variant="secondary"
              className="h-11 flex-1"
              pending={testing}
              disabled={!agentUp}
              onClick={() => void testPrint()}
            >
              Print test ticket
            </PendingButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
