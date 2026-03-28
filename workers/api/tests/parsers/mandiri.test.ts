import { describe, it, expect } from 'vitest';
import { mandiriParser } from '../../src/parsers/mandiri';
import { findParserForEmail } from '../../src/parsers/index';
import type { EmailInput } from '@duitku/shared';

// ─── Helper ──────────────────────────────────────────────────────────
function makeEmail(overrides: Partial<EmailInput> = {}): EmailInput {
  return {
    messageId: 'msg-mandiri-001',
    subject: 'Notifikasi Transaksi',
    from: 'info@bankmandiri.co.id',
    body: 'Transaksi debet sebesar Rp500.000 telah berhasil.',
    date: '2025-07-10T14:00:00Z',
    ...overrides,
  };
}

// ─── Sender Pattern Matching ─────────────────────────────────────────
describe('mandiriParser sender patterns', () => {
  it('matches info@bankmandiri.co.id', () => {
    const match = mandiriParser.senderPatterns.some(p => p.test('info@bankmandiri.co.id'));
    expect(match).toBe(true);
  });

  it('matches noreply@mandiri.co.id', () => {
    const match = mandiriParser.senderPatterns.some(p => p.test('noreply@mandiri.co.id'));
    expect(match).toBe(true);
  });

  it('does not match random@example.com', () => {
    const match = mandiriParser.senderPatterns.some(p => p.test('random@example.com'));
    expect(match).toBe(false);
  });
});

// ─── findParserForEmail routing ──────────────────────────────────────
describe('findParserForEmail — Mandiri routing', () => {
  it('routes info@bankmandiri.co.id to Mandiri parser', () => {
    const parser = findParserForEmail('info@bankmandiri.co.id');
    expect(parser).not.toBeNull();
    expect(parser!.platform).toBe('mandiri');
  });

  it('routes alerts@mandiri.co.id to Mandiri parser', () => {
    const parser = findParserForEmail('alerts@mandiri.co.id');
    expect(parser).not.toBeNull();
    expect(parser!.platform).toBe('mandiri');
  });
});

// ─── Debit (Expense) Parsing ─────────────────────────────────────────
describe('mandiriParser — debit (expense)', () => {
  it('parses debit notification with correct amount and type', () => {
    const email = makeEmail({
      subject: 'Notifikasi Debet',
      body: 'Transaksi debet dari rekening Anda sebesar Rp500.000 telah berhasil.',
    });

    const result = mandiriParser.parse(email);

    expect(result).not.toBeNull();
    expect(result!.amount).toBe(500000);
    expect(result!.type).toBe('expense');
    expect(result!.platform).toBe('mandiri');
    expect(result!.date).toBe('2025-07-10');
  });

  it('detects expense with "keluar" keyword', () => {
    const email = makeEmail({
      body: 'Uang keluar dari rekening Anda sebesar Rp200.000.',
    });

    const result = mandiriParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('expense');
    expect(result!.amount).toBe(200000);
  });

  it('defaults to expense when direction is ambiguous', () => {
    const email = makeEmail({
      subject: 'Notifikasi Transaksi',
      body: 'Transaksi sebesar Rp100.000 telah berhasil.',
    });

    const result = mandiriParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('expense');
  });
});

// ─── Credit (Income) Parsing ─────────────────────────────────────────
describe('mandiriParser — credit (income)', () => {
  it('parses credit notification with "kredit" keyword', () => {
    const email = makeEmail({
      subject: 'Notifikasi Kredit',
      body: 'Transaksi kredit ke rekening Anda sebesar Rp2.000.000 telah berhasil.',
    });

    const result = mandiriParser.parse(email);

    expect(result).not.toBeNull();
    expect(result!.amount).toBe(2000000);
    expect(result!.type).toBe('income');
    expect(result!.description).toContain('Credit');
  });

  it('detects income with "masuk" keyword', () => {
    const email = makeEmail({
      body: 'Dana masuk ke rekening Anda sebesar Rp750.000.',
    });

    const result = mandiriParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('income');
  });

  it('detects income with "penerimaan" keyword', () => {
    const email = makeEmail({
      body: 'Penerimaan sebesar Rp3.500.000 telah dikreditkan.',
    });

    const result = mandiriParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('income');
  });
});

// ─── Category Detection ─────────────────────────────────────────────
describe('mandiriParser — category detection', () => {
  it('detects transfer category with "transfer" keyword', () => {
    const email = makeEmail({
      body: 'Transfer ke rekening 1234567890 sebesar Rp500.000 berhasil.',
    });

    const result = mandiriParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('transfer');
  });

  it('detects transfer category with "kirim" keyword', () => {
    const email = makeEmail({
      body: 'Kirim uang sebesar Rp100.000 ke rekening BCA.',
    });

    const result = mandiriParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('transfer');
  });

  it('detects bills category with "tagihan" keyword', () => {
    const email = makeEmail({
      body: 'Pembayaran tagihan sebesar Rp350.000 berhasil.',
    });

    const result = mandiriParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('bills');
  });

  it('detects bills category with "listrik" keyword', () => {
    const email = makeEmail({
      body: 'Pembayaran listrik PLN sebesar Rp275.000.',
    });

    const result = mandiriParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('bills');
  });

  it('defaults to "other" for unrecognized transaction type', () => {
    const email = makeEmail({
      body: 'Transaksi debet sebesar Rp50.000 telah berhasil.',
    });

    const result = mandiriParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('other');
  });
});

// ─── Edge Cases & Negative Tests ─────────────────────────────────────
describe('mandiriParser — negative / edge cases', () => {
  it('returns null when no amount found', () => {
    const email = makeEmail({
      subject: 'Notifikasi',
      body: 'Transaksi Anda telah berhasil.',
    });
    const result = mandiriParser.parse(email);
    expect(result).toBeNull();
  });

  it('returns null for empty body and no amount in subject', () => {
    const email = makeEmail({
      subject: 'Notifikasi Mandiri',
      body: '',
    });
    const result = mandiriParser.parse(email);
    expect(result).toBeNull();
  });

  it('returns null for body with invalid Rp format', () => {
    const email = makeEmail({
      body: 'Transaksi Rp berhasil dilakukan.',
    });
    const result = mandiriParser.parse(email);
    expect(result).toBeNull();
  });

  it('handles very large amount Rp1.000.000.000', () => {
    const email = makeEmail({
      body: 'Transfer masuk sebesar Rp1.000.000.000.',
    });

    const result = mandiriParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1000000000);
  });

  it('handles very small amount Rp1.000', () => {
    const email = makeEmail({
      body: 'Debet sebesar Rp1.000 untuk biaya admin.',
    });

    const result = mandiriParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1000);
  });

  it('truncates originalSnippet to max 200 chars', () => {
    const longBody = 'Transaksi debet sebesar Rp50.000\n' + 'A'.repeat(300);
    const email = makeEmail({ body: longBody });
    const result = mandiriParser.parse(email);

    expect(result).not.toBeNull();
    expect(result!.originalSnippet.length).toBeLessThanOrEqual(200);
  });

  it('extracts correct date from ISO date header', () => {
    const email = makeEmail({
      body: 'Debet sebesar Rp50.000',
      date: '2025-12-25',
    });
    const result = mandiriParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.date).toBe('2025-12-25');
  });
});
