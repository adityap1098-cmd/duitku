/**
 * Email parser template — copy this to create a new platform parser.
 *
 * Architecture:
 * - Each parser file implements the EmailParser interface.
 * - Parsers are registered in ./index.ts.
 * - The registry matches incoming emails to parsers by sender pattern.
 *
 * Rules:
 * - Return null on parse failure (defensive parsing).
 * - Amount must be integer Rupiah (never float/decimal).
 * - originalSnippet must be max 200 characters.
 * - All types come from @duitku/shared.
 */

import type { EmailInput, ParsedTransaction } from '@duitku/shared';
import type { CategoryHint } from '@duitku/shared';

// ─── EmailParser Interface ───────────────────────────────────────────
export interface EmailParser {
  /** Internal identifier, e.g. 'grab', 'gojek', 'shopee' */
  platform: string;
  /** Human-readable name, e.g. 'Grab', 'Gojek', 'Shopee' */
  displayName: string;
  /** RegExp patterns to match against the sender email address */
  senderPatterns: RegExp[];
  /** Parse an email into a transaction, or return null if unrecognized */
  parse(email: EmailInput): ParsedTransaction | null;
}

// ─── Shared Helpers ──────────────────────────────────────────────────

/**
 * Parse a Rupiah amount string to integer.
 * Handles: "Rp150.000", "Rp 1.250.000", "Rp50000", "150.000", "50000"
 * Returns null if no valid number can be extracted.
 */
export function parseRupiahAmount(text: string): number | null {
  // Match Rp prefix (optional), optional space, then digits with dot/comma separators
  // Handles: Rp 178.404, Rp 178,404, Rp150.000, Rp 1.250.000, Rp1.000.000,00
  const match = text.match(/Rp\.?\s*([\d.,]+)/i);
  if (match) {
    let raw = match[1];

    // Handle decimal: if ends with ,XX or .XX (1-2 digits after separator at end),
    // treat that last separator as decimal point and drop the fractional part
    raw = raw.replace(/[.,]\d{1,2}$/, '');

    // Now strip remaining dots and commas (thousand separators)
    raw = raw.replace(/[.,]/g, '');

    const num = parseInt(raw, 10);
    return isNaN(num) || num <= 0 ? null : num;
  }

  // Fallback: try bare number with dots/commas (e.g. "150.000" or "150,000")
  const bareMatch = text.match(/([\d.,]{3,})/);
  if (bareMatch) {
    let raw = bareMatch[1];
    raw = raw.replace(/[.,]\d{1,2}$/, '');
    raw = raw.replace(/[.,]/g, '');
    const num = parseInt(raw, 10);
    return isNaN(num) || num <= 0 ? null : num;
  }

  return null;
}

/**
 * Truncate text to max length, appending '...' if truncated.
 */
export function truncateSnippet(text: string, maxLength = 200): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Extract ISO 8601 date (YYYY-MM-DD) from an email date string.
 * Returns the input if already in YYYY-MM-DD format, otherwise tries to parse.
 */
export function extractDate(dateStr: string): string {
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  // Try parsing as Date
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);

  return d.toISOString().slice(0, 10);
}

/**
 * Smart category detection from transaction text (subject + body + merchant name).
 * Matches against known Indonesian merchants, services, and keywords.
 * Used by bank parsers (Jago, SeaBank, Mandiri, BCA, BNI) for auto-categorization.
 */
export function detectCategoryFromText(text: string): CategoryHint {
  const lower = text.toLowerCase();

  // Food & beverage — check first (common in daily transactions)
  if (/mcdonald|kfc|burger king|pizza hut|starbucks|chatime|gofood|grabfood|fore coffee|janji jiwa|kenangan|hokben|yoshinoya|solaria|warung|restoran|restaurant|cafe|kedai|kopi|bakso|mie ayam|nasi|sate|martabak|ayam geprek|richeese|mixue|subway|domino|wendy|a&w|breadtalk|jco|dunkin|hokkaido/i.test(lower)) return 'food';

  // Transport
  if (/grab(?!food|mart)|gojek|goride|gocar|taxi|parkir|parking|tol\b|toll|transjakarta|mrt|lrt|kereta|train|bus|angkot|ojek/i.test(lower)) return 'transport';

  // Shopping / e-commerce
  if (/shopee|tokopedia|lazada|blibli|bukalapak|toko online|minimarket|indomaret|alfamart|alfamidi|supermarket|hypermart|giant|carrefour|lotte/i.test(lower)) return 'shopping';

  // Bills / utilities
  if (/biznet|indihome|telkom|firstmedia|pln|listrik|pdam|gas\b|internet|wifi|tv kabel|tagihan|portal neo|bpjs|asuransi|pajak|iuran/i.test(lower)) return 'bills';

  // Top up / e-wallet
  if (/top\s*up|topup|gopay|ovo\b|dana\b|shopeepay|linkaja|e-?wallet|pulsa|paket data/i.test(lower)) return 'topup';

  // Subscription
  if (/netflix|spotify|youtube premium|disney|hbo|apple music|google play|icloud|canva|zoom|microsoft 365|adobe|chatgpt|openai|vidio|viu/i.test(lower)) return 'subscription';

  // Entertainment
  if (/bioskop|cinema|cgv|xxi|tix id|tiket\.com|event|konser|concert|game|steam/i.test(lower)) return 'entertainment';

  // Health
  if (/apotek|pharmacy|kimia farma|k24|klinik|clinic|rumah sakit|hospital|dokter|doctor|halodoc|alodokter/i.test(lower)) return 'health';

  // Education
  if (/sekolah|school|kuliah|universitas|university|kursus|course|udemy|coursera|ruangguru|zenius|bimbel/i.test(lower)) return 'education';

  // Transfer — check last (most generic)
  if (/transfer|kirim|kiriman|pemindahan dana/i.test(lower)) return 'transfer';

  return 'other';
}
