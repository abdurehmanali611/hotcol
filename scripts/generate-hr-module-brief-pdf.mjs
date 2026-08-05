/**
 * Generates a clear HR Module brief PDF for review.
 * Run: node scripts/generate-hr-module-brief-pdf.mjs
 */
import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "docs");
const outPath = path.join(outDir, "HotCol-HR-Module-Brief.pdf");

const doc = new jsPDF({ unit: "mm", format: "a4" });
const pageW = doc.internal.pageSize.getWidth();
const pageH = doc.internal.pageSize.getHeight();
const margin = 18;
const contentW = pageW - margin * 2;
let y = margin;
let page = 1;

function footer() {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    `HotCol — HR Module Brief  ·  For review  ·  Page ${page}`,
    pageW / 2,
    pageH - 10,
    { align: "center" },
  );
  doc.setTextColor(0);
}

function newPage() {
  footer();
  doc.addPage();
  page += 1;
  y = margin;
}

function ensureSpace(need) {
  if (y + need > pageH - 18) newPage();
}

function title(text) {
  ensureSpace(16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 40, 60);
  doc.text(text, margin, y);
  y += 10;
  doc.setDrawColor(30, 100, 140);
  doc.setLineWidth(0.6);
  doc.line(margin, y, margin + 40, y);
  y += 8;
  doc.setTextColor(0);
}

function h2(text) {
  ensureSpace(14);
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(25, 55, 85);
  doc.text(text, margin, y);
  y += 7;
  doc.setTextColor(0);
}

function h3(text) {
  ensureSpace(10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(40, 70, 100);
  doc.text(text, margin, y);
  y += 6;
  doc.setTextColor(0);
}

function para(text) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(35);
  const lines = doc.splitTextToSize(text, contentW);
  for (const line of lines) {
    ensureSpace(6);
    doc.text(line, margin, y);
    y += 5;
  }
  y += 2;
  doc.setTextColor(0);
}

function bullet(text, indent = 0) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(35);
  const x = margin + indent;
  const maxW = contentW - indent - 4;
  const lines = doc.splitTextToSize(text, maxW);
  ensureSpace(5 * lines.length + 1);
  doc.text("•", x, y);
  doc.text(lines[0], x + 4, y);
  y += 5;
  for (let i = 1; i < lines.length; i++) {
    ensureSpace(5);
    doc.text(lines[i], x + 4, y);
    y += 5;
  }
  doc.setTextColor(0);
}

function callout(label, text) {
  ensureSpace(22);
  doc.setFillColor(240, 247, 252);
  doc.setDrawColor(30, 100, 140);
  const lines = doc.splitTextToSize(text, contentW - 8);
  const boxH = 8 + lines.length * 5;
  doc.roundedRect(margin, y - 4, contentW, boxH, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 100, 140);
  doc.text(label.toUpperCase(), margin + 4, y + 2);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(40);
  for (const line of lines) {
    doc.text(line, margin + 4, y);
    y += 5;
  }
  y += 4;
  doc.setTextColor(0);
}

function table(headers, rows, colWidths) {
  const rowH = 7;
  ensureSpace(rowH * (rows.length + 1) + 4);
  let x = margin;
  doc.setFillColor(25, 55, 85);
  doc.rect(margin, y - 4.5, contentW, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255);
  x = margin;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], x + 2, y);
    x += colWidths[i];
  }
  y += rowH;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30);
  rows.forEach((row, idx) => {
    ensureSpace(rowH + 2);
    if (idx % 2 === 0) {
      doc.setFillColor(246, 248, 250);
      doc.rect(margin, y - 4.5, contentW, rowH, "F");
    }
    x = margin;
    for (let i = 0; i < row.length; i++) {
      const cell = doc.splitTextToSize(String(row[i]), colWidths[i] - 3);
      doc.text(cell[0], x + 2, y);
      x += colWidths[i];
    }
    y += rowH;
  });
  y += 4;
  doc.setTextColor(0);
}

