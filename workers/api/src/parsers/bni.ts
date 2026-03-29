/**
 * BNI (Bank Negara Indonesia) email notification parser.
 * Handles debit (expense) and credit (income) transaction notifications.
 */

import type { EmailInput, ParsedTransaction } from '@duitku/shared';
import type { CategoryHint } from '@duitku/shared';
import type { EmailParser } from './_template';
import { parseRupiahAmount, truncateSnippet, extractDate, detectCategoryFromText } from './_template';

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
  return 'expense';
}

/** Detect transaction category from keywords */
/** Amount extraction patterns for BNI */
const AMOUNT_PATTERNS: RegExp[] = [
  /(?:sebesar|sejumlah|nominal|amount)\s*[:\s]*(?:Rp\.?\s*[\d.,]+)/i,
  /(?:Rp\.?\s*[\d.,]+)/i,
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

export const bniParser: EmailParser = {
  platform: 'bni',
  displayName: 'BNI',
  senderPatterns: [
    /@bni\.co\.id/i,
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
    const category = detectCategoryFromText(fullText);

    // Build description
    const direction = type === 'income' ? 'Credit' : 'Debit';
    const description = `BNI ${direction} notification`;

    return {
      amount,
      type,
      category,
      description,
      date: extractDate(date),
      platform: 'bni',
      originalSnippet: truncateSnippet(body),
    };
  },
};
