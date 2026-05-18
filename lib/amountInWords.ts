/** Convert a whole ETB amount to English words for receipts (e.g. 1000 → "one thousand"). */

const BELOW_TWENTY = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

function chunkToWords(n: number): string {
  if (n === 0) return "";
  if (n < 20) return BELOW_TWENTY[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const r = n % 10;
    return r ? `${TENS[t]}-${BELOW_TWENTY[r]}` : TENS[t];
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    const head = `${BELOW_TWENTY[h]} hundred`;
    return r ? `${head} ${chunkToWords(r)}` : head;
  }
  return String(n);
}

export function amountToWordsETB(amount: number): string {
  const n = Math.round(Math.abs(Number(amount) || 0));
  if (n === 0) return "zero ETB";
  const parts: string[] = [];
  let rest = n;
  const billions = Math.floor(rest / 1_000_000_000);
  rest %= 1_000_000_000;
  const millions = Math.floor(rest / 1_000_000);
  rest %= 1_000_000;
  const thousands = Math.floor(rest / 1000);
  rest %= 1000;
  if (billions) parts.push(`${chunkToWords(billions)} billion`);
  if (millions) parts.push(`${chunkToWords(millions)} million`);
  if (thousands) parts.push(`${chunkToWords(thousands)} thousand`);
  if (rest) parts.push(chunkToWords(rest));
  const words = parts.join(" ").replace(/\s+/g, " ").trim();
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} ETB`;
}
