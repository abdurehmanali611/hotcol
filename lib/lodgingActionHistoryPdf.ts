import { jsPDF } from "jspdf";
import { APEX_SOLUTION, HOTCOL_SYSTEM } from "@/constants/branding";
import type { LodgingActionLog } from "@/lib/api/lodgingRooms";
import {
  formatLodgingActionDetails,
  lodgingActionLabel,
} from "@/lib/lodgingActionHistoryFormat";

export type ActionHistoryOrgBrand = {
  companyName: string;
  tinNumber?: string;
  logoUrl?: string | null;
};

const FOOTER_H = 12;
const TOP_BAR_H = 3;

function shortDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Helvetica-safe: strip characters jsPDF often garbles. */
function pdfSafe(text: string) {
  return String(text || "")
    .replace(/\u00b7/g, " | ")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
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

function readClientOrgBrand(): ActionHistoryOrgBrand {
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
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, TOP_BAR_H, "F");
  doc.setFillColor(16, 185, 129);
  doc.rect(0, TOP_BAR_H, pageW, 0.8, "F");

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

function contentBottom(pageH: number, margin: number) {
  return pageH - margin - FOOTER_H;
}

function clipCell(doc: jsPDF, text: string, maxW: number) {
  let out = pdfSafe(text);
  while (doc.getTextWidth(out) > maxW && out.length > 3) {
    out = `${out.slice(0, -2)}...`;
  }
  return out;
}

export async function downloadLodgingActionHistoryPdf(input: {
  logs: LodgingActionLog[];
  brand?: ActionHistoryOrgBrand;
  title?: string;
}): Promise<void> {
  const brand = input.brand ?? readClientOrgBrand();
  const title = input.title || "Recent actions";
  const [hotcol, apex, hotelLogo] = await Promise.all([
    imageToDataUrl(HOTCOL_SYSTEM.logoPath),
    imageToDataUrl(APEX_SOLUTION.logoPath),
    brand.logoUrl ? imageToDataUrl(brand.logoUrl) : Promise.resolve(null),
  ]);
  const logos = { hotcol, apex };

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - margin * 2;
  let page = 1;

  const paintChrome = () => {
    drawPageChrome(
      doc,
      pageW,
      pageH,
      margin,
      brand.companyName,
      `Page ${page}`,
      logos,
    );
  };

  const newPage = () => {
    doc.addPage();
    page += 1;
    paintChrome();
  };

  paintChrome();

  let y = margin + TOP_BAR_H + 4;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentW, 24, 2.5, 2.5, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, y, contentW, 24, 2.5, 2.5, "S");

  if (hotelLogo) {
    tryAddImage(doc, hotelLogo, margin + 3, y + 3, 16, 16);
  } else {
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(margin + 3, y + 3, 16, 16, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(brand.companyName.slice(0, 2).toUpperCase(), margin + 11, y + 13, {
      align: "center",
    });
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(title, margin + 24, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    pdfSafe(
      `${brand.companyName}${brand.tinNumber ? `  |  TIN ${brand.tinNumber}` : ""}`,
    ),
    margin + 24,
    y + 15,
  );
  doc.text(
    pdfSafe(`Generated ${shortDateTime(new Date())}`),
    margin + 24,
    y + 20,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `${input.logs.length} action${input.logs.length === 1 ? "" : "s"}`,
    pageW - margin - 3,
    y + 14,
    { align: "right" },
  );

  y += 30;

  if (input.logs.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text("No actions logged yet.", margin, y + 8);
    doc.save("lodging-recent-actions.pdf");
    return;
  }

  const headers = ["When", "Action", "Actor", "Role", "Entity", "What changed"];
  const colW = [36, 34, 36, 28, 28, contentW - 36 - 34 - 36 - 28 - 28];
  const headerH = 8;
  const lineH = 3.4;

  const drawHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, y, contentW, headerH, 1.2, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(248, 250, 252);
    let x = margin + 1.5;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 5.2);
      x += colW[i]!;
    });
    y += headerH + 0.8;
  };

  drawHeader();

  input.logs.forEach((log, idx) => {
    const when = shortDateTime(log.createdAt);
    const action = lodgingActionLabel(log.action);
    const actor = log.actorName || "-";
    const role = log.actorRole || "-";
    const entity = log.entityType || "-";
    const details = pdfSafe(formatLodgingActionDetails(log.detailJson));

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.6);
    const detailLines = doc.splitTextToSize(
      details || "-",
      colW[5]! - 2,
    ) as string[];
    const rowH = Math.max(8, detailLines.length * lineH + 3.2);

    if (y + rowH > contentBottom(pageH, margin)) {
      newPage();
      y = margin + TOP_BAR_H + 4;
      drawHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.6);
    }

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentW, rowH, "F");
    }

    const cells = [when, action, actor, role, entity];
    doc.setTextColor(30, 41, 59);
    let x = margin + 1.5;
    cells.forEach((cell, i) => {
      doc.text(clipCell(doc, cell, colW[i]! - 1.5), x, y + 5);
      x += colW[i]!;
    });
    doc.text(detailLines, x, y + 5);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.12);
    doc.line(margin, y + rowH, pageW - margin, y + rowH);
    y += rowH;
  });

  doc.save("lodging-recent-actions.pdf");
}
