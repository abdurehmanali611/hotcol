import { jsPDF } from "jspdf";
import type { HrPayslip } from "@/lib/api/hr";
import { formatETB } from "@/lib/subscriptionModules";

function money(n: number) {
  return formatETB(Number(n) || 0);
}

function drawTable(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  headers: string[],
  rows: string[][],
  colWeights: number[],
  opts?: { headerRgb?: [number, number, number] },
) {
  const rowH = 7.2;
  const totalW = colWeights.reduce((a, b) => a + b, 0);
  const colWs = colWeights.map((w) => (w / totalW) * width);
  let cursorY = y;
  const [hr, hg, hb] = opts?.headerRgb ?? [236, 253, 245];

  doc.setFillColor(hr, hg, hb);
  doc.rect(x, cursorY, width, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  let cx = x + 1.5;
  headers.forEach((h, i) => {
    doc.text(h, cx, cursorY + 4.9);
    cx += colWs[i];
  });
  cursorY += rowH;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  rows.forEach((row, rowIndex) => {
    if (rowIndex % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(x, cursorY, width, rowH, "F");
    }
    cx = x + 1.5;
    row.forEach((cell, i) => {
      doc.text(String(cell ?? ""), cx, cursorY + 4.9, {
        maxWidth: colWs[i] - 2,
      });
      cx += colWs[i];
    });
    doc.setDrawColor(226, 232, 240);
    doc.line(x, cursorY + rowH, x + width, cursorY + rowH);
    cursorY += rowH;
  });
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.rect(x, y, width, cursorY - y);
  doc.setTextColor(0, 0, 0);
  return cursorY;
}

/** One PDF per payslip. Batch = call this multiple times. */
export async function downloadPayslipPdf(slip: HrPayslip) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 14;

  const tenant = slip.organizationLocation || slip.HotelName || "Organization";
  const month = slip.taxPeriod || slip.period?.monthName || "—";

  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageW, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(tenant, margin, y + 6);
  y += 12;

  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105);
  doc.text(`Payslip for the month of ${month}`, margin, y);
  y += 6;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + contentW, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Employee", margin, y);
  y += 2;
  y = drawTable(
    doc,
    margin,
    y,
    contentW,
    [
      "Name",
      "Job title",
      "Tax period",
      "Location",
      "Pay date",
      "Payslip #",
      "Date hired",
    ],
    [
      [
        slip.employeeName || slip.employee?.fullName || "—",
        slip.jobTitle || "—",
        slip.taxPeriod || "—",
        slip.organizationLocation || "—",
        slip.payDate || "—",
        slip.payslipNumber || "—",
        slip.hireDate || "—",
      ],
    ],
    [2.2, 1.6, 1.3, 1.6, 1.3, 1.6, 1.3],
  );
  y += 8;

  const halfGap = 4;
  const halfW = (contentW - halfGap) / 2;
  const leftX = margin;
  const rightX = margin + halfW + halfGap;

  const deductionRows = (slip.deductions || []).map((r) => [
    r.label,
    money(r.amountETB),
  ]);
  if (!deductionRows.length) deductionRows.push(["—", money(0)]);
  const earningRows = (slip.earnings || []).map((r) => [
    r.label,
    money(r.amountETB),
  ]);
  if (!earningRows.length) {
    earningRows.push(["Gross salary", money(slip.grossSalaryETB)]);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Deductions", leftX, y);
  doc.text("Earnings", rightX, y);
  y += 2;

  const dedBottom = drawTable(
    doc,
    leftX,
    y,
    halfW,
    ["Description", "Amount"],
    deductionRows,
    [2.2, 1],
    { headerRgb: [255, 241, 242] },
  );
  const earnBottom = drawTable(
    doc,
    rightX,
    y,
    halfW,
    ["Description", "Amount"],
    earningRows,
    [2.2, 1],
    { headerRgb: [236, 253, 245] },
  );
  y = Math.max(dedBottom, earnBottom) + 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(190, 18, 60);
  doc.text(
    `Total Deduction: ${money(slip.totalDeductionsETB)}`,
    leftX + halfW,
    y,
    { align: "right" },
  );
  doc.setTextColor(5, 150, 105);
  doc.text(
    `Total Earnings: ${money(slip.totalEarningsETB)}`,
    rightX + halfW,
    y,
    { align: "right" },
  );
  y += 10;

  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y - 2, contentW, 28, 2, 2, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`Payment method: ${slip.bankName || "—"}`, margin + 4, y + 6);
  doc.text(`Account number: ${slip.accountNumber || "—"}`, margin + 4, y + 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`Net pay: ${money(slip.netPayETB)}`, margin + 4, y + 22);

  const safeName = (slip.employeeName || "employee")
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "_");
  doc.save(
    `Payslip_${slip.payslipNumber || slip.id}_${safeName || "employee"}.pdf`,
  );
}

export async function downloadPayslipPdfs(slips: HrPayslip[]) {
  for (const slip of slips) {
    await downloadPayslipPdf(slip);
  }
}
