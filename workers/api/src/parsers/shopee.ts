/**
 * Shopee order confirmation email parser.
 * Handles Shopee purchase receipts and order confirmations.
 */

import type { EmailInput, ParsedTransaction } from '@duitku/shared';
import type { EmailParser } from './_template';
import { parseRupiahAmount, truncateSnippet, extractDate } from './_template';

/** Extract order reference from email body or subject */
function extractOrderRef(text: string): string | null {
  // Shopee order number patterns — require a separator (: # no.) between keyword and value
  const patterns = [
    /(?:nomor\s*pesanan|order\s*(?:id|no\.?|#))\s*[:\s]+([A-Z0-9]{6,})/i,
    /(?:pesanan)\s*[:#]\s*([A-Z0-9]{6,})/i,
    /(?:#)(\d{10,})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/** Amount extraction patterns for Shopee */
const AMOUNT_PATTERNS: RegExp[] = [
  /total\s*(?:pembayaran|payment|pesanan|order|belanja)\s*[:\s]*(?:Rp\.?\s*[\d.]+)/i,
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

export const shopeeParser: EmailParser = {
  platform: 'shopee',
  displayName: 'Shopee',
  senderPatterns: [
    /no-?reply@shopee\.co\.id/i,
    /.*@mail\.shopee\.co\.id/i,
  ],

  parse(email: EmailInput): ParsedTransaction | null {
    const { body, subject, date } = email;
    const fullText = `${subject} ${body}`;

    // Extract amount — required
    const amount = extractAmount(fullText);
    if (amount === null) return null;

    // Always shopping category for Shopee
    const category = 'shopping' as const;

    // Build description with order reference if available
    const orderRef = extractOrderRef(fullText);
    const description = orderRef
      ? `Shopee order #${orderRef}`
      : 'Shopee purchase';

    return {
      amount,
      type: 'expense',
      category,
      description,
      date: extractDate(date),
      platform: 'shopee',
      originalSnippet: truncateSnippet(body),
    };
  },
};
