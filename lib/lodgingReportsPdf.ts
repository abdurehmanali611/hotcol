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

const FOOTER_H = 12;
const TOP_BAR_H = 3;

/** Helvetica-safe separator — avoid Unicode arrows/dashes that jsPDF garbles. */
function rangeLabel(from: string, to: string) {
  return from === to ? from : `${from} to ${to}`;
}

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

function imageFormat(dataUrl: string): "PNG" | "JPEG" {
  if (
    dataUrl.startsWith("data:image/jpeg") ||
    dataUrl.startsWith("data:image/jpg")
  ) {
    return "JPEG";
  }
  return "PNG";
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

function contentBottom(pageH: number, margin: number) {
  return pageH - margin - FOOTER_H;
}

function ensureSpace(
  doc: jsPDF,
  y: number,
  need: number,
  pageH: number,
  margin: number,
  onNewPage: () => void,
) {
  if (y + need <= contentBottom(pageH, margin)) return y;
  doc.addPage();
  onNewPage();
  return margin + 6;
}

function drawSectionTitle(doc: jsPDF, title: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(title, x, y);
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.6);
  doc.line(x, y + 1.6, x + 14, y + 1.6);
  return y + 6;
}

function drawKpiStrip(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  items: { label: string; value: string }[],
  opts?: { emphasizeLast?: boolean },
) {
  const gap = 2.5;
  const cardW = (width - gap * (items.length - 1)) / items.length;
  const cardH = 15;
  items.forEach((item, i) => {
    const cx = x + i * (cardW + gap);
    const emphasize = Boolean(opts?.emphasizeLast && i === items.length - 1);
    if (emphasize) {
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(167, 243, 208);
    } else {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
    }
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, cardW, cardH, 1.2, 1.2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.8);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label.toUpperCase(), cx + 2.5, y + 4.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(item.value.length > 14 ? 8 : 9.5);
    doc.setTextColor(emphasize ? 6 : 15, emphasize ? 95 : 23, emphasize ? 70 : 42);
    doc.text(item.value, cx + 2.5, y + 11.2, {
      maxWidth: cardW - 5,
    });
  });
  return y + cardH + 3.5;
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
    boldLastRow?: boolean;
  },
) {
  const rowH = 6.6;
  const totalW = colWeights.reduce((a, b) => a + b, 0);
  const colWs = colWeights.map((w) => (w / totalW) * width);
  const alignRight = opts?.alignRight ?? headers.map(() => false);
  let cursorY = y;

  doc.setFillColor(30, 41, 59);
  doc.rect(x, cursorY, width, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.setTextColor(255, 255, 255);
  let cx = x;
  headers.forEach((h, i) => {
    const pad = 1.6;
    if (alignRight[i]) {
      doc.text(h, cx + colWs[i] - pad, cursorY + 4.4, { align: "right" });
    } else {
      doc.text(h, cx + pad, cursorY + 4.4);
    }
    cx += colWs[i];
  });
  cursorY += rowH;

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
      doc.setFillColor(255, 255, 255);
      doc.rect(x, cursorY, width, rowH, "F");
      doc.setFont("helvetica", "normal");
    }
    doc.setFontSize(6.8);
    doc.setTextColor(30, 41, 59);
    cx = x;
    row.forEach((cell, i) => {
      const pad = 1.6;
      const text = String(cell ?? "");
      if (alignRight[i]) {
        doc.text(text, cx + colWs[i] - pad, cursorY + 4.4, {
          align: "right",
        });
      } else {
        const clipped =
          text.length > 28 ? `${text.slice(0, 26)}...` : text;
        doc.text(clipped, cx + pad, cursorY + 4.4);
      }
      cx += colWs[i];
    });
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.12);
    doc.line(x, cursorY + rowH, x + width, cursorY + rowH);
    cursorY += rowH;
  });

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.rect(x, y, width, cursorY - y);
  return cursorY;
}

