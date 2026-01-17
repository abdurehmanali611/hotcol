import { z } from "zod";

export const login = z.object({
  UserName: z.string().min(2, "Username must be at least 2 characters long"),
  Password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const SignUpSchema = z.object({
  HotelName: z.string().min(1, "Hotel name is required"),
  LogoUrl: z.string().min(2, "Please Upload the Logo for your hotel"),
  UserName: z.string().min(2, "Make sure to enter username"),
  Password: z.string().min(2, "Please Enter a password")
})

export const createItemSchema = z.object({
  name: z.string().min(1, "Item name is required").max(100, "Name is too long"),
  price: z.number().min(0, "Price must be positive").max(10000, "Price is too high"),
  category: z.enum(["Food", "Beverage", "Others"], { message: "Category must be Food, Beverage, or Others" }),
  imageUrl: z.string().min(2, "Valid image URL is required"),
  HotelName: z.string().min(1, "Hotel name is required"),
  type: z.string().min(2, "Select Items Specific Category")
});

export const updateItemSchema = createItemSchema.extend({
  id: z.number().min(1, "Item ID is required"),
});

export const deleteItemSchema = z.object({
  id: z.number().min(1, "Item ID is required"),
});

export const createCredentialSchema = z.object({
  UserName: z.string().min(2, "Username must be at least 2 characters long"),
  Password: z.string().min(6, "Password must be at least 6 characters long"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  Role: z.enum(["Kitchen", "Barista", "Cashier"], { message: "Invalid role" }),
  HotelName: z.string().min(1, "Hotel name is required"),
  LogoUrl: z.string().url("Valid logo URL is required").optional(),
}).refine((data) => data.Password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const updateCredentialSchema = z.object({
  UserName: z.string().min(2, "Username must be at least 2 characters long"),
  Password: z.string().min(6, "Password must be at least 6 characters long"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  HotelName: z.string().min(1, "Hotel name is required"),
  Role: z.enum(["Kitchen", "Barista", "Cashier"], { message: "Invalid role" }),
}).refine((data) => data.Password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const updateAdminPasswordSchema = z.object({
  oldPassword: z.string().min(6, "Old password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters long"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  HotelName: z.string().min(1, "Hotel name is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const verifyPasswordSchema = z.object({
  HotelName: z.string().min(1, "Hotel name is required"),
  passwordInput: z.string().min(6, "Password is required"),
});

// ==================== WAITER MANAGEMENT ====================

export const createWaiterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long").max(100, "Name is too long"),
  sex: z.enum(["Male", "Female"], { message: "Sex must be Male or Female" }),
  age: z.coerce.number().min(18, "Waiter must be at least 18 years old").max(70, "Invalid age"),
  experience: z.coerce.number().min(0, "Experience cannot be negative").max(50, "Invalid experience"),
  phoneNumber: z.string().min(6, "Valid phone number is required"),
});

export const updateWaiterSchema = createWaiterSchema.extend({
  id: z.number().min(1, "Waiter ID is required"),
});

export const deleteWaiterSchema = z.object({
  id: z.number().min(1, "Waiter ID is required"),
});

export const createTableSchema = z.object({
  tableNo: z.coerce.number().min(1, "Table number must be at least 1").max(999, "Invalid table number"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1").max(20, "Capacity is too high"),
});

export const updateTableSchema = createTableSchema.extend({
  id: z.number().min(1, "Table ID is required"),
});

export const deleteTableSchema = z.object({
  id: z.number().min(1, "Table ID is required"),
});

// ==================== ORDER MANAGEMENT ====================

export const orderSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "Title is required"),
  imageUrl: z.string().url("Valid image URL is required"),
  orderAmount: z.number().min(1, "Order amount must be at least 1"),
  category: z.string().min(1, "Category is required"),
  type: z.string().min(1, "Type is required"),
  HotelName: z.string().min(1, "Hotel name is required"),
  price: z.number().min(0, "Price must be positive"),
  tableNo: z.number().min(1, "Table number is required"),
  waiterName: z.string().optional(),
  status: z.string().nullable(),
  payment: z.string(),
  createdAt: z.string(),
});

export const createOrderSchema = z.object({
  title: z.string().min(1, "Title is required"),
  imageUrl: z.string().url("Valid image URL is required"),
  tableNo: z.number().min(1, "Table number is required"),
  waiterName: z.string().min(1, "Waiter name is required"),
  type: z.string().min(1, "Type is required"),
  orderAmount: z.number().min(1, "Order amount must be at least 1"),
  HotelName: z.string().min(1, "Hotel name is required"),
  status: z.string().nullable().optional(),
  payment: z.string().nullable().optional(),
  category: z.enum(["food", "beverage", "others"], { message: "Category must be food, beverage, or others" }),
  price: z.number().min(0, "Price must be positive"),
});

export const updateStatusSchema = z.object({
  id: z.number().min(1, "Order ID is required"),
  status: z.enum(["Completed", "Cancelled", "Pending"], { 
    message: "Status must be either Completed, Cancelled, or Pending" 
  }),
});

export const updatePaymentSchema = z.object({
  id: z.number().min(1, "Order ID is required"),
  payment: z.enum(["Paid", "Unpaid", "Pending"], { 
    message: "Payment must be either Paid, Unpaid, or Pending" 
  }),
});

export const cashoutSchema = z.object({
  Amount: z.coerce.number().min(50, "Please Enter valid amount"),
  Reason: z.array(z.string().min(2, "Enter a valid reason/reasons")).optional().or(z.literal("")),
  HotelName: z.string().min(1, "Hotel name is required")
})

export const batchOrderItemSchema = z.object({
  itemId: z.number().optional(),
  itemName: z.string().min(1, "Item name is required"),
  imageUrl: z.string().min(2, "Valid image URL is required"),
  price: z.number().min(0, "Price must be positive"),
  category: z.string().min(1, "Category is required"),
  type: z.string().min(1, "Type is required"),
  orderAmount: z.number().min(1, "Order amount must be at least 1"),
  tableNo: z.number().min(1, "Table number is required").optional(),
  waiterName: z.string().min(1, "Waiter name is required").optional(),
});

export const batchOrderSchema = z.object({
  items: z.array(batchOrderItemSchema).min(1, "At least one item is required"),
  HotelName: z.string().min(1, "Hotel name is required"),
  assignmentType: z.enum(["single", "multiple"]),
  singleWaiterName: z.string().optional(),
  singleTableNo: z.number().optional(),
});

export const updateWaiterPaymentSchema = z.object({
  id: z.number().min(1, "Waiter ID is required"),
  payment: z.array(z.string()).min(1, "Payment array is required"),
  price: z.array(z.number()).min(1, "Price array is required"),
  tablesServed: z.array(z.number()).min(1, "Tables served array is required"),
  HotelName: z.string().min(1, "Hotel name is required"),
});

export const updateTablePaymentSchema = z.object({
  id: z.number().min(1, "Table ID is required"),
  payment: z.array(z.string()).min(1, "Payment array is required"),
  price: z.array(z.number()).min(1, "Price array is required"),
  HotelName: z.string().min(1, "Hotel name is required"),
});

// ==================== REPORT MANAGEMENT ====================

export const reportFilterSchema = z.object({
  HotelName: z.string().min(1, "Hotel name is required"),
  date: z.date({ message: "Valid date is required" }),
  type: z.enum(["Daily", "Monthly"], { message: "Report type must be Daily or Monthly" }),
});

// ==================== FORM VALIDATIONS ====================

export const orderDetailsSchema = z.object({
  tableNo: z.number().min(1, "Please select a table"),
  waiterName: z.string().min(1, "Please select a waiter"),
  orderAmount: z.number().min(1, "Order amount must be at least 1"),
});

export const searchSchema = z.object({
  query: z.string().max(100, "Search query is too long").optional(),
  category: z.enum(["All", "Food", "Beverage", "Others"]).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().max(10000).optional(),
  sortBy: z.enum(["name", "price", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const dateRangeSchema = z.object({
  startDate: z.date({ message: "Start date is required" }),
  endDate: z.date({ message: "End date is required" }),
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

// ==================== IMAGE UPLOAD ====================

export const imageUploadSchema = z.object({
  image: z.instanceof(File, { message: "Image file is required" })
    .refine((file) => file.size <= 5 * 1024 * 1024, "File size must be less than 5MB")
    .refine((file) => 
      ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type),
      "Only .jpg, .jpeg, .png and .webp files are allowed"
    ),
});

// ==================== COMPOSED FORM SCHEMAS ====================

export const itemCreationFormSchema = z.object({
  basicInfo: z.object({
    name: z.string().min(1, "Item name is required"),
    price: z.number().min(0, "Price must be positive"),
  }),
  categoryInfo: z.object({
    category: z.enum(["Food", "Beverage", "Others"]),
    HotelName: z.string().min(1, "Hotel name is required"),
  }),
  imageInfo: z.object({
    imageUrl: z.string().url("Valid image URL is required").optional(),
  }),
});

export const credentialFormSchema = z.object({
  userInfo: z.object({
    UserName: z.string().min(2, "Username must be at least 2 characters long"),
    Role: z.enum(["Kitchen", "Barista", "Cashier"]),
  }),
  passwordInfo: z.object({
    Password: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
  }),
  hotelInfo: z.object({
    HotelName: z.string().min(1, "Hotel name is required"),
    LogoUrl: z.string().url("Valid logo URL is required").optional(),
  }),
}).refine((data) => data.passwordInfo.Password === data.passwordInfo.confirmPassword, {
  message: "Passwords don't match",
  path: ["passwordInfo", "confirmPassword"],
});

// ==================== EXCEL EXPORT ====================

export const excelExportSchema = z.object({
  sheetName: z.string().min(1, "Sheet name is required"),
  data: z.array(z.any()).min(1, "Data is required for export"),
  headers: z.array(z.string()).min(1, "Headers are required"),
});

// ==================== BATCH OPERATIONS ====================

export const batchUpdateSchema = z.object({
  ids: z.array(z.number()).min(1, "At least one ID is required"),
  status: z.enum(["Completed", "Cancelled", "Pending"]).optional(),
  payment: z.enum(["Paid", "Unpaid", "Pending"]).optional(),
}).refine((data) => data.status || data.payment, {
  message: "Either status or payment must be provided",
});

// ==================== BACKUP & RESTORE ====================

export const backupSchema = z.object({
  timestamp: z.string(),
  items: z.array(z.any()),
  orders: z.array(z.any()),
  waiters: z.array(z.any()),
  tables: z.array(z.any()),
  credentials: z.array(z.any()),
});

// ==================== REAL-TIME ====================

export const subscriptionSchema = z.object({
  hotel: z.string().min(1, "Hotel name is required"),
  token: z.string().min(1, "Token is required"),
});

// ==================== STATISTICS ====================

export const statisticsFilterSchema = z.object({
  startDate: z.date({ message: "Start date is required" }),
  endDate: z.date({ message: "End date is required" }),
  HotelName: z.string().min(1, "Hotel name is required"),
  category: z.enum(["All", "Food", "Beverage", "Others"]).optional(),
});

// ==================== UTILITY ====================

export const hotelNameSchema = z.object({
  HotelName: z.string().min(1, "Hotel name is required"),
});

export const idSchema = z.object({
  id: z.number().min(1, "ID is required"),
});

export const paginationSchema = z.object({
  page: z.number().min(1, "Page must be at least 1"),
  limit: z.number().min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100"),
});

// ==================== NOTIFICATION ====================

export const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  lowStockAlert: z.boolean(),
  dailyReport: z.boolean(),
  reportTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
});

// ==================== SETTINGS ====================

export const hotelSettingsSchema = z.object({
  HotelName: z.string().min(1, "Hotel name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional(),
  currency: z.string().default("ETB"),
  taxRate: z.number().min(0).max(100).default(15),
  serviceCharge: z.number().min(0).max(100).default(10),
});

// ==================== INVENTORY ====================

export const inventorySchema = z.object({
  itemId: z.number().min(1, "Item ID is required"),
  quantity: z.number().min(0, "Quantity cannot be negative"),
  reorderLevel: z.number().min(0, "Reorder level cannot be negative"),
  location: z.string().optional(),
});

// ==================== USER PROFILE ====================

export const userProfileSchema = z.object({
  UserName: z.string().min(2, "Username must be at least 2 characters"),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "New password must be at least 6 characters").optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: "Current password is required to set new password",
  path: ["currentPassword"],
}).refine((data) => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// ==================== FEEDBACK ====================

export const feedbackSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().max(500, "Comment is too long"),
  orderId: z.number().optional(),
  waiterName: z.string().optional(),
});


export const discountSchema = z.object({
  code: z.string().min(3, "Discount code must be at least 3 characters"),
  percentage: z.number().min(1).max(100),
  validFrom: z.date(),
  validUntil: z.date(),
  maxUses: z.number().min(1).optional(),
  minOrderAmount: z.number().min(0).optional(),
}).refine((data) => data.validUntil > data.validFrom, {
  message: "Valid until must be after valid from",
  path: ["validUntil"],
});


export const reservationSchema = z.object({
  customerName: z.string().min(2, "Customer name is required"),
  phone: z.string().min(10, "Phone number is required"),
  email: z.string().email("Invalid email").optional(),
  tableNo: z.number().min(1, "Table number is required"),
  guests: z.number().min(1, "Number of guests is required"),
  reservationTime: z.date(),
  specialRequests: z.string().max(200).optional(),
});