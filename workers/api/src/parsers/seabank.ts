/**
 * SeaBank payment notification email parser.
 * Handles payment confirmations and transfer notifications from SeaBank.
 */

import type { EmailInput, ParsedTransaction } from '@duitku/shared';
import type { EmailParser } from './_template';
import { parseRupiahAmount, truncateSnippet, extractDate } from './_template';

/** Amount extraction patterns for SeaBank — most specific first */
const AMOUNT_PATTERNS: RegExp[] = [
  /(?:sebesar|sejumlah|nominal|amount)\s*(?:Rp\.?\s*[\d.,]+)/i,
  /(?:total|pembayaran|transfer)\s*[:\s]*(?:Rp\.?\s*[\d.,]+)/i,
  /Rp\.?\s*[\d.,]+/i,
];

function extractAmount(body: string): number | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = body.match(pattern);
    if (match) {
      const amount = parseRupiahAmount(match[0]);
      if (amount !== null && amount > 0) return amount;
    }
  }
  return null;
}

/** Detect transaction type from keywords */
function detectType(text: string): 'income' | 'expense' {
  // Expense keywords — check first (more specific)
  const expenseKeywords = /(?:membayar|bayar|pembayaran|belanja|beli|purchase|debet|debit|keluar|pengeluaran|transfer keluar|melakukan transfer)/i;
  if (expenseKeywords.test(text)) return 'expense';

  // Income keywords
  const incomeKeywords = /(?:menerima|terima|received|incoming|masuk|penerimaan|kredit|credit|gajian|salary)/i;
  if (incomeKeywords.test(text)) return 'income';

  return 'expense'; // default to expense
}

/** Detect category from keywords */
function detectCategory(text: string): string {
  if (/transfer|kirim|send/i.test(text)) return 'transfer';
  if (/tagihan|billing|listrik|pln|pdam|bpjs/i.test(text)) return 'bills';
  if (/top\s*up|topup|pulsa|data/i.test(text)) return 'topup';
  if (/belanja|shop|beli|purchase/i.test(text)) return 'shopping';
  return 'other';
}

export const seabankParser: EmailParser = {
  platform: 'seabank',
  displayName: 'SeaBank',
  senderPatterns: [
    /alerts?@seabank\.co\.id/i,
    /no-?reply@seabank\.co\.id/i,
    /.*@mail\.seabank\.co\.id/i,
  ],

  parse(email: EmailInput): ParsedTransaction | null {
    const { body, subject, date } = email;
    const fullText = `${subject} ${body}`;

    const amount = extractAmount(fullText);
    if (amount === null) return null;

    const type = detectType(fullText);
    const category = type === 'income' ? 'transfer' : detectCategory(fullText);

    // Build description from subject
    const description = `SeaBank: ${subject.slice(0, 80)}`;

    return {
      amount,
      type,
      category: category as any,
      description,
      date: extractDate(date),
      platform: 'seabank',
      originalSnippet: truncateSnippet(`${subject}\n${body}`),
    };
  },
};
