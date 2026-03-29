/**
 * Mandiri (Bank Mandiri) email notification parser.
 * Handles debit (expense) and credit (income) transaction notifications.
 */

import type { EmailInput, ParsedTransaction } from '@duitku/shared';
import type { CategoryHint } from '@duitku/shared';
import type { EmailParser } from './_template';
import { parseRupiahAmount, truncateSnippet, extractDate, detectCategoryFromText } from './_template';

/** Detect whether the transaction is a debit (expense) or credit (income) */
function detectTransactionType(subject: string, body: string): 'income' | 'expense' {
  // Check subject first — most reliable signal
  const subjectLower = subject.toLowerCase();

  // Debit keywords → expense
  if (
    subjectLower.includes('debet') ||
    subjectLower.includes('debit') ||
    subjectLower.includes('keluar') ||
    subjectLower.includes('pengeluaran') ||
    subjectLower.includes('pembelian') ||
    subjectLower.includes('pembayaran') ||
    subjectLower.includes('pemindahan dana')
  ) {
    return 'expense';
  }

  // Credit keywords in subject → income
  if (
    subjectLower.includes('kredit') ||
    subjectLower.includes('masuk') ||
    subjectLower.includes('penerimaan') ||
    subjectLower.includes('terima')
  ) {
    return 'income';
  }

  // Fallback: check body (but skip CSS/style noise)
  const bodyLower = body.toLowerCase();

  // Look for "Tipe Transaksi" pattern common in Livin' by Mandiri
  const tipeMatch = bodyLower.match(/tipe\s*transaksi\s*[:\s]*(\S+)/);
  if (tipeMatch) {
    const tipe = tipeMatch[1];
    if (tipe.includes('debet') || tipe.includes('debit')) return 'expense';
    if (tipe.includes('kredit') || tipe.includes('credit')) return 'income';
  }

  // Check body keywords
  if (
    bodyLower.includes('debet') ||
    bodyLower.includes('debit') ||
    bodyLower.includes('keluar') ||
    bodyLower.includes('pengeluaran')
  ) {
    return 'expense';
  }

  if (
    bodyLower.includes('kredit') ||
    bodyLower.includes('masuk') ||
    bodyLower.includes('penerimaan')
  ) {
    return 'income';
  }

  // Default to expense — safer assumption for a finance tracker
  return 'expense';
}

/** Detect transaction category from keywords */
/** Amount extraction patterns for Mandiri */
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

export const mandiriParser: EmailParser = {
  platform: 'mandiri',
  displayName: 'Mandiri',
  senderPatterns: [
    /@bankmandiri\.co\.id/i,
    /@mandiri\.co\.id/i,
  ],

  parse(email: EmailInput): ParsedTransaction | null {
    const { body, subject, date } = email;
    const fullText = `${subject} ${body}`;

    // Extract amount — required
    const amount = extractAmount(fullText);
    if (amount === null) return null;

    // Detect transaction direction — pass subject and body separately
    // so subject (reliable) is checked before body (may have HTML noise)
    const type = detectTransactionType(subject, body);

    // Detect category
    const category = detectCategoryFromText(fullText);

    // Build description from subject if available
    const direction = type === 'income' ? 'Credit' : 'Debit';
    const description = subject
      ? `Mandiri: ${subject.substring(0, 80)}`
      : `Mandiri ${direction} notification`;

    return {
      amount,
      type,
      category,
      description,
      date: extractDate(date),
      platform: 'mandiri',
      originalSnippet: truncateSnippet(body),
    };
  },
};
