/**
 * SeaBank payment notification email parser.
 * Handles payment confirmations and transfer notifications from SeaBank.
 */

import type { EmailInput, ParsedTransaction } from '@duitku/shared';
import type { EmailParser } from './_template';
import { parseRupiahAmount, truncateSnippet, extractDate, detectCategoryFromText } from './_template';

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
  const expenseKeywords = /(?:membayar|bayar|pembayaran|belanja|beli|purchase|debet|debit|keluar|pengeluaran|transfer keluar|melakukan transfer|melakukan transaksi)/i;
  if (expenseKeywords.test(text)) return 'expense';

  // Income keywords
  const incomeKeywords = /(?:menerima|terima|received|incoming|masuk|penerimaan|kredit|credit|gajian|salary)/i;
  if (incomeKeywords.test(text)) return 'income';

  return 'expense'; // default to expense
}

/** Detect category from merchant name or keywords */
export const seabankParser: EmailParser = {
  platform: 'seabank',
  displayName: 'SeaBank',
  senderPatterns: [
    /alerts?@seabank\.co\.id/i,
    /no-?reply@seabank\.co\.id/i,
    /info@seabank\.co\.id/i,
    /.*@mail\.seabank\.co\.id/i,
  ],

  parse(email: EmailInput): ParsedTransaction | null {
    const { body, subject, date } = email;
    const fullText = `${subject} ${body}`;

    // Skip non-transaction emails (promos, activation, info)
    const skipPatterns = [
      /promo|diskon|cashback/i,
      /aktivasi|aktivin/i,
      /ramadan|lebaran|spesial/i,
      /pinjam|limit/i,
    ];
    if (skipPatterns.some((p) => p.test(subject))) return null;

    const amount = extractAmount(fullText);
    if (amount === null) return null;

    const type = detectType(fullText);
    const category = type === 'income' ? 'transfer' : detectCategoryFromText(fullText);

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
