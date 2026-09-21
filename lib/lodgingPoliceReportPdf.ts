import { jsPDF } from "jspdf";
import { APEX_SOLUTION, HOTCOL_SYSTEM } from "@/constants/branding";
import type { LodgingStay } from "@/lib/api/lodgingRooms";

export type PoliceReportOrgBrand = {
  companyName: string;
  tinNumber?: string;
  logoUrl?: string | null;
};

const FOOTER_H = 12;
const TOP_BAR_H = 3;

function moneyPad(n: number) {
  return String(n).padStart(2, "0");
}

function shortDateTime(value: string | Date | null | undefined) {
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

function guestName(stay: LodgingStay) {
  const g = stay.guest;
  if (!g) return "—";
  return `${g.firstName || ""} ${g.lastName || ""}`.trim() || "—";
}

function roomsLabel(stay: LodgingStay) {
  return (
    stay.rooms
      ?.map((r) => r.room?.roomNumber)
      .filter(Boolean)
      .join(", ") || "—"
  );
}

function idLabel(stay: LodgingStay) {
  const g = stay.guest;
  if (!g) return "ID";
  return g.isEthiopian !== false ? "Fayda / National ID" : "Passport";
}

function idValue(stay: LodgingStay) {
  const g = stay.guest;
  if (!g) return "—";
  if (g.isEthiopian !== false) return g.nationalId?.trim() || "—";
  return g.passportNumber?.trim() || g.nationalId?.trim() || "—";
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

function readClientOrgBrand(): PoliceReportOrgBrand {
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

export async function downloadLodgingPoliceReportPdf(input: {
  from: string;
  to: string;
  stays: LodgingStay[];
  brand?: PoliceReportOrgBrand;
}): Promise<void> {
  const brand = input.brand ?? readClientOrgBrand();
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

  // Header band
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentW, 28, 2.5, 2.5, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, y, contentW, 28, 2.5, 2.5, "S");

  if (hotelLogo) {
    tryAddImage(doc, hotelLogo, margin + 3, y + 4, 18, 18);
  } else {
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(margin + 3, y + 4, 18, 18, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(brand.companyName.slice(0, 2).toUpperCase(), margin + 12, y + 15, {
      align: "center",
    });
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Police guest report", margin + 26, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${brand.companyName}${brand.tinNumber ? `  ·  TIN ${brand.tinNumber}` : ""}`,
    margin + 26,
    y + 16,
  );
  doc.text(
    `Period: ${input.from} to ${input.to}  ·  Generated ${shortDateTime(new Date())}`,
    margin + 26,
    y + 22,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`${input.stays.length} guest stay(s)`, pageW - margin - 3, y + 14, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("For safety & security liaison", pageW - margin - 3, y + 20, {
    align: "right",
  });

  y += 34;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const notice =
    "Confidential — for authorized police / security use only. Guest identity details as registered at check-in.";
  doc.text(notice, margin, y);
  y += 6;

  if (input.stays.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text("No guest stays found for this period.", margin, y + 8);
    doc.save(`police-guest-report_${input.from}_to_${input.to}.pdf`);
    return;
  }

  const headers = [
    "#",
    "Guest",
    "Sex",
    "Nationality",
    "ID type / number",
    "Phone",
    "Room",
    "Arrival",
    "Departure",
    "Status",
    "Voucher",
  ];
  const colW = [8, 38, 12, 24, 42, 30, 18, 28, 28, 22, 28];
  const rowH = 8;

  const drawHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, y, contentW, rowH, 1.2, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(248, 250, 252);
    let x = margin + 1.5;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 5.2);
      x += colW[i]!;
    });
    y += rowH + 0.8;
  };

  drawHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);

  input.stays.forEach((stay, idx) => {
    if (y + rowH > contentBottom(pageH, margin)) {
      newPage();
      y = margin + TOP_BAR_H + 4;
      drawHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
    }

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentW, rowH, "F");
    }

    const g = stay.guest;
    const cells = [
      String(idx + 1),
      guestName(stay),
      g?.sex || "—",
      g?.country || "—",
      `${idLabel(stay)}: ${idValue(stay)}`,
      g?.phone || "—",
      roomsLabel(stay),
      shortDateTime(stay.arrivalAt),
      stay.status === "checked_in"
        ? shortDateTime(stay.expectedDepartureAt || stay.departureAt)
        : shortDateTime(stay.departureAt),
      String(stay.status || "").replace(/_/g, " "),
      stay.voucherCode || "—",
    ];

    doc.setTextColor(30, 41, 59);
    let x = margin + 1.5;
    cells.forEach((cell, i) => {
      const maxW = colW[i]! - 1.5;
      let text = String(cell);
      while (doc.getTextWidth(text) > maxW && text.length > 3) {
        text = `${text.slice(0, -2)}…`;
      }
      doc.text(text, x, y + 5.2);
      x += colW[i]!;
    });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.12);
    doc.line(margin, y + rowH, margin + contentW, y + rowH);
    y += rowH;
  });

  y += 8;
  if (y + 18 > contentBottom(pageH, margin)) {
    newPage();
    y = margin + TOP_BAR_H + 6;
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + 70, y);
  doc.line(pageW - margin - 70, y, pageW - margin, y);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Hotel manager / duty manager", margin, y + 5);
  doc.text("Police / security officer", pageW - margin, y + 5, {
    align: "right",
  });
  doc.text("Signature & stamp", margin, y + 10);
  doc.text("Signature & stamp", pageW - margin, y + 10, { align: "right" });

  const stamp = new Date();
  const file = `police-guest-report_${input.from}_to_${input.to}_${stamp.getFullYear()}${moneyPad(stamp.getMonth() + 1)}${moneyPad(stamp.getDate())}.pdf`;
  doc.save(file);
}
