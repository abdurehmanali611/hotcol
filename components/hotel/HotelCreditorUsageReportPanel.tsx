"use client";

import { useMemo, useState } from "react";
import {
  fetchHotelCreditCompanies,
  fetchHotelCreditConsumptions,
  fetchHotelCreditParties,
  type HotelCreditCompanyRow,
  type HotelCreditConsumptionRow,
  type HotelCreditPartyRow,
} from "@/lib/actions";
import { exportRowsExcel } from "@/lib/hotelInventoryExcelExport";
import { DataTable } from "@/app/StoreItems/data-table";
import {
  buildCreditorUsageColumns,
  usageLines,
} from "@/lib/dataTableColumns/creditorUsage";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileSpreadsheet, Search } from "lucide-react";
import { toast } from "sonner";

export function HotelCreditorUsageReportPanel({
  tenantLabel,
}: {
  tenantLabel: string;
}) {
  const [rows, setRows] = useState<HotelCreditConsumptionRow[]>([]);
  const [partyById, setPartyById] = useState<Map<number, HotelCreditPartyRow>>(
    () => new Map(),
  );
  const [companyById, setCompanyById] = useState<Map<number, string>>(
    () => new Map(),
  );
  const [companyFilter, setCompanyFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const fromIso = new Date(`${from}T00:00:00`).toISOString();
      const toIso = new Date(`${to}T23:59:59`).toISOString();
      const [report, companies] = await Promise.all([
        fetchHotelCreditConsumptions(fromIso, toIso),
        fetchHotelCreditCompanies(),
      ]);
      const cmap = new Map<number, string>();
      (companies as HotelCreditCompanyRow[]).forEach((c) =>
        cmap.set(c.id, c.companyName),
      );
      setCompanyById(cmap);
      setRows(report);

      const pmap = new Map<number, HotelCreditPartyRow>();
      const companyIds = [...new Set(report.map((r) => r.companyId))];
      for (const cid of companyIds) {
        try {
          const plist = await fetchHotelCreditParties(cid);
          plist.forEach((p) => pmap.set(p.id, p));
        } catch {
          // Ignore one company failure and continue.
        }
      }
      setPartyById(pmap);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load creditor usage report";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (companyFilter !== "all" && String(r.companyId) !== companyFilter) {
        return false;
      }
      if (!term) return true;
      const party = partyById.get(r.partyId);
      const hay = `${party?.displayName ?? ""} ${party?.phoneNumber ?? ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [rows, companyFilter, search, partyById]);

  const columns = useMemo(
    () => buildCreditorUsageColumns(companyById, partyById),
    [companyById, partyById],
  );

  return (
    <div className="space-y-6">
      <Card className="border-primary/15 shadow-md overflow-hidden">
        <div className="h-0.5 bg-linear-to-r from-primary/60 to-violet-500/40" />
        <CardHeader className="pb-2">
          <CardTitle className="text-lg sm:text-xl tracking-tight">
            Creditor staff usage report
          </CardTitle>
          <CardDescription>
            Visible for Cost Control, Finance, and Manager. Tracks corporate-credit
            staff usage and supports Excel export.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap items-end gap-3">
        <HotelDayPicker
          label="From"
          id="creditor-usage-from"
          value={from}
          onChange={setFrom}
          className="w-44 sm:w-48"
        />
        <HotelDayPicker
          label="To"
          id="creditor-usage-to"
          value={to}
          onChange={setTo}
          className="w-44 sm:w-48"
        />
        <div className="space-y-1">
          <Label>Company</Label>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="h-10 w-56">
              <SelectValue placeholder="All companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {[...companyById.entries()].map(([id, name]) => (
                <SelectItem key={id} value={String(id)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Staff / phone</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="h-10 w-56"
          />
        </div>
        <Button type="button" className="h-10 gap-2" onClick={() => void run()} disabled={loading}>
          <Search className="h-4 w-4" />
          {loading ? "Loading..." : "Run report"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-2"
          onClick={() =>
            void exportRowsExcel(
              `${tenantLabel}_creditor_usage_report`,
              "Creditor_usage",
              filtered.map((r) => {
                const party = partyById.get(r.partyId);
                return {
                  when: new Date(r.occurredAt).toISOString(),
                  company: companyById.get(r.companyId) ?? r.companyId,
                  staff_or_guest: party?.displayName ?? r.partyId,
                  phone: party?.phoneNumber ?? "",
                  total_etb: r.totalAmount,
                  lines: usageLines(r.linesJson).join(" | "),
                  recorded_by: r.recordedBy,
                };
              }),
            )
          }
        >
          <FileSpreadsheet className="h-4 w-4" />
          Export Excel
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage="No report rows for current filters."
        getRowId={(r) => String(r.id)}
      />
    </div>
  );
}
