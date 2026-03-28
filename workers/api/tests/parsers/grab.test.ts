import { describe, it, expect } from 'vitest';
import { grabParser } from '../../src/parsers/grab';
import { parseRupiahAmount } from '../../src/parsers/_template';
import type { EmailInput } from '@duitku/shared';

// ─── Helper ──────────────────────────────────────────────────────────
function makeEmail(overrides: Partial<EmailInput> = {}): EmailInput {
  return {
    messageId: 'msg-001',
    subject: 'Your Grab receipt',
    from: 'no-reply@grab.com',
    body: 'GrabFood order\nTotal pembayaran: Rp150.000',
    date: '2025-06-15T10:30:00Z',
    ...overrides,
  };
}

// ─── parseRupiahAmount helper ────────────────────────────────────────
describe('parseRupiahAmount', () => {
  it('parses "Rp150.000" → 150000', () => {
    expect(parseRupiahAmount('Rp150.000')).toBe(150000);
  });

  it('parses "Rp 1.250.000" → 1250000', () => {
    expect(parseRupiahAmount('Rp 1.250.000')).toBe(1250000);
  });

  it('parses "Rp50000" → 50000', () => {
    expect(parseRupiahAmount('Rp50000')).toBe(50000);
  });

  it('parses "Rp 50.000" with space → 50000', () => {
    expect(parseRupiahAmount('Rp 50.000')).toBe(50000);
  });

  it('parses very large "Rp1.000.000.000" → 1000000000', () => {
    expect(parseRupiahAmount('Rp1.000.000.000')).toBe(1000000000);
  });

  it('parses "Rp. 75.000" with dot after Rp → 75000', () => {
    expect(parseRupiahAmount('Rp. 75.000')).toBe(75000);
  });

  it('returns null for empty string', () => {
    expect(parseRupiahAmount('')).toBeNull();
  });

  it('returns null for text without numbers', () => {
    expect(parseRupiahAmount('no amount here')).toBeNull();
  });
});

// ─── Sender Pattern Matching ─────────────────────────────────────────
describe('grabParser sender patterns', () => {
  it('matches no-reply@grab.com', () => {
    const match = grabParser.senderPatterns.some(p => p.test('no-reply@grab.com'));
    expect(match).toBe(true);
  });

  it('matches noreply@grab.com (no hyphen)', () => {
    const match = grabParser.senderPatterns.some(p => p.test('noreply@grab.com'));
    expect(match).toBe(true);
  });

  it('does not match random@example.com', () => {
    const match = grabParser.senderPatterns.some(p => p.test('random@example.com'));
    expect(match).toBe(false);
  });
});

// ─── GrabFood Parsing ───────────────────────────────────────────────
describe('grabParser — GrabFood', () => {
  it('parses GrabFood receipt with correct amount and category', () => {
    const email = makeEmail({
      subject: 'Your GrabFood receipt',
      body: 'GrabFood order from Ayam Geprek\nTotal pembayaran: Rp150.000\nThank you!',
    });

    const result = grabParser.parse(email);

    expect(result).not.toBeNull();
    expect(result!.amount).toBe(150000);
    expect(result!.category).toBe('food');
    expect(result!.type).toBe('expense');
    expect(result!.platform).toBe('grab');
    expect(result!.description).toContain('GrabFood');
    expect(result!.date).toBe('2025-06-15');
  });

  it('truncates originalSnippet to max 200 chars', () => {
    const longBody = 'GrabFood order\nTotal: Rp50.000\n' + 'A'.repeat(300);
    const email = makeEmail({ body: longBody });
    const result = grabParser.parse(email);

    expect(result).not.toBeNull();
    expect(result!.originalSnippet.length).toBeLessThanOrEqual(200);
  });
});

// ─── GrabCar Parsing ────────────────────────────────────────────────
describe('grabParser — GrabCar', () => {
  it('parses GrabCar receipt as transport', () => {
    const email = makeEmail({
      subject: 'Your GrabCar receipt',
      body: 'GrabCar ride to Sudirman\nTotal: Rp75.000',
    });

    const result = grabParser.parse(email);

    expect(result).not.toBeNull();
    expect(result!.amount).toBe(75000);
    expect(result!.category).toBe('transport');
    expect(result!.description).toContain('GrabCar');
  });
});

// ─── GrabBike Parsing ───────────────────────────────────────────────
describe('grabParser — GrabBike', () => {
  it('parses GrabBike receipt as transport', () => {
    const email = makeEmail({
      subject: 'GrabBike receipt',
      body: 'GrabBike ride\nTotal pembayaran Rp25.000',
    });

    const result = grabParser.parse(email);

    expect(result).not.toBeNull();
    expect(result!.amount).toBe(25000);
    expect(result!.category).toBe('transport');
  });
});

// ─── Negative / Edge Cases ──────────────────────────────────────────
describe('grabParser — negative cases', () => {
  it('returns null when no amount found', () => {
    const email = makeEmail({
      body: 'Thank you for using Grab! No total here.',
    });
    const result = grabParser.parse(email);
    expect(result).toBeNull();
  });

  it('returns null for empty body', () => {
    const email = makeEmail({ body: '' });
    const result = grabParser.parse(email);
    // Should not crash even with empty body — may find amount in subject or return null
    // If subject has no amount either, result is null
    expect(result).toBeNull();
  });

  it('handles amount with spaces "Rp 150.000"', () => {
    const email = makeEmail({
      body: 'GrabFood\nTotal: Rp 150.000',
    });
    const result = grabParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(150000);
  });

  it('defaults to "other" category for unrecognized Grab service', () => {
    const email = makeEmail({
      subject: 'Your Grab receipt',
      body: 'Some unknown Grab service\nTotal: Rp30.000',
    });
    const result = grabParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('other');
  });

  it('handles multiple amounts — picks first total pattern', () => {
    const email = makeEmail({
      body: 'GrabFood\nSubtotal: Rp40.000\nBiaya kirim: Rp10.000\nTotal pembayaran: Rp50.000',
    });
    const result = grabParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(50000);
  });

  it('extracts correct date from ISO date header', () => {
    const email = makeEmail({
      body: 'GrabFood\nTotal: Rp50.000',
      date: '2025-12-25',
    });
    const result = grabParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.date).toBe('2025-12-25');
  });
});
