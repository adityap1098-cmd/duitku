import { describe, it, expect } from 'vitest';
import { shopeeParser } from '../../src/parsers/shopee';
import { findParserForEmail, getAllParsers } from '../../src/parsers/index';
import type { EmailInput } from '@duitku/shared';

// ─── Helper ──────────────────────────────────────────────────────────
function makeEmail(overrides: Partial<EmailInput> = {}): EmailInput {
  return {
    messageId: 'msg-003',
    subject: 'Order Confirmation',
    from: 'no-reply@shopee.co.id',
    body: 'Pesanan kamu berhasil!\nTotal pembayaran: Rp250.000\nNomor pesanan: SHP123456789',
    date: '2025-08-20T09:00:00Z',
    ...overrides,
  };
}

// ─── Sender Pattern Matching ─────────────────────────────────────────
describe('shopeeParser sender patterns', () => {
  it('matches no-reply@shopee.co.id', () => {
    const match = shopeeParser.senderPatterns.some(p => p.test('no-reply@shopee.co.id'));
    expect(match).toBe(true);
  });

  it('matches noreply@shopee.co.id (no hyphen)', () => {
    const match = shopeeParser.senderPatterns.some(p => p.test('noreply@shopee.co.id'));
    expect(match).toBe(true);
  });

  it('matches notifications@mail.shopee.co.id', () => {
    const match = shopeeParser.senderPatterns.some(p => p.test('notifications@mail.shopee.co.id'));
    expect(match).toBe(true);
  });

  it('does not match random@example.com', () => {
    const match = shopeeParser.senderPatterns.some(p => p.test('random@example.com'));
    expect(match).toBe(false);
  });
});

// ─── Shopee Order Parsing ───────────────────────────────────────────
describe('shopeeParser — order confirmation', () => {
  it('parses Shopee order with correct amount and category', () => {
    const email = makeEmail();
    const result = shopeeParser.parse(email);

    expect(result).not.toBeNull();
    expect(result!.amount).toBe(250000);
    expect(result!.category).toBe('shopping');
    expect(result!.type).toBe('expense');
    expect(result!.platform).toBe('shopee');
    expect(result!.date).toBe('2025-08-20');
  });

  it('extracts order reference in description', () => {
    const email = makeEmail({
      body: 'Pesanan berhasil!\nNomor pesanan: SHP123456789\nTotal pembayaran: Rp100.000',
    });
    const result = shopeeParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.description).toContain('SHP123456789');
  });

  it('falls back to generic description without order ref', () => {
    const email = makeEmail({
      body: 'Pesanan berhasil!\nTotal pembayaran: Rp100.000',
      subject: 'Shopee receipt',
    });
    const result = shopeeParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.description).toBe('Shopee purchase');
  });
});

// ─── Negative / Edge Cases ──────────────────────────────────────────
describe('shopeeParser — negative cases', () => {
  it('returns null when no amount found', () => {
    const email = makeEmail({
      body: 'Your order has been shipped!',
      subject: 'Shipping update',
    });
    const result = shopeeParser.parse(email);
    expect(result).toBeNull();
  });

  it('returns null for empty body with no amount in subject', () => {
    const email = makeEmail({ body: '', subject: 'Shopee notification' });
    const result = shopeeParser.parse(email);
    expect(result).toBeNull();
  });

  it('handles large amount', () => {
    const email = makeEmail({
      body: 'Total pembayaran: Rp5.500.000',
    });
    const result = shopeeParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(5500000);
  });

  it('truncates originalSnippet to max 200 chars', () => {
    const longBody = 'Total: Rp50.000\n' + 'C'.repeat(300);
    const email = makeEmail({ body: longBody });
    const result = shopeeParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.originalSnippet.length).toBeLessThanOrEqual(200);
  });

  it('always returns shopping category', () => {
    const email = makeEmail({
      body: 'Some food-related Shopee order\nTotal: Rp30.000',
    });
    const result = shopeeParser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('shopping');
  });
});

// ─── Parser Registry ────────────────────────────────────────────────
describe('parser registry', () => {
  it('getAllParsers returns all 7 parsers', () => {
    const parsers = getAllParsers();
    expect(parsers).toHaveLength(7);
    expect(parsers.map(p => p.platform)).toEqual(['grab', 'gojek', 'shopee', 'tokopedia', 'bca', 'mandiri', 'bni']);
  });

  it('findParserForEmail matches grab sender', () => {
    const parser = findParserForEmail('no-reply@grab.com');
    expect(parser).not.toBeNull();
    expect(parser!.platform).toBe('grab');
  });

  it('findParserForEmail matches gojek sender', () => {
    const parser = findParserForEmail('noreply@gojek.com');
    expect(parser).not.toBeNull();
    expect(parser!.platform).toBe('gojek');
  });

  it('findParserForEmail matches shopee sender', () => {
    const parser = findParserForEmail('no-reply@shopee.co.id');
    expect(parser).not.toBeNull();
    expect(parser!.platform).toBe('shopee');
  });

  it('findParserForEmail matches go-jek legacy domain', () => {
    const parser = findParserForEmail('receipt@go-jek.com');
    expect(parser).not.toBeNull();
    expect(parser!.platform).toBe('gojek');
  });

  it('findParserForEmail returns null for unknown sender', () => {
    const parser = findParserForEmail('newsletter@random.com');
    expect(parser).toBeNull();
  });
});
