import { describe, it, expect } from 'vitest';
import { gojekParser } from '../../src/parsers/gojek';
import type { EmailInput } from '@duitku/shared';

// ─── Helper ──────────────────────────────────────────────────────────
function makeEmail(overrides: Partial<EmailInput> = {}): EmailInput {
  return {
    messageId: 'msg-002',
    subject: 'Your Gojek receipt',
    from: 'no-reply@gojek.com',
    body: 'GoFood order\nTotal pembayaran: Rp85.000',
    date: '2025-07-10T14:00:00Z',
    ...overrides,
  };
}

// ─── Sender Pattern Matching ─────────────────────────────────────────
describe('gojekParser sender patterns', () => {
  it('matches no-reply@gojek.com', () => {
    const match = gojekParser.senderPatterns.some(p => p.test('no-reply@gojek.com'));
    expect(match).toBe(true);
  });

  it('matches noreply@gojek.com (no hyphen)', () => {
    const match = gojekParser.senderPatterns.some(p => p.test('noreply@gojek.com'));
    expect(match).toBe(true);
  });

  it('matches receipts@go-jek.com (legacy domain)', () => {
    const match = gojekParser.senderPatterns.some(p => p.test('receipts@go-jek.com'));
    expect(match).toBe(true);
  });

  it('does not match random@example.com', () => {
    const match = gojekParser.senderPatterns.some(p => p.test('random@example.com'));
    expect(match).toBe(false);
  });
});

// ─── GoFood Parsing ─────────────────────────────────────────────────
describe('gojekParser — GoFood', () => {
  it('parses GoFood receipt with correct amount and category', () => {
    const email = makeEmail({
      subject: 'GoFood receipt',
      body: 'GoFood order from Bakso Pak Min\nTotal pembayaran: Rp85.000',
    });

    const result = gojekParser.parse(email);

    expect(result).not.toBeNull();
    expect(result!.amount).toBe(85000);
    expect(result!.category).toBe('food');
    expect(result!.type).toBe('expense');
    expect(result!.platform).toBe('gojek');
    expect(result!.description).toContain('GoFood');
    expect(result!.date).toBe('2025-07-10');
  });
});

// ─── GoRide Parsing ─────────────────────────────────────────────────
describe('gojekParser — GoRide', () => {
  it('parses GoRide receipt as transport', () => {
    const email = makeEmail({
      subject: 'GoRide receipt',
      body: 'GoRide trip\nTotal: Rp20.000',
    });

    const result = gojekParser.parse(email);

    expect(result).not.toBeNull();
    expect(result!.amount).toBe(20000);
    expect(result!.category).toBe('transport');
    expect(result!.description).toContain('GoRide');
  });
});

// ─── GoCar Parsing ──────────────────────────────────────────────────
describe('gojekParser — GoCar', () => {
  it('parses GoCar receipt as transport', () => {
    const email = makeEmail({
      body: 'GoCar ride to Monas\nTotal pembayaran: Rp55.000',
    });

    const result = gojekParser.parse(email);

    expect(result).not.toBeNull();
    expect(result!.amount).toBe(55000);
    expect(result!.category).toBe('transport');
  });
});

// ─── GoMart Parsing ─────────────────────────────────────────────────
describe('gojekParser — GoMart', () => {
  it('parses GoMart order as shopping', () => {
    const email = makeEmail({
      subject: 'GoMart order confirmation',
      body: 'GoMart order from Alfamart\nTotal: Rp120.000',
    });

    const result = gojekParser.parse(email);

    expect(result).not.toBeNull();
    expect(result!.amount).toBe(120000);
    expect(result!.category).toBe('shopping');
  });
});

// ─── Negative / Edge Cases ──────────────────────────────────────────
describe('gojekParser — negative cases', () => {
  it('returns null when no amount found', () => {
    const email = makeEmail({
      body: 'Thank you for using Gojek!',
    });
    const result = gojekParser.parse(email);
    expect(result).toBeNull();
  });

  it('returns null for empty body with no amount in subject', () => {
    const email = makeEmail({ body: '', subject: 'Hello from Gojek' });
    const result = gojekParser.parse(email);
    expect(result).toBeNull();
  });

  it('defaults to "other" for unrecognized Gojek service', () => {
    const email = makeEmail({
      subject: 'Gojek notification',
      body: 'Some Gojek thing\nTotal: Rp15.000',
    });
    const result = gojekParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('other');
  });

  it('handles large amount Rp1.000.000.000', () => {
    const email = makeEmail({
      body: 'GoFood order\nTotal: Rp1.000.000.000',
    });
    const result = gojekParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1000000000);
  });

  it('truncates originalSnippet to max 200 chars', () => {
    const longBody = 'GoFood\nTotal: Rp50.000\n' + 'B'.repeat(300);
    const email = makeEmail({ body: longBody });
    const result = gojekParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.originalSnippet.length).toBeLessThanOrEqual(200);
  });

  it('handles go-food variant keyword', () => {
    const email = makeEmail({
      body: 'Go-Food order\nTotal: Rp45.000',
    });
    const result = gojekParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('food');
  });
});
