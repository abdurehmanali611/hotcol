import { jsPDF } from "jspdf";
import { APEX_SOLUTION, HOTCOL_SYSTEM } from "@/constants/branding";
import { LODGING_ROOM_STATUS_LABELS } from "@/constants/lodgingRooms";

export type LodgingNightAuditOrgBrand = {
  companyName: string;
  tinNumber?: string;
  logoUrl?: string | null;
};

export type LodgingNightAuditPdfSummary = {
  arrivals?: number;
  departures?: number;
  inHouse?: number;
  noShows?: number;
  outstandingBalanceETB?: number;
  fromAt?: string;
  toAt?: string;
  closedAt?: string;
  receptionistName?: string;
  roomsByStatus?: Record<string, number>;
  rooms?: Array<{
    roomNumber: string;
    roomType?: string;
    floor?: string | number | null;
    status: string;
  }>;
  arrivalRooms?: Array<{
    voucherCode?: string;
    guest?: string;
    rooms?: string;
    at?: string;
    by?: string;
  }>;
  departureRooms?: Array<{
    voucherCode?: string;
    guest?: string;
    rooms?: string;
    at?: string;
    by?: string;
  }>;
  inHouseRooms?: Array<{
    voucherCode?: string;
    guest?: string;
    rooms?: string;
    arrivalAt?: string;
    by?: string;
  }>;
};

const FOOTER_H = 12;
const TOP_BAR_H = 3;
const ROW_H = 6.6;

