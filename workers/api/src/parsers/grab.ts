/**
 * Grab receipt email parser.
 * Handles GrabFood, GrabCar, GrabBike, and other Grab services.
 */

import type { EmailInput, ParsedTransaction } from '@duitku/shared';
import type { CategoryHint } from '@duitku/shared';
import type { EmailParser } from './_template';
import { parseRupiahAmount, truncateSnippet, extractDate } from './_template';

/** Map Grab service keywords to category hints */
function detectCategory(text: string): { category: CategoryHint; service: string } {
  const lower = text.toLowerCase();

  if (lower.includes('grabfood') || lower.includes('grab food')) {
    return { category: 'food', service: 'GrabFood' };
  }
  if (lower.includes('grabcar') || lower.includes('grab car')) {
    return { category: 'transport', service: 'GrabCar' };
  }
  if (lower.includes('grabbike') || lower.includes('grab bike')) {
    return { category: 'transport', service: 'GrabBike' };
  }
  if (lower.includes('grabexpress') || lower.includes('grab express')) {
    return { category: 'shopping', service: 'GrabExpress' };
  }
  if (lower.includes('grabmart') || lower.includes('grab mart')) {
    return { category: 'shopping', service: 'GrabMart' };
  }

  return { category: 'other', service: 'Grab' };
}

/** Amount extraction patterns, ordered by specificity */
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

export const grabParser: EmailParser = {
  platform: 'grab',
  displayName: 'Grab',
  senderPatterns: [
    /no-?reply@grab\.com/i,
    /grab.*receipt/i,
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
      platform: 'grab',
      originalSnippet: truncateSnippet(body),
    };
  },
};