function metaLine(label, value) {
  ensureSpace(6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(label, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30);
  doc.text(value, margin + 38, y);
  y += 5;
}

// ——— PAGE 1: Cover / Overview ———
doc.setFillColor(25, 55, 85);
doc.rect(0, 0, pageW, 52, "F");
doc.setTextColor(255);
doc.setFont("helvetica", "bold");
doc.setFontSize(22);
doc.text("HotCol — HR Module", margin, 24);
doc.setFontSize(12);
doc.setFont("helvetica", "normal");
doc.text("Product brief for review & revision", margin, 34);
doc.setFontSize(9);
doc.text("Cafe & Restaurant  ·  Hotel (and future lodging types)", margin, 42);
doc.setTextColor(0);
y = 62;

metaLine("Document", "HR Module details (draft for revision)");
metaLine("Audience", "Product / ops review with a collaborator");
metaLine("Status", "Not implemented yet — listed as Coming soon in product");
metaLine("Goal", "Agree scope before build (Core vs Advanced)");
y += 4;

callout(
  "One-sentence pitch",
  "HotCol HR should be a hospitality workforce module: know your people, schedule them, track leave and attendance, and optionally run payroll — sitting beside Credentials (logins), not replacing them.",
);

title("1. Context in HotCol today");
para(
  "HotCol sells subscription modules for Cafe/Restaurant and Hotel (Resort/Pension coming later). Eight modules exist in the catalog. Seven are live; HR Module is the only product module still marked coming soon.",
);

h3("Modules already live (for orientation)");
bullet("Cafe and Restaurant — orders, kitchen, bar, cashier, waiters/tables");
bullet("Credentials (Common) — grant/delete staff logins (always required)");
bullet("Inventory — store terminal, stock, suppliers");
bullet("Credit Management — corporate credit");
bullet("Financial Management — cost control & finance (hotel)");
bullet("Room Management — reception, stays, laundry");
bullet("Cleaning and Maintenance — CM queues and assignments");

h3("What exists today that looks like “people” but is not HR");
bullet("Credentials = username + role + terminal access only");
bullet("Waiters = café floor identity + tip/income tracking (sales), not employment records");
bullet("Department leaders = free-text names for inventory accountability (includes an HR department code)");
bullet("CM assignees / credit “staff” = free-text names, not employee master data");
para(
  "There is no employee ID, attendance, leave, shift roster, contracts, or payroll in the product yet.",
);

// ——— PAGE 2: Recommendation ———
newPage();
title("2. Recommended product shape");
para(
  "Best fit is a workforce-ops module for hospitality, not a full enterprise HCM (not BambooHR/SAP SuccessFactors clone). Sell it like Inventory or Rooms: optional module, gated by subscription, unlocking UI + an optional HR role.",
);

h2("2.1 Shared for Cafe and Hotel");
bullet("One module key: \"HR Module\" (available to both business types)");
bullet("Keep Credentials(Common) for logins — HR should link people to credentials, not replace them");
bullet("Reuse existing department codes (Kitchen, Bar, Housekeeping, Reception, Maintenance, Finance, HR, etc.)");
bullet("Prefer one grantable role: HR → /HR terminal (Manager/Admin tabs also fine for small properties)");

h2("2.2 Cafe vs Hotel differences");
table(
  ["Topic", "Cafe / Restaurant", "Hotel"],
  [
    ["Owner UI", "Admin tab / panel", "Manager tab + scorecard"],
    ["HR role", "Optional (Admin can run alone)", "Strongly recommended"],
    ["Departments", "Kitchen, Bar, Floor, Store", "+ Rooms, CM, Security, night ops"],
    ["Waiters", "Keep separate; optional link later", "Only if Cafe module subscribed"],
    ["Shifts", "Short / split shifts common", "24/7 rotating & night shifts"],
    ["Finance link", "Often no Finance module", "Natural with Financial Mgmt"],
  ],
  [38, 70, 66],
);

callout(
  "Important rule",
  "Do not fold waiters into HR in v1. Waiters are sales/tip identity today. Optionally link waiter → employee later.",
);

// ——— PAGE 3: V1 / Core ———
newPage();
title("3. Phase A — HR Core (v1)");
para(
  "Ship value quickly: “know and schedule your people.” This is the recommended first release.",
);

h2("3.1 Capabilities");
bullet("Employee master — name, phone, department, job title, status (active / left)");
bullet("Optional link to a login credential (role/terminal)");
bullet("Leave requests + simple approve/reject (Manager/Admin or HR role)");
bullet("Basic attendance / shift roster by day and department");
bullet("Replace free-text people where useful (CM assignee, dept leader) with employee picker");
bullet("Manager/Admin scorecard: headcount, on leave today, open leave requests");

h2("3.2 Explicitly out of scope for v1");
bullet("Payroll, payslips, tax/pension calculations");
bullet("Full document vault / contracts lifecycle");
bullet("Recruiting / applicant tracking");
bullet("Performance reviews / OKRs");
bullet("Merging waiters into employee records");

h2("3.3 Suggested terminals / gating");
bullet("Opt-in module \"HR Module\" (remove Coming soon flag when ready)");
bullet("Grantable role: HR (ROLE_REQUIRED_MODULE = HR Module)");
bullet("Admin (cafe) and Manager (hotel) can host HR tabs even without dedicated HR staff");
bullet("Add pricing tier when sold (signup pricing currently ignores HR)");

// ——— PAGE 4: Advanced ———
newPage();
title("4. Phase B+ — Advanced HR");
para(
  "Advanced = Core + employment files + timekeeping that drives pay + payroll (incl. tips) + Finance handoff. Still hospitality-focused, not full talent suites.",
);

h2("4.1 Employment & documents");
bullet("Contracts, start/end dates, probation, wage type (hourly / monthly / tip-eligible)");
bullet("Document vault: ID, contracts, certificates");
bullet("Onboarding / offboarding checklists (uniform, keys, revoke credential)");

h2("4.2 Time that drives pay");
bullet("PIN / biometric-style clock-in, late/absent flags, overtime rules");
bullet("Shift templates by department (kitchen morning, reception night, CM floors)");
bullet("Timesheet approval → feeds payroll");
bullet("Support split shifts (common in F&B and lodging)");

h2("4.3 Leave policy");
bullet("Leave types with balances (annual, sick, unpaid)");
bullet("Accrual rules and blackout dates (peak season / holidays)");
bullet("Dual approval for larger hotels; Admin alone for small cafés");

h2("4.4 Payroll (the big jump)");
bullet("Gross from salary / hours / overtime / tips");
bullet("Deductions: tax, pension, advances, absences (Ethiopia-oriented; TIN already in product)");
bullet("Payslips, period close, export/posting to Finance when subscribed");
bullet("Tip pooling for café waiters — bridge existing tip/income arrays into payroll");

h2("4.5 Light performance & optional recruiting");
bullet("Probation reviews, simple role scorecards, warnings/incidents");
bullet("Optional recruiting pipeline for high-turnover hotel roles (HK, F&B)");

h2("4.6 Cross-module bridges (what makes it “HotCol advanced”)");
table(
  ["Existing gap", "Advanced HR closes it"],
  [
    ["Credentials", "Employee ↔ login; offboard revokes access"],
    ["Waiters", "Employment + tip settlement into payroll"],
    ["CM / dept leaders", "Pick active employees, not free text"],
    ["Credit STAFF", "Link registrant to employee"],
    ["Finance module", "Payroll period as cost / payable"],
    ["Manager scorecard", "Labor cost %, OT, turnover"],
  ],
  [48, 126],
);

// ——— PAGE 5: Packaging & questions ———
newPage();
title("5. Suggested packaging");
para(
  "Either one subscription with add-ons, or clear tiers. Recommended packaging:",
);

table(
  ["Package", "Includes"],
  [
    ["HR Core", "Employee master, leave, light roster"],
    ["HR Time", "Clock + shift templates + timesheets"],
    ["HR Pay", "Payroll, tips, payslips, Finance export"],
    ["HR Hire (optional)", "Recruiting pipeline"],
  ],
  [48, 126],
);

callout(
  "Practical build order",
  "1) Core  →  2) Time  →  3) Pay  →  4) Hire. Scorecards last. Do not start with recruiting or full talent management.",
);

title("6. Questions for your revision");
para("Please mark Agree / Change / Defer next to each:");
y += 1;
bullet("Is Core (employee + leave + light roster) the right v1?");
bullet("Should Café and Hotel share one module key (recommended: yes)?");
bullet("Dedicated HR role required for Hotel from day one, or Manager-only first?");
bullet("Keep Waiters separate until Pay phase?");
bullet("Is payroll in-scope for year 1, or Core+Time only?");
bullet("Any Ethiopia-specific payroll rules we must lock early (tax/pension)?");
bullet("Should free-text CM assignees move to employee picker in Core or later?");
bullet("Pricing: flat HR fee vs Core / Time / Pay add-ons?");

y += 4;
h2("7. Revision notes (write here)");
para(
  "________________________________________________________________",
);
para(
  "________________________________________________________________",
);
para(
  "________________________________________________________________",
);
para(
  "________________________________________________________________",
);
para(
  "________________________________________________________________",
);

y += 6;
callout(
  "Summary for decision",
  "Build hospitality workforce ops first (people, leave, shifts). Add time & payroll when Core is trusted. Never confuse HR Module with Credentials. Café and Hotel share the module; Hotel needs deeper shift/department support.",
);

footer();

fs.mkdirSync(outDir, { recursive: true });
doc.save(outPath);
console.log("Wrote", outPath);
