/** Apex Solution CBE account — all setup & quarterly transfers (including Telebirr → CBE). */
export const APEX_SOLUTION_CBE_ACCOUNT = "1000418779358";

export const SIGNUP_PAYMENT_CHANNELS = [
  "Telebirr",
  "Commercial Bank of Ethiopia",
] as const;

export type SignupPaymentChannel = (typeof SIGNUP_PAYMENT_CHANNELS)[number];

export const SIGNUP_PAYMENT_CHANNEL_META: Record<
  SignupPaymentChannel,
  {
    shortLabel: string;
    transactionFieldLabel: string;
    transactionPlaceholder: string;
    hint: string;
  }
> = {
  Telebirr: {
    shortLabel: "Telebirr",
    transactionFieldLabel: "Telebirr transaction number",
    transactionPlaceholder: "e.g. CGK8X2… from your Telebirr receipt",
    hint: `Transfer via Telebirr to Apex Solution CBE account ${APEX_SOLUTION_CBE_ACCOUNT}, then enter the Telebirr transaction number from your receipt.`,
  },
  "Commercial Bank of Ethiopia": {
    shortLabel: "Commercial Bank of Ethiopia (CBE)",
    transactionFieldLabel: "CBE transaction ID",
    transactionPlaceholder: "e.g. FT25234… from your bank slip or app",
    hint: `Deposit to Apex Solution CBE account ${APEX_SOLUTION_CBE_ACCOUNT}, then enter the CBE transaction ID from your confirmation.`,
  },
};

export function signupPaymentRequired(setupFeeETB: number): boolean {
  return setupFeeETB > 0;
}

/** Typical Apex review window after signup payment submission. */
export const SETUP_APPROVAL_WAIT_MINUTES = 30;

export const APEX_WHATSAPP_SUPPORT = [
  { e164: "+251935000642", waMe: "251935000642" },
  { e164: "+251930272975", waMe: "251930272975" },
] as const;

export const SETUP_PENDING_LOGIN_MESSAGE =
  "Your registration is pending Apex approval. Login is disabled until your setup fee is verified (usually within about 30 minutes). For help, contact Apex on WhatsApp: +251935000642 or +251930272975.";

export function formatApexWhatsAppSupportList(): string {
  return APEX_WHATSAPP_SUPPORT.map((line) => line.e164).join(" or ");
}
