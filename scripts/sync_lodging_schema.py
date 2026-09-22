"""Sync expanded lodging Prisma block across HotCol repos."""
from pathlib import Path

OLD_START = (
    "// =============================================================================\n"
    "// LODGING — Room Management + Cleaning & Maintenance\n"
    "// ============================================================================="
)
OLD_END = (
    "// =============================================================================\n"
    "// HR MODULE (Phase 2)"
)

NEW = r"""// =============================================================================
// LODGING — Room Management + Cleaning & Maintenance
// =============================================================================

/// Physical room at a lodging property (Manager CRUD).
model lodging_room {
  id                 Int       @id @default(autoincrement())
  HotelName          String
  roomNumber         String
  roomType           String
  floor              String    @default("")
  /// Nightly rate in ETB (Manager-set).
  pricePerNightETB   Float     @default(0)
  /// King | Queen | Twin | … (display / inventory)
  bedType            String    @default("")
  /// Max adult guests the room is sold for.
  capacity           Int       @default(2)
  /// Free-text amenities (comma-separated or short list).
  amenities          String    @default("") @db.VarChar(2048)
  /// Optional room photo URL.
  imageUrl           String    @default("") @db.VarChar(2048)
  /// vacant_dirty | occupied | vacant_clean | on_maintenance | reserved | inspected | out_of_order | out_of_service | blocked
  status             String    @default("vacant_clean")
  /// When status is on_maintenance — expected ready datetime (legacy; prefer statusExpectedEndAt).
  maintenanceUntil   DateTime?
  /// Expected ready date for vacant_dirty / on_maintenance (reservation hold eligibility).
  statusExpectedEndAt DateTime?
  notes              String    @db.Text
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  createdBy          String    @default("")
  updatedBy          String    @default("")

  stayRooms          lodging_stay_room[]
  cmAssignments      lodging_cm_assignment[]
  reservationRooms   lodging_reservation_room[]

  @@unique([HotelName, roomNumber])
  @@index([HotelName])
  @@index([HotelName, status])
  @@index([HotelName, roomType])
}

/// Returning guest profile (reusable across stays).
model lodging_guest {
  id              Int      @id @default(autoincrement())
  HotelName       String
  firstName       String
  lastName        String
  sex             String   @default("")
  phone           String
  phoneSecondary  String   @default("")
  email           String   @default("")
  /// true = Ethiopian (Fayda FCN/FIN); false = passport
  isEthiopian     Boolean  @default(true)
  nationalId      String   @default("")
  passportNumber  String   @default("")
  country         String   @default("Ethiopia")
  stateRegion     String   @default("")
  addressLine     String   @default("")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  stays         lodging_stay[]
  reservations  lodging_reservation[]
  complaints    lodging_guest_complaint[]
  ratings       lodging_guest_rating[]

  @@index([HotelName])
  @@index([HotelName, phone])
  @@index([HotelName, nationalId])
  @@index([HotelName, passportNumber])
}

/// Advance booking (before check-in). Converted to lodging_stay on check-in.
model lodging_reservation {
  id                Int       @id @default(autoincrement())
  HotelName         String
  reservationCode   String
  guestId           Int?
  /// tentative | confirmed | cancelled | no_show | checked_in
  status            String    @default("tentative")
  /// walk_in | phone | website | agency | corporate | other
  source            String    @default("phone")
  arrivalAt         DateTime
  departureAt       DateTime
  nights            Int       @default(1)
  adults            Int       @default(1)
  children          Int       @default(0)
  preferredRoomType String    @default("")
  depositETB        Float     @default(0)
  /// cash | bank | telebirr | "" — method used for the reservation deposit
  depositPaymentMethod String  @default("")
  isCompany         Boolean   @default(false)
  companyName       String    @default("")
  companyTin        String    @default("")
  notes             String    @db.Text
  createdBy         String    @default("")
  updatedBy         String    @default("")
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  guest  lodging_guest?              @relation(fields: [guestId], references: [id], onDelete: SetNull)
  rooms  lodging_reservation_room[]
  stay   lodging_stay?

  @@unique([HotelName, reservationCode])
  @@index([HotelName])
  @@index([HotelName, status])
  @@index([HotelName, arrivalAt])
  @@index([guestId])
}

model lodging_reservation_room {
  id            Int      @id @default(autoincrement())
  reservationId Int
  /// Optional specific room hold (null = room-type only until check-in).
  roomId        Int?
  roomType      String   @default("")
  createdAt     DateTime @default(now())

  reservation lodging_reservation @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  room        lodging_room?       @relation(fields: [roomId], references: [id], onDelete: SetNull)

  @@index([reservationId])
  @@index([roomId])
}

/// One check-in / in-house stay (may span multiple rooms).
model lodging_stay {
  id                  Int       @id @default(autoincrement())
  HotelName           String
  voucherCode         String
  guestId             Int
  reservationId       Int?      @unique
  /// reserved | checked_in | checked_out | cancelled
  status              String    @default("checked_in")
  arrivalAt           DateTime
  /// Snapshot of reservation.arrivalAt at check-in (reporting when it differs from actual arrival).
  reservedArrivalAt   DateTime?
  /// Expected departure at check-in; updated to actual at checkout.
  departureAt         DateTime
  /// Expected nights entered at check-in.
  expectedNights      Int       @default(1)
  expectedDepartureAt DateTime?
  /// Billable nights — provisional at check-in, finalized at checkout.
  nights              Int       @default(1)
  adults              Int       @default(1)
  children            Int       @default(0)
  preferredRoomType   String    @default("")
  /// Frozen rate plan used for room night pricing (empty = room rack rate).
  ratePlanId          Int?
  ratePlanName        String    @default("")
  isCompany           Boolean   @default(false)
  companyName         String    @default("")
  companyTin          String    @default("")
  notes               String    @db.Text
  checkedInBy         String    @default("")
  checkedOutBy        String    @default("")
  /// Guest room portal OTP (6 digits). Unique among active stays (enforced at issue time).
  guestOtp            String?
  guestOtpHash        String?
  guestOtpIssuedAt    DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  guest       lodging_guest        @relation(fields: [guestId], references: [id], onDelete: Restrict)
  reservation lodging_reservation? @relation(fields: [reservationId], references: [id], onDelete: SetNull)
  rooms       lodging_stay_room[]
  bill        lodging_bill?
  actions     lodging_action_log[]
  complaints  lodging_guest_complaint[]
  ratings     lodging_guest_rating[]

  @@unique([HotelName, voucherCode])
  @@index([HotelName])
  @@index([HotelName, status])
  @@index([guestId])
  @@index([arrivalAt])
  @@index([departureAt])
  @@index([guestOtp])
}

model lodging_stay_room {
  id        Int      @id @default(autoincrement())
  stayId    Int
  roomId    Int
  roomType  String   @default("")
  createdAt DateTime @default(now())

  stay lodging_stay @relation(fields: [stayId], references: [id], onDelete: Cascade)
  room lodging_room @relation(fields: [roomId], references: [id], onDelete: Restrict)

  @@unique([stayId, roomId])
  @@index([roomId])
}

model lodging_bill {
  id            Int       @id @default(autoincrement())
  HotelName     String
  stayId        Int       @unique
  /// open | settled | void
  status        String    @default("open")
  totalETB      Float     @default(0)
  cashETB       Float     @default(0)
  bankETB       Float     @default(0)
  telebirrETB   Float     @default(0)
  settledAt     DateTime?
  settledBy     String    @default("")
  receiptNumber String    @default("")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  stay  lodging_stay        @relation(fields: [stayId], references: [id], onDelete: Cascade)
  lines lodging_bill_line[]

  @@index([HotelName])
  @@index([HotelName, status])
}

model lodging_bill_line {
  id                Int       @id @default(autoincrement())
  billId            Int
  /// room | food_drink | laundry | other | discount
  kind              String
  description       String
  quantity          Float     @default(1)
  unitPriceETB      Float     @default(0)
  amountETB         Float     @default(0)
  taxPercent        Float     @default(0)
  taxETB            Float     @default(0)
  /// JSON array: [{ name, percent, amountETB }] — named tax split at posting time
  taxDetailJson     String    @default("") @db.VarChar(4096)
  roomNumber        String    @default("")
  fulfillmentStatus String    @default("pending")
  fulfilledAt       DateTime?
  fulfilledBy       String    @default("")
  voided            Boolean   @default(false)
  voidedAt          DateTime?
  voidedBy          String    @default("")
  voidReason        String    @default("")
  /// "" | pending | approved | rejected — discounts need Manager approval
  approvalStatus    String    @default("")
  approvedBy        String    @default("")
  approvedAt        DateTime?
  approvalNote      String    @default("")
  createdAt         DateTime  @default(now())
  createdBy         String    @default("")

  bill lodging_bill @relation(fields: [billId], references: [id], onDelete: Cascade)

  @@index([billId])
  @@index([kind])
  @@index([fulfillmentStatus])
  @@index([approvalStatus])
}

model lodging_service_item {
  id           Int      @id @default(autoincrement())
  HotelName    String
  /// food_drink | laundry
  kind         String
  name         String
  unitPriceETB Float    @default(0)
  unitLabel    String   @default("pcs")
  imageUrl     String   @default("") @db.VarChar(2048)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([HotelName])
  @@index([HotelName, kind])
  @@unique([HotelName, kind, name])
}

model lodging_cm_assignment {
  id             Int       @id @default(autoincrement())
  HotelName      String
  roomId         Int
  /// cleaning | maintenance
  workKind       String
  assigneeName   String
  notes          String    @db.Text
  /// open | done | cancelled
  status         String    @default("open")
  assignedBy     String    @default("")
  completedBy    String    @default("")
  completedAt    DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  room lodging_room @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@index([HotelName])
  @@index([HotelName, status])
  @@index([roomId])
}

model lodging_action_log {
  id         Int      @id @default(autoincrement())
  HotelName  String
  actorRole  String   @default("")
  actorName  String   @default("")
  action     String
  entityType String   @default("")
  entityId   Int?
  stayId     Int?
  detailJson String   @db.Text
  createdAt  DateTime @default(now())

  stay lodging_stay? @relation(fields: [stayId], references: [id], onDelete: SetNull)

  @@index([HotelName])
  @@index([HotelName, createdAt])
  @@index([stayId])
  @@index([actorName])
}

/// Named tax rows per folio kind (e.g. VAT 15% on room). Multiple names per kind allowed.
model lodging_tax_config {
  id         Int      @id @default(autoincrement())
  HotelName  String
  /// Display name e.g. VAT, City tax
  name       String   @default("Tax")
  /// room | food_drink | laundry | other | penalty
  kind       String
  taxPercent Float    @default(0)
  updatedBy  String   @default("")
  updatedAt  DateTime @updatedAt
  createdAt  DateTime @default(now())

  @@unique([HotelName, kind, name])
  @@index([HotelName])
  @@index([HotelName, kind])
}

/// Manual business-day / shift close (night audit). Multiple overlapping shifts allowed.
model lodging_business_day {
  id           Int       @id @default(autoincrement())
  HotelName    String
  /// YYYY-MM-DD label day (shift may span midnight)
  businessDate String
  /// Optional shift label e.g. "Morning", "Shift 1"
  label        String    @default("")
  fromAt       DateTime
  toAt         DateTime
  /// open | closed
  status       String    @default("open")
  closedAt     DateTime?
  closedBy     String    @default("")
  summaryJson  String    @db.Text
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([HotelName])
  @@index([HotelName, status])
  @@index([HotelName, businessDate])
  @@index([HotelName, fromAt])
}

/// Sellable rate plans (rack, corporate, seasonal, weekend, promo, long-stay…).
model lodging_rate_plan {
  id               Int      @id @default(autoincrement())
  HotelName        String
  name             String
  code             String   @default("")
  /// standard | corporate | seasonal | weekend | promo | long_stay | group | event
  kind             String   @default("standard")
  /// Empty = all room types.
  roomType         String   @default("")
  pricePerNightETB Float    @default(0)
  /// YYYY-MM-DD inclusive; empty = no start bound
  startDate        String   @default("")
  /// YYYY-MM-DD inclusive; empty = no end bound
  endDate          String   @default("")
  minNights        Int      @default(1)
  /// Higher wins when multiple plans match.
  priority         Int      @default(0)
  isActive         Boolean  @default(true)
  notes            String   @db.Text
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  updatedBy        String   @default("")

  @@index([HotelName])
  @@index([HotelName, isActive])
  @@index([HotelName, kind])
  @@unique([HotelName, name])
}

/// Guest complaint from HotCol Room portal.
model lodging_guest_complaint {
  id         Int      @id @default(autoincrement())
  HotelName  String
  stayId     Int
  guestId    Int?
  roomId     Int?
  roomNumber String   @default("")
  category   String   @default("general")
  message    String   @db.Text
  /// open | acknowledged | resolved
  status     String   @default("open")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  stay  lodging_stay   @relation(fields: [stayId], references: [id], onDelete: Cascade)
  guest lodging_guest? @relation(fields: [guestId], references: [id], onDelete: SetNull)

  @@index([HotelName])
  @@index([HotelName, status])
  @@index([stayId])
  @@index([guestId])
  @@index([roomNumber])
}

/// Guest stay rating from HotCol Room portal (one per stay).
model lodging_guest_rating {
  id          Int      @id @default(autoincrement())
  HotelName   String
  stayId      Int      @unique
  guestId     Int?
  overall     Int
  cleanliness Int?
  service     Int?
  comment     String   @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  stay  lodging_stay   @relation(fields: [stayId], references: [id], onDelete: Cascade)
  guest lodging_guest? @relation(fields: [guestId], references: [id], onDelete: SetNull)

  @@index([HotelName])
  @@index([stayId])
}
"""

PATHS = [
    Path(r"C:\Users\abdur\Documents\Projects\hotcol-user\BackEnd\prisma\schema.prisma"),
    Path(r"C:\Users\abdur\Documents\Projects\hotcol-room\BackEnd\prisma\schema.prisma"),
    Path(r"C:\Users\abdur\Documents\Projects\hotcol-owner\BackEnd\prisma\schema.prisma"),
    Path(r"C:\Users\abdur\Documents\Projects\hotcol-waiter\BackEnd\prisma\schema.prisma"),
    Path(r"C:\Users\abdur\Documents\Projects\hotcol\GraphQl-BackEnd\prisma\schema.prisma"),
]


def main() -> None:
    for p in PATHS:
        text = p.read_text(encoding="utf-8")
        i = text.find(OLD_START)
        j = text.find(OLD_END)
        if i < 0 or j < 0 or j <= i:
            raise SystemExit(f"anchors missing in {p}")
        p.write_text(text[:i] + NEW + text[j:], encoding="utf-8")
        print("updated", p)
    print("done")


if __name__ == "__main__":
    main()
