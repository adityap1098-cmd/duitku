/**
 * Gojek receipt email parser.
 * Handles GoFood, GoRide, GoCar, GoMart, GoShop, and other Gojek services.
 */

import type { EmailInput, ParsedTransaction } from '@duitku/shared';
import type { CategoryHint } from '@duitku/shared';
import type { EmailParser } from './_template';
import { parseRupiahAmount, truncateSnippet, extractDate } from './_template';

/** Map Gojek service keywords to category hints */
function detectCategory(text: string): { category: CategoryHint; service: string } {
  const lower = text.toLowerCase();

  if (lower.includes('gofood') || lower.includes('go-food') || lower.includes('go food')) {
    return { category: 'food', service: 'GoFood' };
  }
  if (lower.includes('goride') || lower.includes('go-ride') || lower.includes('go ride')) {
    return { category: 'transport', service: 'GoRide' };
  }
  if (lower.includes('gocar') || lower.includes('go-car') || lower.includes('go car')) {
    return { category: 'transport', service: 'GoCar' };
  }
  if (lower.includes('gomart') || lower.includes('go-mart') || lower.includes('go mart')) {
    return { category: 'shopping', service: 'GoMart' };
  }
  if (lower.includes('goshop') || lower.includes('go-shop') || lower.includes('go shop')) {
    return { category: 'shopping', service: 'GoShop' };
  }
  if (lower.includes('gopay')) {
    return { category: 'topup', service: 'GoPay' };
  }

  return { category: 'other', service: 'Gojek' };
}

/** Amount extraction patterns for Gojek */
const AMOUNT_PATTERNS: RegExp[] = [
  /total\s*(?:pembayaran|payment|biaya|tagihan)\s*[:\s]*(?:Rp\.?\s*[\d.]+)/i,
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

export const gojekParser: EmailParser = {
  platform: 'gojek',
  displayName: 'Gojek',
  senderPatterns: [
    /no-?reply@gojek\.com/i,
    /.*@go-jek\.com/i,
  ],

  parse(email: EmailInput): ParsedTransaction | null {
    const { body, subject, date } = email;
    const fullText = `${subject} ${body}`;

    // Extract amount — required
    const amount = extractAmount(fullText);
    if (amount === null) return null;

    // Detect service type and category
    const { category, service } = detectCategory(fullText);

    // Build description
    const description = `${service} transaction`;

    return {
      amount,
      type: 'expense',
      category,
      description,
      date: extractDate(date),
      platform: 'gojek',
      originalSnippet: truncateSnippet(body),
    };
  },
};