function money(n: number) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function shortDate(value?: string | Date | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function shortDateTime(value?: string | Date | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function periodLabel(fromAt?: string, toAt?: string, businessDate?: string) {
  if (fromAt && toAt) {
    const a = shortDate(fromAt);
    const b = shortDate(toAt);
    return a === b ? a : `${a} to ${b}`;
  }
  return businessDate || "—";
}

function statusLabel(status: string) {
  return (
    LODGING_ROOM_STATUS_LABELS[
      status as keyof typeof LODGING_ROOM_STATUS_LABELS
    ] ?? status.replace(/_/g, " ")
  );
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

function readClientOrgBrand(): LodgingNightAuditOrgBrand {
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

function drawPageChrome(
  doc: jsPDF,
  pageW: number,
  pageH: number,
  margin: number,
  companyName: string,
  pageLabel: string,
  logos?: { hotcol: string | null; apex: string | null },
) {
  doc.setFillColor(245, 158, 11);
  doc.rect(0, 0, pageW, TOP_BAR_H, "F");

  const footerTop = pageH - FOOTER_H;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerTop, pageW - margin, footerTop);

  const baseline = pageH - 4.0;
  const hotcolSize = 5.2;
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
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(apexX - 1.2, logoY - 1.0, apexW + 2.4, apexH + 2.0, 0.8, 0.8, "F");
  tryAddImage(doc, logos?.apex ?? null, apexX, logoY, apexW, apexH);

  doc.setTextColor(100, 116, 139);
  doc.text(pageLabel, pageW - margin, baseline, { align: "right" });
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
  return TOP_BAR_H + 6;
}

function drawSectionTitle(doc: jsPDF, title: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(title, x, y);
  doc.setDrawColor(245, 158, 11);
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
) {
  const gap = 2.5;
  const cardW = (width - gap * (items.length - 1)) / items.length;
  const cardH = 15;
  items.forEach((item, i) => {
    const cx = x + i * (cardW + gap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, cardW, cardH, 1.2, 1.2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.8);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label.toUpperCase(), cx + 2.5, y + 4.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(item.value.length > 14 ? 8 : 9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(item.value, cx + 2.5, y + 11.2, { maxWidth: cardW - 5 });
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
  opts?: { alignRight?: boolean[] },
) {
  if (rows.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("None in this period.", x, y + 3);
    return y + 8;
  }

  const totalW = colWeights.reduce((a, b) => a + b, 0);
  const colWs = colWeights.map((w) => (w / totalW) * width);
  const alignRight = opts?.alignRight ?? headers.map(() => false);
  let cursorY = y;

  doc.setFillColor(30, 41, 59);
  doc.rect(x, cursorY, width, ROW_H, "F");
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
  cursorY += ROW_H;

  rows.forEach((row, rowIndex) => {
    if (rowIndex % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(x, cursorY, width, ROW_H, "F");
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(x, cursorY, width, ROW_H, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(30, 41, 59);
    cx = x;
    row.forEach((cell, i) => {
      const pad = 1.6;
      const text = String(cell ?? "");
      if (alignRight[i]) {
        doc.text(text, cx + colWs[i] - pad, cursorY + 4.4, { align: "right" });
      } else {
        const clipped = text.length > 36 ? `${text.slice(0, 34)}...` : text;
        doc.text(clipped, cx + pad, cursorY + 4.4);
      }
      cx += colWs[i];
    });
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.12);
    doc.line(x, cursorY + ROW_H, x + width, cursorY + ROW_H);
    cursorY += ROW_H;
  });

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.rect(x, y, width, cursorY - y);
  return cursorY;
}

function drawTableChunked(
  doc: jsPDF,
  startY: number,
  pageH: number,
  margin: number,
  contentW: number,
  title: string,
  headers: string[],
  rows: string[][],
  colWeights: number[],
  paintChrome: () => void,
  opts?: { alignRight?: boolean[] },
) {
  let y = ensureSpace(doc, startY, 22, pageH, margin, paintChrome);
  y = drawSectionTitle(doc, title, margin, y);

  if (rows.length === 0) {
    return drawTable(doc, margin, y, contentW, headers, [], colWeights, opts);
  }

  const headerNeed = ROW_H + 4;
  let offset = 0;
  while (offset < rows.length) {
    if (offset > 0) {
      doc.addPage();
      paintChrome();
      y = TOP_BAR_H + 6;
      y = drawSectionTitle(doc, `${title} (continued)`, margin, y);
    } else {
      y = ensureSpace(doc, y, headerNeed + ROW_H * 2, pageH, margin, paintChrome);
    }
    const available = contentBottom(pageH, margin) - y - 2;
    const take = Math.max(
      1,
      Math.min(rows.length - offset, Math.floor((available - ROW_H) / ROW_H)),
    );
    const chunk = rows.slice(offset, offset + take);
    y = drawTable(doc, margin, y, contentW, headers, chunk, colWeights, opts);
    offset += take;
    y += 3;
  }
  return y;
}

/**
 * Polished landscape PDF for a closed night-audit / business-day report.
 */
export async function downloadLodgingNightAuditPdf(input: {
  businessDate: string;
  fromAt?: string;
  toAt?: string;
  receptionistName?: string;
  closedBy?: string;
  closedAt?: string | null;
  summary: LodgingNightAuditPdfSummary;
  brand?: LodgingNightAuditOrgBrand;
}) {
  const org = input.brand ?? readClientOrgBrand();
  const companyName = (org.companyName || "Hotel").trim() || "Hotel";
  const tin = (org.tinNumber || "").trim();
  const summary = input.summary;
  const period = periodLabel(input.fromAt || summary.fromAt, input.toAt || summary.toAt, input.businessDate);
  const receptionist =
    input.receptionistName ||
    summary.receptionistName ||
    "—";

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
    doc.setFillColor(255, 247, 237);
    doc.setDrawColor(253, 186, 116);
    doc.roundedRect(margin, y, logoSize, logoSize, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(154, 52, 18);
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
  doc.setTextColor(180, 83, 9);
  doc.text("NIGHT AUDIT", textLeft, y + 3.2);

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
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(180, 83, 9);
  doc.text("CLOSED BUSINESS DAY", rightX, y + 3.2, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(period, rightX, y + 9, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Receptionist ${receptionist}  |  Generated ${shortDateTime(new Date())}`,
    rightX,
    y + 14,
    { align: "right" },
  );

  y = Math.max(leftMetaY, y + 16) + 2;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.35);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  const closedMeta = [
    input.closedBy ? `Closed by ${input.closedBy}` : null,
    input.closedAt || summary.closedAt
      ? `Closed at ${shortDateTime(input.closedAt || summary.closedAt)}`
      : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  if (closedMeta) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(closedMeta, margin, y);
    y += 5;
  }

  y = drawSectionTitle(doc, "Period summary", margin, y);
  y = drawKpiStrip(doc, margin, y, contentW, [
    { label: "Arrivals", value: String(summary.arrivals ?? 0) },
    { label: "Departures", value: String(summary.departures ?? 0) },
    { label: "In house", value: String(summary.inHouse ?? 0) },
    { label: "No-shows", value: String(summary.noShows ?? 0) },
    {
      label: "Open folios",
      value: `ETB ${money(Number(summary.outstandingBalanceETB || 0))}`,
    },
  ]);

  const statusEntries = Object.entries(summary.roomsByStatus || {}).sort(
    (a, b) => a[0].localeCompare(b[0]),
  );
  if (statusEntries.length > 0) {
    y = ensureSpace(doc, y, 18, pageH, margin, paintChrome);
    y = drawSectionTitle(doc, "Rooms by status", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(51, 65, 85);
    const statusLine = statusEntries
      .map(([status, count]) => `${statusLabel(status)}: ${count}`)
      .join("   ·   ");
    const lines = doc.splitTextToSize(statusLine, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 3.6 + 3;
  }

  const stayHeaders = ["Room(s)", "Guest", "Voucher", "When", "Receptionist"];
  const stayWeights = [1.2, 2.2, 1.4, 1.8, 1.6];

  const arrivalRows = (summary.arrivalRooms || []).map((r) => [
    r.rooms || "—",
    r.guest || "Guest",
    r.voucherCode || "—",
    shortDateTime(r.at),
    r.by || "—",
  ]);
  y = drawTableChunked(
    doc,
    y,
    pageH,
    margin,
    contentW,
    "Arrivals in period",
    stayHeaders,
    arrivalRows,
    stayWeights,
    paintChrome,
  );

  const departureRows = (summary.departureRooms || []).map((r) => [
    r.rooms || "—",
    r.guest || "Guest",
    r.voucherCode || "—",
    shortDateTime(r.at),
    r.by || "—",
  ]);
  y = drawTableChunked(
    doc,
    y,
    pageH,
    margin,
    contentW,
    "Departures in period",
    stayHeaders,
    departureRows,
    stayWeights,
    paintChrome,
  );

  const inHouseRows = (summary.inHouseRooms || []).map((r) => [
    r.rooms || "—",
    r.guest || "Guest",
    r.voucherCode || "—",
    shortDateTime(r.arrivalAt),
    r.by || "—",
  ]);
  y = drawTableChunked(
    doc,
    y,
    pageH,
    margin,
    contentW,
    "In-house at close",
    stayHeaders,
    inHouseRows,
    stayWeights,
    paintChrome,
  );

  const roomRows = (summary.rooms || []).map((r) => [
    r.roomNumber,
    r.roomType || "—",
    r.floor != null && String(r.floor) !== "" ? String(r.floor) : "—",
    statusLabel(r.status),
  ]);
  drawTableChunked(
    doc,
    y,
    pageH,
    margin,
    contentW,
    "All rooms snapshot",
    ["Room", "Type", "Floor", "Status"],
    roomRows,
    [1, 1.6, 0.9, 2],
    paintChrome,
  );

  const safePeriod = period.replace(/[^\w.-]+/g, "_").slice(0, 40);
  const safeName = receptionist.replace(/[^\w.-]+/g, "_").slice(0, 24) || "reception";
  doc.save(`night-audit-${safePeriod}-${safeName}.pdf`);
}
