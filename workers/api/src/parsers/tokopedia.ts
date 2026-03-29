/**
 * Tokopedia order confirmation email parser.
 * Handles purchase receipts and payment confirmations from Tokopedia.
 */

import type { EmailInput, ParsedTransaction } from '@duitku/shared';
import type { EmailParser } from './_template';
import { parseRupiahAmount, truncateSnippet, extractDate } from './_template';

/** Extract order reference from email body or subject */
function extractOrderRef(text: string): string | null {
  const patterns = [
    /(?:INV|invoice)[/\-]?\s*([A-Z0-9/\-]{6,})/i,
    /(?:nomor\s*pesanan|order)\s*[:#\s]+([A-Z0-9/\-]{6,})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/** Amount extraction patterns for Tokopedia — most specific first */
const AMOUNT_PATTERNS: RegExp[] = [
  /total\s*(?:pembayaran|tagihan|belanja)\s*[:\s]*(?:Rp\.?\s*[\d.]+)/i,
  /total\s*[:\s]*(?:Rp\.?\s*[\d.]+)/i,
  /(?:Rp\.?\s*[\d.]+)/i,
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

export const tokopediaParser: EmailParser = {
  platform: 'tokopedia',
  displayName: 'Tokopedia',
  senderPatterns: [
    /no-?reply@tokopedia\.com/i,
    /.*@promo\.tokopedia\.com/i,
    /.*@info\.tokopedia\.com/i,
    /.*@mail\.tokopedia\.com/i,
  ],

  parse(email: EmailInput): ParsedTransaction | null {
    const { body, subject, date } = email;
    const fullText = `${subject} ${body}`;

    // Extract amount — required
    const amount = extractAmount(fullText);
    if (amount === null) return null;

    // Always shopping category for Tokopedia
    const category = 'shopping' as const;

    // Build description
    const orderRef = extractOrderRef(fullText);
    const description = orderRef
      ? `Tokopedia: Pesanan ${orderRef}`
      : 'Tokopedia: Pembelian';

    return {
      amount,
      type: 'expense',
      category,
      description,
      date: extractDate(date),
      platform: 'tokopedia',
      originalSnippet: truncateSnippet(`${subject}\n${body}`),
    };
  },
};
