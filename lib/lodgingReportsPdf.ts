import { jsPDF } from "jspdf";
import { APEX_SOLUTION, HOTCOL_SYSTEM } from "@/constants/branding";
import type {
  LodgingPerformanceReport,
  LodgingStay,
} from "@/lib/api/lodgingRooms";

export type LodgingReportOrgBrand = {
  companyName: string;
  tinNumber?: string;
  logoUrl?: string | null;
};

export type StayPaymentBreakdown = {
  roomETB: number;
  laundryETB: number;
  foodDrinkETB: number;
  otherETB: number;
  totalETB: number;
};

function money(n: number) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function guestLabel(stay: LodgingStay) {
  const g = stay.guest;
  if (!g) return "—";
  return `${g.firstName} ${g.lastName}`.trim() || "—";
}

function roomsLabel(stay: LodgingStay) {
  return (
    stay.rooms
      ?.map((r) => r.room?.roomNumber)
      .filter(Boolean)
      .join(", ") || "—"
  );
}

function shortDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function imageToDataUrl(src: string): Promise<string | null> {
  try {
    const url =
      src.startsWith("http") ||
      src.startsWith("data:") ||
      src.startsWith("blob:")
        ? src
        : typeof window !== "undefined"
          ? new URL(src, window.location.origin).href
          : src;
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "") || null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function readClientOrgBrand(): LodgingReportOrgBrand {
  if (typeof window === "undefined") {
    return { companyName: "Hotel" };
  }
  const companyName =
    localStorage.getItem("hotel_display_name")?.trim() ||
    localStorage.getItem("hotel_name")?.trim() ||
    "Hotel";
  const tinNumber = localStorage.getItem("tin_number")?.trim() || "";
  const logoUrl = localStorage.getItem("logo_url")?.trim() || "";
  return { companyName, tinNumber, logoUrl: logoUrl || null };
}

function ensureSpace(
  doc: jsPDF,
  y: number,
  need: number,
  pageH: number,
  margin: number,
  onNewPage: () => void,
) {
  if (y + need <= pageH - margin - 12) return y;
  doc.addPage();
  onNewPage();
  return margin + 8;
}

function drawSectionTitle(doc: jsPDF, title: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(title, x, y);
  return y + 5;
}

function drawKpiStrip(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  items: { label: string; value: string }[],
) {
  const gap = 3;
  const cardW = (width - gap * (items.length - 1)) / items.length;
  const cardH = 16;
  items.forEach((item, i) => {
    const cx = x + i * (cardW + gap);
    doc.setFillColor(i === items.length - 1 ? 236 : 248, i === items.length - 1 ? 253 : 250, i === items.length - 1 ? 245 : 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cx, y, cardW, cardH, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label.toUpperCase(), cx + 3, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(item.value, cx + 3, y + 12);
  });
  return y + cardH + 4;
}

function drawTable(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  headers: string[],
  rows: string[][],
  colWeights: number[],
  opts?: {
    alignRight?: boolean[];
    headerRgb?: [number, number, number];
    boldLastRow?: boolean;
  },
) {
  const rowH = 7;
  const totalW = colWeights.reduce((a, b) => a + b, 0);
  const colWs = colWeights.map((w) => (w / totalW) * width);
  const alignRight = opts?.alignRight ?? headers.map(() => false);
  const [hr, hg, hb] = opts?.headerRgb ?? [15, 23, 42];
  let cursorY = y;

  doc.setFillColor(hr, hg, hb);
  doc.rect(x, cursorY, width, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  let cx = x;
  headers.forEach((h, i) => {
    const pad = 1.4;
    if (alignRight[i]) {
      doc.text(h, cx + colWs[i] - pad, cursorY + 4.7, { align: "right" });
    } else {
      doc.text(h, cx + pad, cursorY + 4.7);
    }
    cx += colWs[i];
  });
  cursorY += rowH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  rows.forEach((row, rowIndex) => {
    const isLast = opts?.boldLastRow && rowIndex === rows.length - 1;
    if (isLast) {
      doc.setFillColor(241, 245, 249);
      doc.rect(x, cursorY, width, rowH, "F");
      doc.setFont("helvetica", "bold");
    } else if (rowIndex % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(x, cursorY, width, rowH, "F");
      doc.setFont("helvetica", "normal");
    } else {
      doc.setFont("helvetica", "normal");
    }
    doc.setTextColor(30, 41, 59);
    cx = x;
    row.forEach((cell, i) => {
      const pad = 1.4;
      const text = String(cell ?? "");
      if (alignRight[i]) {
        doc.text(text, cx + colWs[i] - pad, cursorY + 4.7, {
          align: "right",
          maxWidth: colWs[i] - 2,
        });
      } else {
        doc.text(text, cx + pad, cursorY + 4.7, {
          maxWidth: colWs[i] - 2,
        });
      }
      cx += colWs[i];
    });
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.15);
    doc.line(x, cursorY + rowH, x + width, cursorY + rowH);
    cursorY += rowH;
  });

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.35);
  doc.rect(x, y, width, cursorY - y);
  doc.setTextColor(0, 0, 0);
  return cursorY;
}

function drawPageChrome(
  doc: jsPDF,
  pageW: number,
  pageH: number,
  margin: number,
  companyName: string,
  pageLabel: string,
) {
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageW, 2.8, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${companyName} · ${HOTCOL_SYSTEM.name} lodging report`,
    margin,
    pageH - 6,
  );
  doc.text(pageLabel, pageW - margin, pageH - 6, { align: "right" });
}

/**
 * Polished landscape PDF for lodging stay-payment / performance reports.
 */
export async function downloadLodgingStayPaymentsPdf(input: {
  from: string;
  to: string;
  stays: LodgingStay[];
  breakdown: (stay: LodgingStay) => StayPaymentBreakdown;
  totals: StayPaymentBreakdown;
  perf?: LodgingPerformanceReport | null;
  brand?: LodgingReportOrgBrand;
}) {
  const org = input.brand ?? readClientOrgBrand();
  const companyName =
    (org.companyName || "Hotel").trim() || "Hotel";
  const tin = (org.tinNumber || "").trim();

  const [companyLogoData, apexLogoData, hotcolLogoData] = await Promise.all([
    org.logoUrl ? imageToDataUrl(org.logoUrl) : Promise.resolve(null),
    imageToDataUrl(APEX_SOLUTION.logoPath),
    imageToDataUrl(HOTCOL_SYSTEM.logoPath),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - margin * 2;

  const paintChrome = () => {
    const pageNo = doc.getNumberOfPages();
    drawPageChrome(
      doc,
      pageW,
      pageH,
      margin,
      companyName,
      `Page ${pageNo}`,
    );
  };

  paintChrome();
  let y = 10;

  // Header
  const logoSize = 14;
  if (companyLogoData) {
    try {
      doc.addImage(
        companyLogoData,
        "PNG",
        margin,
        y,
        logoSize,
        logoSize,
        undefined,
        "FAST",
      );
    } catch {
      /* monogram fallback below */
    }
  }
  if (!companyLogoData) {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(margin, y, logoSize, logoSize, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(6, 95, 70);
    doc.text(companyName.slice(0, 2).toUpperCase(), margin + logoSize / 2, y + 9, {
      align: "center",
    });
  }

  const textLeft = margin + logoSize + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(4, 120, 87);
  doc.text("LODGING REPORT", textLeft, y + 3.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(companyName, textLeft, y + 10);

  if (tin) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`TIN ${tin}`, textLeft, y + 15);
  }

  const rightX = pageW - margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Stay payments", rightX, y + 5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`${input.from}  →  ${input.to}`, rightX, y + 11, {
    align: "right",
  });
  doc.setFontSize(7.5);
  doc.text(
    `Generated ${new Date().toLocaleString()} · Checked-out stays only`,
    rightX,
    y + 16,
    { align: "right" },
  );

  y += 22;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  if (input.perf) {
    y = drawSectionTitle(doc, "Performance KPIs", margin, y);
    y = drawKpiStrip(doc, margin, y, contentW, [
      { label: "Occupancy", value: `${input.perf.occupancyPercent}%` },
      { label: "ADR", value: `ETB ${money(input.perf.adrETB)}` },
      { label: "RevPAR", value: `ETB ${money(input.perf.revparETB)}` },
      {
        label: "Room revenue",
        value: `ETB ${money(input.perf.roomRevenueETB)}`,
      },
    ]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${input.perf.roomNightsSold} room-nights sold · ${input.perf.availableRoomNights} available · ${input.perf.staysCheckedOut} checked out · ${input.perf.staysInHouse} in-house`,
      margin,
      y,
    );
    y += 6;
  }

  y = drawSectionTitle(doc, "Payment summary", margin, y);
  y = drawKpiStrip(doc, margin, y, contentW, [
    { label: "Room nights", value: `ETB ${money(input.totals.roomETB)}` },
    { label: "Laundry", value: `ETB ${money(input.totals.laundryETB)}` },
    {
      label: "Food & drink",
      value: `ETB ${money(input.totals.foodDrinkETB)}`,
    },
    { label: "Other", value: `ETB ${money(input.totals.otherETB)}` },
    {
      label: `Stay total (${input.stays.length})`,
      value: `ETB ${money(input.totals.totalETB)}`,
    },
  ]);

  y = ensureSpace(doc, y, 40, pageH, margin, paintChrome);
  y = drawSectionTitle(doc, "Checked-out stays", margin, y);

  const stayRows = input.stays.map((s) => {
    const b = input.breakdown(s);
    return [
      s.voucherCode || "—",
      guestLabel(s),
      roomsLabel(s),
      shortDate(s.arrivalAt),
      shortDate(s.departureAt),
      money(b.roomETB),
      money(b.laundryETB),
      money(b.foodDrinkETB),
      money(b.totalETB),
    ];
  });
  stayRows.push([
    "TOTAL",
    "",
    "",
    "",
    "",
    money(input.totals.roomETB),
    money(input.totals.laundryETB),
    money(input.totals.foodDrinkETB),
    money(input.totals.totalETB),
  ]);

  // Paginate table if needed
  const headers = [
    "Voucher",
    "Guest",
    "Rooms",
    "In",
    "Out",
    "Room",
    "Laundry",
    "F&B",
    "Total",
  ];
  const weights = [1.3, 2.2, 1.1, 1.2, 1.2, 1.1, 1.1, 1.1, 1.2];
  const alignRight = [false, false, false, false, false, true, true, true, true];
  const headerH = 7;
  const rowH = 7;
  const maxRowsFirst = Math.max(
    1,
    Math.floor((pageH - margin - 12 - y - headerH) / rowH),
  );

  let offset = 0;
  while (offset < stayRows.length) {
    const remaining = stayRows.length - offset;
    const take =
      offset === 0
        ? Math.min(remaining, maxRowsFirst)
        : Math.min(
            remaining,
            Math.max(1, Math.floor((pageH - margin * 2 - 20 - headerH) / rowH)),
          );
    const chunk = stayRows.slice(offset, offset + take);
    const isLastChunk = offset + take >= stayRows.length;
    y = drawTable(doc, margin, y, contentW, headers, chunk, weights, {
      alignRight,
      boldLastRow: isLastChunk,
    });
    offset += take;
    if (offset < stayRows.length) {
      doc.addPage();
      paintChrome();
      y = margin + 8;
      y = drawSectionTitle(doc, "Checked-out stays (continued)", margin, y);
    }
  }

  if (input.perf?.byRoomType?.length) {
    y = ensureSpace(doc, y + 6, 35, pageH, margin, paintChrome);
    y += 4;
    y = drawSectionTitle(doc, "By room type", margin, y);
    y = drawTable(
      doc,
      margin,
      y,
      contentW * 0.55,
      ["Room type", "Nights", "Revenue", "ADR"],
      input.perf.byRoomType.map((r) => [
        r.roomType,
        String(r.roomNightsSold),
        money(r.roomRevenueETB),
        money(r.adrETB),
      ]),
      [2, 1, 1.3, 1.2],
      { alignRight: [false, true, true, true] },
    );
  }

  if (input.perf?.bySource?.length) {
    y = ensureSpace(doc, y + 6, 30, pageH, margin, paintChrome);
    y += 4;
    y = drawSectionTitle(doc, "By source", margin, y);
    y = drawTable(
      doc,
      margin,
      y,
      contentW * 0.45,
      ["Source", "Stays", "Room revenue"],
      input.perf.bySource.map((r) => [
        r.source.replace(/_/g, " "),
        String(r.stays),
        money(r.roomRevenueETB),
      ]),
      [2, 1, 1.4],
      { alignRight: [false, true, true] },
    );
  }

  // Brand footer logos on last page
  const logoY = pageH - 18;
  const brandX = pageW / 2;
  if (hotcolLogoData) {
    try {
      doc.addImage(hotcolLogoData, "JPEG", brandX - 28, logoY, 8, 8, undefined, "FAST");
    } catch {
      /* ignore */
    }
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${HOTCOL_SYSTEM.name} · Powered by ${APEX_SOLUTION.name}`,
    brandX,
    logoY + 5.5,
    { align: "center" },
  );
  if (apexLogoData) {
    try {
      doc.addImage(apexLogoData, "PNG", brandX + 20, logoY, 8, 8, undefined, "FAST");
    } catch {
      /* ignore */
    }
  }

  const fileName = `lodging-report_${input.from}_to_${input.to}.pdf`;
  doc.save(fileName);
}
