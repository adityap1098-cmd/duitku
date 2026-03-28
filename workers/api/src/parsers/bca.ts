/**
 * BCA (Bank Central Asia) email notification parser.
 * Handles debit (expense) and credit (income) transaction notifications.
 */

import type { EmailInput, ParsedTransaction } from '@duitku/shared';
import type { CategoryHint } from '@duitku/shared';
import type { EmailParser } from './_template';
import { parseRupiahAmount, truncateSnippet, extractDate } from './_template';

/** Detect whether the transaction is a debit (expense) or credit (income) */
function detectTransactionType(text: string): 'income' | 'expense' {
  const lower = text.toLowerCase();

  // Credit keywords → income
  if (
    lower.includes('kredit') ||
    lower.includes('credit') ||
    lower.includes('masuk') ||
    lower.includes('penerimaan') ||
    lower.includes('terima') ||
    lower.includes('diterima')
  ) {
    return 'income';
  }

  // Debit keywords → expense (also the default)
  // 'debet', 'debit', 'keluar', 'pengeluaran' all map to expense
  return 'expense';
}

/** Detect transaction category from keywords */
function detectCategory(text: string): CategoryHint {
  const lower = text.toLowerCase();

  // Transfer
  if (lower.includes('transfer') || lower.includes('kirim') || lower.includes('kiriman')) {
    return 'transfer';
  }

  // Bills
  if (
    lower.includes('tagihan') ||
    lower.includes('pembayaran') ||
    lower.includes('listrik') ||
    lower.includes('air') ||
    lower.includes('telepon') ||
    lower.includes('pln') ||
    lower.includes('pdam')
  ) {
    return 'bills';
  }

  return 'other';
}

/** Amount extraction patterns for BCA, ordered by specificity */
const AMOUNT_PATTERNS: RegExp[] = [
  /(?:sebesar|sejumlah|nominal|amount)\s*[:\s]*(?:Rp\.?\s*[\d.]+)/i,
  /(?:Rp\.?\s*[\d.]+)/i,
];

function extractAmount(text: string): number | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseRupiahAmount(match[0]);
      if (amount !== null && amount > 0) return amount;
    }
  }
  return null;
}

export const bcaParser: EmailParser = {
  platform: 'bca',
  displayName: 'BCA',
  senderPatterns: [
    /@klikbca\.com/i,
    /@bca\.co\.id/i,
  ],

  parse(email: EmailInput): ParsedTransaction | null {
    const { body, subject, date } = email;
    const fullText = `${subject} ${body}`;

    // Extract amount — required
    const amount = extractAmount(fullText);
    if (amount === null) return null;

    // Detect transaction direction
    const type = detectTransactionType(fullText);

    // Detect category
    const category = detectCategory(fullText);

    // Build description
    const direction = type === 'income' ? 'Credit' : 'Debit';
    const description = `BCA ${direction} notification`;

    return {
      amount,
      type,
      category,
      description,
      date: extractDate(date),
      platform: 'bca',
      originalSnippet: truncateSnippet(body),
    };
  },
};