function drawPageChrome(
  doc: jsPDF,
  pageW: number,
  pageH: number,
  margin: number,
  companyName: string,
  pageLabel: string,
  logos?: { hotcol: string | null; apex: string | null },
) {
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageW, TOP_BAR_H, "F");

  const footerTop = pageH - FOOTER_H;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerTop, pageW - margin, footerTop);

  const baseline = pageH - 4.0;
  const hotcolSize = 5.2;
  // Apex mark is 320×80 — keep ~4:1 so it isn’t squashed narrow
  const apexH = 5.2;
  const apexW = 20.8;
  const gap = 2.2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text(companyName, margin, baseline);

  const brandText = `${HOTCOL_SYSTEM.name}  |  Powered by ${APEX_SOLUTION.name}`;
  const brandW = doc.getTextWidth(brandText);
  const clusterW = hotcolSize + gap + brandW + gap + apexW;
  const clusterX = (pageW - clusterW) / 2;
  const logoY = baseline - 3.9;

  tryAddImage(doc, logos?.hotcol ?? null, clusterX, logoY, hotcolSize, hotcolSize);
  doc.setTextColor(100, 116, 139);
  doc.text(brandText, clusterX + hotcolSize + gap, baseline);

  const apexX = clusterX + hotcolSize + gap + brandW + gap;
  // Dark chip — logo asset is built for dark backgrounds
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(apexX - 1.2, logoY - 1.0, apexW + 2.4, apexH + 2.0, 0.8, 0.8, "F");
  tryAddImage(doc, logos?.apex ?? null, apexX, logoY, apexW, apexH);

  doc.setTextColor(100, 116, 139);
  doc.text(pageLabel, pageW - margin, baseline, { align: "right" });
}

