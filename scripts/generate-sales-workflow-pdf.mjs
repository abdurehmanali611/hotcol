/**
 * HotCol — Sales Workflow Guide (EN + AM). Run:
 *   node scripts/generate-sales-workflow-pdf.mjs
 */
import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "docs");
const outPath = path.join(outDir, "HotCol-Sales-Workflow-Guide.pdf");

const doc = new jsPDF({ unit: "mm", format: "a4" });
const pageW = doc.internal.pageSize.getWidth();
const pageH = doc.internal.pageSize.getHeight();
const margin = 16;
const contentW = pageW - margin * 2;
let y = margin;
let page = 1;

// ---------- fonts ----------
let ETH = "helvetica";
for (const p of [
  "C:\\Windows\\Fonts\\nyala.ttf",
  "C:\\Windows\\Fonts\\ebrima.ttf",
  "C:\\Windows\\Fonts\\sylfaen.ttf",
]) {
  if (fs.existsSync(p)) {
    const b64 = fs.readFileSync(p).toString("base64");
    doc.addFileToVFS(path.basename(p), b64);
    doc.addFont(path.basename(p), "Eth", "normal");
    doc.addFont(path.basename(p), "Eth", "bold");
    ETH = "Eth";
    break;
  }
}

// ---------- helpers ----------
function footer() {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text(`HotCol — Sales Workflow Guide · Page ${page}`, pageW / 2, pageH - 8, { align: "center" });
  doc.setTextColor(0);
}
function newPage() { footer(); doc.addPage(); page++; y = margin; }
function ensure(n) { if (y + n > pageH - 16) newPage(); }
function band(text, bg = [13, 148, 136], fg = 255) {
  ensure(14);
  doc.setFillColor(...bg);
  doc.roundedRect(margin, y - 7, contentW, 11, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(fg);
  doc.text(text, margin + 5, y);
  y += 8;
  doc.setTextColor(0);
}
function h2(text, amharic) {
  ensure(12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 60, 70);
  doc.text(text, margin, y);
  y += 6;
  if (amharic) {
    doc.setFont(ETH, "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 60, 70);
    doc.text(amharic, margin, y);
    y += 6;
  }
  doc.setDrawColor(13, 148, 136);
  doc.setLineWidth(0.5);
  doc.line(margin, y - 4, margin + 35, y - 4);
  doc.setTextColor(0);
  y += 2;
}
function para(text, font = "helvetica", size = 10, color = 40) {
  doc.setFont(font, "normal");
  doc.setFontSize(size);
  doc.setTextColor(color);
  const lines = doc.splitTextToSize(text, contentW);
  for (const ln of lines) { ensure(6); doc.text(ln, margin, y); y += 5.2; }
  y += 1.5;
  doc.setTextColor(0);
}
function bullets(items, font = "helvetica") {
  doc.setFont(font, "normal");
  doc.setFontSize(10);
  doc.setTextColor(50);
  for (const it of items) {
    const lines = doc.splitTextToSize(it, contentW - 8);
    lines.forEach((ln, i) => {
      ensure(6);
      if (i === 0) doc.text("•  " + ln, margin + 3, y);
      else doc.text("    " + ln, margin + 3, y);
      y += 5.2;
    });
  }
  y += 2;
  doc.setTextColor(0);
}
function table(headers, rows, widths) {
  const rowH = 7;
  ensure(rowH + 2);
  doc.setFillColor(240, 253, 250);
  doc.rect(margin, y - 4.6, contentW, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 60, 70);
  let x = margin + 2;
  headers.forEach((h, i) => { doc.text(h, x, y); x += widths[i]; });
  y += rowH;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50);
  rows.forEach((r, ri) => {
    ensure(rowH);
    if (ri % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(margin, y - 4.6, contentW, rowH, "F"); }
    let xx = margin + 2;
    r.forEach((c, i) => {
      const lines = doc.splitTextToSize(String(c), widths[i] - 3);
      doc.text(lines[0] ?? "", xx, y);
      xx += widths[i];
    });
    y += rowH;
  });
  y += 3;
  doc.setTextColor(0);
}
function step(n, title, desc) {
  ensure(14);
  doc.setFillColor(13, 148, 136);
  doc.circle(margin + 4, y - 1.6, 3.4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255);
  doc.text(String(n), margin + 4, y, { align: "center" });
  doc.setTextColor(20, 40, 60);
  doc.setFontSize(11);
  doc.text(title, margin + 11, y);
  y += 5.5;
  para(desc, "helvetica", 9.5, 70);
  doc.setTextColor(0);
}

// ================= COVER =================
doc.setFillColor(13, 148, 136);
doc.rect(0, 0, pageW, 70, "F");
doc.setFillColor(15, 60, 70);
doc.rect(0, 70, pageW, 3, "F");
doc.setTextColor(255);
doc.setFont("helvetica", "bold");
doc.setFontSize(30);
doc.text("HotCol", margin, 34);
doc.setFontSize(15);
doc.setFont("helvetica", "normal");
doc.text("Complete System Workflow Guide for Sales", margin, 46);
doc.setFont(ETH, "bold");
doc.setFontSize(13);
doc.text("የሆትኮል ስርዓት አጠቃላይ የስራ ፍሰት መመሪያ", margin, 58);
y = 95;
doc.setTextColor(30);
doc.setFont("helvetica", "normal");
doc.setFontSize(11);
para(
  "This guide explains the whole HotCol platform for our sales representatives. It covers the 6 HotCol applications, how a property uses them day to day, and the exact workflows you can present to clients — in English and Amharic, side by side.",
);
para("ይህ መመሪያ የሆትኮልን ፕላትፎርም በሙሉ ለሽያጭ ቡድናችን ያስረዳል። ስድስቱን የሆትኮል መተግበሪያዎች፣ አንድ ሆቴል ወይም ካፌ በየቀኑ እንዴት እንደሚጠቀምባቸው እና ለደንበኞች ልታቀርቡት የሚችሉትን የስራ ፍሰቶች በእንግሊዝኛና በአማርኛ ያብራራል።", ETH, 11, 30);
doc.setFont("helvetica", "italic");
doc.setFontSize(9);
doc.setTextColor(120);
doc.text(`Apex Solution · ${new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long" })} · Internal sales enablement`, margin, pageH - 20);
newPage();

// ================= 1. OVERVIEW =================
band("1. What is HotCol?  /  ሆትኮል ምንድነው?");
para(
  "HotCol is a multi-property hospitality management platform for hotels, cafes & restaurants. One company signs up once and gets a suite of connected applications that share one database: staff apps, guest apps, an owner mobile app, and an admin/Apex dashboard.",
);
para("ሆትኮል ለሆቴሎች፣ ለካፌዎችና ለሬስቶራንቶች የተዘጋጀ የሆስፒታሊቲ አስተዳደር ፕላትፎርም ነው። አንድ ድርጅት አንድ ጊዜ ተመዝግቦ ሁሉንም መተግበሪያዎች ይጠቀማል — የሰራተኞች፣ የእንግዶች፣ የባለቤት እና የአስተዳዳሪ መተግበሪያዎች፣ ሁሉም በአንድ ዳታቤዝ ላይ ተገናኝተው ይሰራሉ።", ETH, 10, 60);
table(["App", "Who uses it", "What it does"], [
  ["hotcol-user", "Manager, Reception, HR, Finance, Store, Cashier", "Core staff app: hotel operations, cafe, HR, finance, inventory"],
  ["hotcol-waiter", "Waiters (cafe/restaurant)", "Take table orders from phones; request payment approval"],
  ["hotcol-room", "Hotel guests (in-room)", "Guest portal: order food/laundry, see bill, complain, rate"],
  ["hotcol-emp", "Hotel/cafe employees", "Employee self-service: attendance, leave, payslips, chat with HR"],
  ["hotcol-ats", "HR / hiring managers", "Recruiting: post vacancies, receive applications, hire"],
  ["hotcol-owner", "Property owners", "Mobile oversight: revenue, staff, inventory, approvals"],
], [34, 62, 78]);

// ================= 2. REPO DETAILS =================
band("2. The 6 applications in detail  /  ስድስቱ መተግበሪያዎች በዝርዝር");

function repo(name, en, am) {
  h2(name);
  para(en);
  para(am, ETH, 10, 60);
}
repo("hotcol-user — Staff Operations (the heart of the system)",
  "The main application used inside the property. Roles: Manager (full oversight: occupancy, ADR/RevPAR reports, rate plans), Reception (check-in/out, active stays, bills), CMLeader (housekeeping assignments), Finance (payroll, credit, VAT), HR (employees, leave, payroll), HotelCashier & HotelStore (orders, cash-outs, stock). Every daily operation — a room sale, a cafe order, a staff salary — runs through this app.",
  "በሆቴሉ ውስጥ የሚሰራው ዋና መተግበሪያ። ሚናዎች፡ ሜኔጀር፣ ሪሴፕሽን (የመግባት/የመውጫ፣ ንቁ እንግዳ፣ ሂሳብ)፣ ጽዳት/ስራ ሐላፊ (CMLeader)፣ ፋይናንስ፣ HR፡ እያንዳንዱ የዕለት ስራ — የክፍል ሽያጭ፣ የካፌ ትዕዛዝ፣ ደመወዝ — ሁሉም በዚህ መተግበሪያ በኩል ይነዳል።");
repo("hotcol-waiter — Waiter Portal (cafe/restaurant)",
  "Waiters sign in with a 6-digit passkey from their phone, take table orders, and send kitchen/bar tickets automatically. They cannot mark bills paid; they request payment approval from the cashier. Recipe stock is checked live, so a waiter can never sell an item whose ingredients are finished.",
  "ዌተሮች በስልካቸው በ6-አሃዝ ፓስኮድ ገብተው የጠረጴዛ ትዕዛዝ ይወስዳሉ፣ ኪቹን/ባር በራሱ ይደርሳቸዋል። ሂሳብ መዘጋትን አይችሉም — የክፍያ ፍቃድ ከካሸር ይጠይቃሉ። የምግብ ስቶክ በቀጥታ ይጣራል ስለዚህ ያለ እቅፎ ንጥ አይሸምም።");
repo("hotcol-room — Guest Portal (in the hotel room)",
  "Each guest gets a one-time code. Inside their room they can order food and laundry, watch their live bill, call the front desk, file a complaint, and rate their stay at checkout. Everything they consume is posted automatically to their room bill in hotcol-user.",
  "እያንዳንዱ እንግዳ አንድ ጊዜ ተሰጥቶት የሆነ ኮድ ያገኛል። በክፍሉ ውስጥ ሆኖ ምግብና ልብስ ማጠቢያ ማዘዝ፣ የቀጥታ ሂሳቡን ማየት፣ በሬውን መደወል፣ አስተያየት መዶር እና በውጭ ሲወጣ ደረጃ መስጠት ይችላል።");
repo("hotcol-emp — Employee Self-Service",
  "Staff log in to see their attendance, request leave, view payslips, track their requests through approval flow, and chat directly with HR. HR responds and moves requests through the same approval engine the manager uses.",
  "ሰራተኞች ገብተው የሰራበት ጊዜ፣ የእረፍት ጥያቄ፣ የደመወዝ ደረሳቸው ያያሉ፣ ጥያቄያቸውን በፍቃድ ደረጃ ይከታተላሉ፣ ከHR ጋር በቀጥታ ይወያያሉ። HR ተመሳሳይ የፍቃድ ሞተር ይጠቀማል።");
repo("hotcol-ats — Recruiting (Applicant Tracking)",
  "Hotels publish vacancies with a per-property careers link. Candidates apply online with their CV. HR reviews applications, moves them through the pipeline, and hires — the new hire automatically appears as an employee in the HR module with a portal OTP.",
  "ሆቴሎች ቦታዎችን በእያንዳንዱ ንብረት የካሪየር ማስፈንጠሪያ ያትማሉ። እጩዎች በመስመር ላይ ከCV ጋር ያመለክታሉ። HR አይታዘበናል፣ በአይነቱ ያልፋፋል፣ መቅጠርን ያረጋግጣል — አዲሱ ሰው በራሱ ወደ ሠራተኛ እና ወደ ፖርታል OTP ይገባል።");
repo("hotcol-owner — Owner Mobile App",
  "Owners open the Expo mobile app to see every property at a glance: revenue, occupancy, cafe sales, inventory value, staff, pending approvals, and subscription status. They approve payment proofs and manage staff logins — without touching day-to-day operations.",
  "ባለቤቶች በኤክስፖ የሞባይል መተግበሪያ በቅርብ ጊዜ የሁሉንም ንብረቶች ገቢ፣ የሙሉነት ደረጃ፣ የካፌ ሽያጭ፣ የክምችት እሴት፣ ሰራተኞች፣ ፍቃድ የሚጠብቁ እና የምዝገባ ሁኔታ ያያሉ። የክፍያ ማረጋገጫ ያጸድቃሉ፣ የሰራተኛ መግቢያም ያስተዳድራሉ — የዕለት ስራ አይነኩ።");

// ================= 3. WORKFLOWS =================
band("3. End-to-end workflows  /  ከጫፍ እስከ ጫፍ የስራ ፍሰቶች");

h2("A. Hotel guest journey — from arrival to checkout", "የሆቴል እንግዳ ጉዞ ከመግባት እስከ መውጫ");
step(1, "Reservation or walk-in", "The guest books online/phone (source: website/phone/agency) or simply walks in. Walk-ins get a reservation with source 'walk_in'.");
step(2, "Check-in (Reception)", "Reception creates the stay in hotcol-user: room(s), nights, rate plan, guest details. A guest OTP is issued for the room portal.");
step(3, "In-room services (hotcol-room)", "The guest orders food/laundry from the room. Orders post to the room folio as bill lines and appear on live dashboards.");
step(4, "Housekeeping & maintenance (CMLeader)", "CM app assigns rooms to cleaners; room statuses move vacant_dirty → cleaned → inspected → vacant_clean, visible to reception in real time.");
step(5, "Checkout & payment", "Reception finalizes nights, applies tax/rate plan, settles the bill (cash/bank/telebirr), prints receipt. Room becomes vacant_dirty.");
step(6, "Rating & reporting", "The guest can rate the stay; the manager sees occupancy, ADR, RevPAR and walk-in vs booking-source reports in hotcol-user.");

h2("B. Cafe/restaurant service cycle", "የካፌ/ሬስቶራንት የአገልግሎት ዑደት");
step(1, "Waiter takes the order (hotcol-waiter)", "Order is checked against live recipe stock — unavailable dishes are blocked.");
step(2, "Kitchen/bar ticket", "The order appears on Chef/Bar station screens; staff mark items served.");
step(3, "Payment (Cashier)", "Waiter requests payment approval; the cashier confirms the payment method and closes the bill.");
step(4, "Stock & P&L", "Recipe ingredients are consumed from inventory; daily revenue, station snapshots and cost control update automatically.");

h2("C. HR: hire → onboard → pay", "HR፡ መቅጠር → መግባት → ደመወዝ");
step(1, "Vacancy & applications (hotcol-ats)", "HR posts a vacancy; candidates apply with CV via the property's careers link.");
step(2, "Hire", "HR hires an application — an employee record is auto-created with a portal OTP.");
step(3, "Employee self-service (hotcol-emp)", "The employee marks attendance, requests leave, chats with HR; each request follows the approval flow.");
step(4, "Payroll (Manager/Finance in hotcol-user)", "Payroll period runs: gross, allowances, deductions, attendance-based adjustments → payslips published to the employee app.");

h2("D. Owner oversight", "የባለቤት ቁጥጥር");
step(1, "Owner logs into hotcol-owner", "Chooses a property and a report period.");
step(2, "Review", "Revenue, occupancy, cafe sales, inventory value, staff, and open approvals update from the same live database.");
step(3, "Approve", "The owner verifies subscription/payment proofs, which unlock module continuation.");

h2("E. Cost control (hotel supplies)", "የወጪ ቁጥጥር (የሆቴል ግዥ)");
step(1, "Request", "Department leaders raise purchase/stock-out requests.");
step(2, "Approval queue", "Cost controller and manager approve in stages; vouchers are issued.");
step(3, "Receive & audit", "Goods are received against approved vouchers; monthly snapshots track spending.");

// ================= 4. ROLES =================
band("4. Role ↔ app quick map  /  ሚና ↔ መተግበሪያ");
table(["Person", "App they open", "Key actions"], [
  ["Manager", "hotcol-user", "Reports (ADR/RevPAR/occupancy), rates, HR, approvals"],
  ["Reception", "hotcol-user", "Check-in/out, bills, guests, police report"],
  ["CMLeader", "hotcol-user", "Cleaning/maintenance assignments"],
  ["HotelCashier", "hotcol-user", "Cash-outs, payment verification"],
  ["Waiter", "hotcol-waiter", "Orders, payment approval requests"],
  ["Chef/Bar", "hotcol-user", "Station tickets, stock"],
  ["Employee", "hotcol-emp", "Attendance, leave, payslip, HR chat"],
  ["HR", "hotcol-user + hotcol-ats", "Hire, attendance, payroll, leave"],
  ["Finance", "hotcol-user", "Payroll, credit, VAT, cashouts"],
  ["Guest", "hotcol-room", "Orders, bill, complaint, rating"],
  ["Owner", "hotcol-owner", "Portfolio KPIs, approvals, payments"],
], [32, 55, 87]);

// ================= 5. TALKING POINTS =================
band("5. Sales talking points  /  የሽያጭ መልዕክቶች");
bullets([
  "One platform for the whole property: hotel rooms + cafe + HR + finance — no separate systems to reconcile.",
  "Every app shares one live database — a sale in the cafe appears on the owner's phone instantly.",
  "Ethiopian-first: ETB, VAT, Fayda/national IDs, Amharic/Amharic-romanized item naming assistance (Crystal AI).",
  "Role-based access: the waiter sees only orders, the owner sees only KPIs, reception only the front desk.",
  "Built-in controls: recipe stock blocking, approval flows, OTP login, guest verification.",
  "Scale: multi-property, multi-tenant — one owner can manage many hotels/cafes from the owner app.",
]);
para(
  "ዋና ዋና ነጥቦች፡ አንድ ሆቴል ሁሉንም በአንድ መድረክ ያስተዳድራል፤ ሁሉም መተግበሪያ በቀጥታ ተገናኝቷል፤ በኢትዮጵያ (ETB፣ VAT፣ ፋይዳ) የተዘጋጀ ነው፤ በሚና የተከፈለ መዳረሻ አለ።",
  ETH, 10, 60,
);

// ================= 6. CREDENTIALS =================
band("6. Test property credentials  /  የምርጫ ባለቤቶች መለያዎች");
para("Shared test properties for sales demos. All staff passwords for these tenants: 12345678", "helvetica", 10, 40);
para("ለሽያጭ ማሳያዎች የሚጠቀሙ የሙከራ ንብረቶች። ሁሉም የሰራተኛ የይለፍ ቃል፡ 12345678", ETH, 10, 60);

table(["Property", "Username", "Password", "Role"], [
  ["Apex Cafe and Restaurant", "apex", "12345678", "Admin"],
  ["", "apex_cash", "12345678", "Cashier"],
  ["", "apex_chef", "12345678", "Kitchen"],
  ["", "apex_bar", "12345678", "Barista"],
  ["", "apex_store", "12345678", "Store"],
  ["Apex Hotel", "apexHotel", "12345678", "Manager"],
  ["", "apexReception", "12345678", "Reception"],
  ["", "apexCM", "12345678", "CMLeader"],
  ["", "apexFinance", "12345678", "Finance"],
  ["", "apexHR", "12345678", "HR"],
  ["", "apexCost", "12345678", "CostControl"],
  ["", "apexStore", "12345678", "Store"],
  ["", "apexCash", "12345678", "HotelCashier"],
  ["", "apexChef", "12345678", "Kitchen"],
  ["", "apexBar", "12345678", "Barista"],
  ["ApexAnalog cafe and restaurant", "apexAnalog", "12345678", "Admin"],
  ["", "apexAnalogCash", "12345678", "Cashier"],
  ["ApexAnalog Hotel", "apexAnalogHotel", "12345678", "Manager"],
  ["", "apexAnalogHCash", "12345678", "Cashier"],
], [52, 42, 30, 70]);

h2("Other access types (OTP / passkey / owner)", "ሌሎች የመዳረሻ ዓይነቶች");
bullets([
  "Employee portal (hotcol-emp): employee logs in with HR-issued portal OTP (one-time code set by HR). Example seeded OTP: Mulunesh Ahmed (Apex Hotel, Chef) → OTP 87F7FK.",
  "Waiter portal (hotcol-waiter): 6-digit waiter passkey, set per waiter (ChangeWaiterPasskeyButton). If passkey is empty, the waiter cannot log in until a passkey is assigned.",
  "Guest room portal (hotcol-room): 6-digit guest OTP issued at check-in by reception, unique per active stay.",
  "Owner app (hotcol-owner): owner accounts (e.g. apexOwner, bazOwner, gtOwner) — password set per owner, not the shared test password; ask Apex for owner credentials.",
]);
para("የሰራተኛ ፖርታል፡ በHR የተሰጠ OTP። ዌተር ፖርታል፡ 6-አሃዝ ፓስኮድ። የእንግዳ ፖርታል፡ በሪሴፕሽን የተሰጠ OTP። የባለቤት መተግበሪያ፡ የራሱ የይለፍ ቃል አለው።", ETH, 10, 60);

h2("Role tester quick cases  /  ሚና መሞከሪያዎች");
table(["Role", "Username", "Test this flow"], [
  ["Admin (cafe)", "apex / apexAnalog", "Full cafe dashboard, menu, reports"],
  ["Cashier (cafe)", "apex_cash / apexAnalogCash", "Approve waiter payment requests, cash-out"],
  ["Kitchen / Barista", "apex_chef / apex_bar", "Live station tickets"],
  ["Manager (hotel)", "apexHotel / apexAnalogHotel", "Occupancy, ADR/RevPAR reports"],
  ["Reception", "apexReception", "Check-in a guest, view active stays"],
  ["CMLeader", "apexCM", "Assign room cleaning jobs"],
  ["HR", "apexHR", "Add employee, run payroll period"],
  ["Finance", "apexFinance", "Credit levels, VAT, cashouts"],
  ["CostControl", "apexCost", "Approve purchase requests"],
  ["Store", "apexStore", "Items, stock, suppliers"],
  ["HotelCashier", "apexCash", "Payment verification"],
], [40, 55, 79]);

// ================= 7. GLOSSARY =================
band("7. Key terms  /  ቁልፍ ቃላት");
table(["Term", "Meaning"], [
  ["TIN", "Taxpayer Identification Number — identifies each property/tenant"],
  ["Sold nights", "Number of nights actually paid by guests"],
  ["Available", "Rooms × days in the period (minus complimentary holds)"],
  ["Complimentary", "Rooms given free — counted as company cost"],
  ["In-house", "Guests currently checked in"],
  ["Checked out", "Guests who completed their stay"],
  ["Walk-in", "Guest who arrived without a prior booking"],
  ["ADR / RevPAR", "Average daily rate / revenue per available room"],
], [32, 142]);

footer();
fs.mkdirSync(outDir, { recursive: true });
doc.save(outPath);
console.log("Wrote", outPath);
