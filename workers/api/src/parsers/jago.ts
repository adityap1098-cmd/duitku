/**
 * Bank Jago payment notification email parser.
 * Handles payment confirmations and transfer notifications from Bank Jago.
 */

import type { EmailInput, ParsedTransaction } from '@duitku/shared';
import type { EmailParser } from './_template';
import { parseRupiahAmount, truncateSnippet, extractDate } from './_template';

/** Amount extraction patterns for Jago — most specific first */
const AMOUNT_PATTERNS: RegExp[] = [
  /(?:sebesar|sejumlah|nominal|amount)\s*(?:Rp\.?\s*[\d.]+)/i,
  /(?:total|pembayaran|transfer)\s*[:\s]*(?:Rp\.?\s*[\d.]+)/i,
  /Rp\.?\s*[\d.]+/i,
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
  const incomeKeywords = /(?:kredit|credit|masuk|penerimaan|terima|received|incoming)/i;
  if (incomeKeywords.test(text)) return 'income';
  return 'expense';
}

/** Detect category from keywords */
function detectCategory(text: string): string {
  if (/transfer|kirim|send/i.test(text)) return 'transfer';
  if (/tagihan|billing|listrik|pln|pdam|bpjs/i.test(text)) return 'bills';
  if (/top\s*up|topup|pulsa|data/i.test(text)) return 'topup';
  if (/belanja|shop|beli|purchase/i.test(text)) return 'shopping';
  return 'other';
}

export const jagoParser: EmailParser = {
  platform: 'jago',
  displayName: 'Bank Jago',
  senderPatterns: [
    /no-?reply@jago\.com/i,
    /.*@mail\.jago\.com/i,
    /.*@info\.jago\.com/i,
  ],

  parse(email: EmailInput): ParsedTransaction | null {
    const { body, subject, date } = email;
    const fullText = `${subject} ${body}`;

    const amount = extractAmount(fullText);
    if (amount === null) return null;

    const type = detectType(fullText);
    const category = type === 'income' ? 'transfer' : detectCategory(fullText);

    const description = `Jago: ${subject.slice(0, 80)}`;

    return {
      amount,
      type,
      category: category as any,
      description,
      date: extractDate(date),
      platform: 'jago',
      originalSnippet: truncateSnippet(`${subject}\n${body}`),
    };
  },
};