function tryAddImage(
  doc: jsPDF,
  dataUrl: string | null,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (!dataUrl) return false;
  try {
    doc.addImage(dataUrl, imageFormat(dataUrl), x, y, w, h, undefined, "FAST");
    return true;
  } catch {
    return false;
  }
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
  const companyName = (org.companyName || "Hotel").trim() || "Hotel";
  const tin = (org.tinNumber || "").trim();

  const [companyLogoData, apexLogoData, hotcolLogoData] = await Promise.all([
    org.logoUrl ? imageToDataUrl(org.logoUrl) : Promise.resolve(null),
    imageToDataUrl(APEX_SOLUTION.logoPath),
    imageToDataUrl(HOTCOL_SYSTEM.logoPath),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 11;
  const contentW = pageW - margin * 2;

  const paintChrome = () => {
    drawPageChrome(
      doc,
      pageW,
      pageH,
      margin,
      companyName,
      `Page ${doc.getNumberOfPages()}`,
      { hotcol: hotcolLogoData, apex: apexLogoData },
    );
  };

  paintChrome();
  let y = TOP_BAR_H + 6;

  // —— Header ——
  const logoSize = 13;
  const placedLogo = tryAddImage(
    doc,
    companyLogoData,
    margin,
    y,
    logoSize,
    logoSize,
  );
  if (!placedLogo) {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(margin, y, logoSize, logoSize, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(6, 95, 70);
    doc.text(
      companyName.slice(0, 2).toUpperCase(),
      margin + logoSize / 2,
      y + 8.2,
      { align: "center" },
    );
  }

  const textLeft = margin + logoSize + 3.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(4, 120, 87);
  doc.text("LODGING REPORT", textLeft, y + 3.2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  const nameLines = doc.splitTextToSize(companyName, contentW * 0.42);
  doc.text(nameLines, textLeft, y + 8.5);

  let leftMetaY = y + 8.5 + nameLines.length * 4.5;
  if (tin) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`TIN ${tin}`, textLeft, leftMetaY);
    leftMetaY += 4;
  }

  const rightX = pageW - margin;
  const dates = rangeLabel(input.from, input.to);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(4, 120, 87);
  doc.text("STAY PAYMENTS", rightX, y + 3.2, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(dates, rightX, y + 9, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Generated ${new Date().toLocaleString()}  |  Checked-out stays only`,
    rightX,
    y + 14,
    { align: "right" },
  );

  y = Math.max(leftMetaY, y + 16) + 2;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.35);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

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
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${input.perf.roomNightsSold} room-nights sold · ${input.perf.availableRoomNights} available · ${input.perf.staysCheckedOut} checked out · ${input.perf.staysInHouse} in-house`,
      margin,
      y,
    );
    y += 4;
    const kpiLegend = [
      "Occupancy — how full you were (sold ÷ available × 100)",
      "ADR — how much you charged when sold (revenue ÷ sold nights)",
      "RevPAR — how much each room earned overall (revenue ÷ available nights)",
    ];
    for (const line of kpiLegend) {
      doc.text(line, margin, y);
      y += 3.2;
    }
    y += 2;
  }

  y = drawSectionTitle(doc, "Payment summary", margin, y);
  y = drawKpiStrip(
    doc,
    margin,
    y,
    contentW,
    [
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
    ],
    { emphasizeLast: true },
  );

  y = ensureSpace(doc, y, 28, pageH, margin, paintChrome);
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
  const weights = [1.35, 2.1, 1.0, 1.15, 1.15, 1.05, 1.05, 1.0, 1.15];
  const alignRight = [
    false,
    false,
    false,
    false,
    false,
    true,
    true,
    true,
    true,
  ];
  const headerH = 6.6;
  const rowH = 6.6;

  let offset = 0;
  while (offset < stayRows.length) {
    const remaining = stayRows.length - offset;
    const avail = contentBottom(pageH, margin) - y - headerH;
    const take = Math.max(
      1,
      Math.min(remaining, Math.floor(avail / rowH)),
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
      y = TOP_BAR_H + 6;
      y = drawSectionTitle(doc, "Checked-out stays (continued)", margin, y);
    }
  }

  // Side-by-side breakdowns — avoid orphan nearly-empty pages
  const hasRoomType = Boolean(input.perf?.byRoomType?.length);
  const hasSource = Boolean(input.perf?.bySource?.length);
  if (hasRoomType || hasSource) {
    const gap = 4;
    const halfW = (contentW - gap) / 2;
    const roomTypeRows = hasRoomType
      ? (input.perf!.byRoomType.length + 1) * rowH + 12
      : 0;
    const sourceRows = hasSource
      ? (input.perf!.bySource.length + 1) * rowH + 12
      : 0;
    const need = Math.max(roomTypeRows, sourceRows, 24);
    y = ensureSpace(doc, y + 4, need, pageH, margin, paintChrome);

    if (hasRoomType && hasSource) {
      const yStart = y;
      let yLeft = drawSectionTitle(doc, "By room type", margin, yStart);
      yLeft = drawTable(
        doc,
        margin,
        yLeft,
        halfW,
        ["Room type", "Nights", "Revenue", "ADR"],
        input.perf!.byRoomType.map((r) => [
          r.roomType,
          String(r.roomNightsSold),
          money(r.roomRevenueETB),
          money(r.adrETB),
        ]),
        [2.2, 1, 1.4, 1.2],
        { alignRight: [false, true, true, true] },
      );

      let yRight = drawSectionTitle(
        doc,
        "By source",
        margin + halfW + gap,
        yStart,
      );
      yRight = drawTable(
        doc,
        margin + halfW + gap,
        yRight,
        halfW,
        ["Source", "Stays", "Room revenue"],
        input.perf!.bySource.map((r) => [
          r.source.replace(/_/g, " "),
          String(r.stays),
          money(r.roomRevenueETB),
        ]),
        [2.2, 1, 1.6],
        { alignRight: [false, true, true] },
      );
      y = Math.max(yLeft, yRight);
    } else if (hasRoomType) {
      y = drawSectionTitle(doc, "By room type", margin, y);
      y = drawTable(
        doc,
        margin,
        y,
        Math.min(contentW * 0.62, contentW),
        ["Room type", "Nights", "Revenue", "ADR"],
        input.perf!.byRoomType.map((r) => [
          r.roomType,
          String(r.roomNightsSold),
          money(r.roomRevenueETB),
          money(r.adrETB),
        ]),
        [2.2, 1, 1.4, 1.2],
        { alignRight: [false, true, true, true] },
      );
    } else if (hasSource) {
      y = drawSectionTitle(doc, "By source", margin, y);
      y = drawTable(
        doc,
        margin,
        y,
        Math.min(contentW * 0.55, contentW),
        ["Source", "Stays", "Room revenue"],
        input.perf!.bySource.map((r) => [
          r.source.replace(/_/g, " "),
          String(r.stays),
          money(r.roomRevenueETB),
        ]),
        [2.2, 1, 1.6],
        { alignRight: [false, true, true] },
      );
    }
  }

  doc.save(`lodging-report_${input.from}_to_${input.to}.pdf`);
}
