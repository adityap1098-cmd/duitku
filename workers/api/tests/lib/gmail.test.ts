/**
 * Gmail API client tests.
 * Mocks globalThis.fetch for all HTTP calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  refreshGmailAccessToken,
  listGmailMessages,
  getGmailMessage,
  decodeBase64Url,
  extractBodyFromParts,
  GmailTokenError,
} from '../../src/lib/gmail';

// ── Helpers ────────────────────────────────────────────────

/** Encode a string to base64url (Gmail format) */
function toBase64Url(str: string): string {
  // Encode to UTF-8 bytes first
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function mockFetch(response: Partial<Response> & { json?: () => Promise<any>; ok?: boolean; status?: number }) {
  const fn = vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: response.json ?? (() => Promise.resolve({})),
    text: () => Promise.resolve(''),
    ...response,
  });
  globalThis.fetch = fn;
  return fn;
}

// ── Token Refresh ──────────────────────────────────────────

describe('refreshGmailAccessToken', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns access token on successful refresh', async () => {
    mockFetch({
      ok: true,
      json: () => Promise.resolve({ access_token: 'new-access-token-123', expires_in: 3600 }),
    });

    const token = await refreshGmailAccessToken('refresh-tok', 'client-id', 'client-secret');
    expect(token).toBe('new-access-token-123');

    // Verify correct request was made
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    );
  });

  it('throws GmailTokenError with isRevoked=true on invalid_grant', async () => {
    mockFetch({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'invalid_grant', error_description: 'Token has been revoked.' }),
    });

    await expect(refreshGmailAccessToken('revoked-tok', 'client-id', 'client-secret'))
      .rejects
      .toThrow(GmailTokenError);

    try {
      await refreshGmailAccessToken('revoked-tok', 'client-id', 'client-secret');
    } catch (err) {
      expect(err).toBeInstanceOf(GmailTokenError);
      expect((err as GmailTokenError).isRevoked).toBe(true);
    }
  });

  it('throws GmailTokenError with isRevoked=false on other errors', async () => {
    mockFetch({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'server_error' }),
    });

    try {
      await refreshGmailAccessToken('tok', 'id', 'secret');
    } catch (err) {
      expect(err).toBeInstanceOf(GmailTokenError);
      expect((err as GmailTokenError).isRevoked).toBe(false);
    }
  });

  it('throws on network/fetch error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(refreshGmailAccessToken('tok', 'id', 'secret'))
      .rejects
      .toThrow('Network error');
  });

  it('throws on missing credentials (empty refresh token)', async () => {
    await expect(refreshGmailAccessToken('', 'id', 'secret'))
      .rejects
      .toThrow('Missing credentials');
  });

  it('throws on missing credentials (empty client ID)', async () => {
    await expect(refreshGmailAccessToken('tok', '', 'secret'))
      .rejects
      .toThrow('Missing credentials');
  });

  it('throws when response is malformed JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    });

    await expect(refreshGmailAccessToken('tok', 'id', 'secret'))
      .rejects
      .toThrow('malformed JSON');
  });

  it('throws when response missing access_token', async () => {
    mockFetch({
      ok: true,
      json: () => Promise.resolve({ token_type: 'Bearer', expires_in: 3600 }),
    });

    await expect(refreshGmailAccessToken('tok', 'id', 'secret'))
      .rejects
      .toThrow('missing access_token');
  });
});

// ── List Messages ──────────────────────────────────────────

describe('listGmailMessages', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns message refs on success', async () => {
    mockFetch({
      ok: true,
      json: () => Promise.resolve({
        messages: [
          { id: 'msg1', threadId: 'thread1' },
          { id: 'msg2', threadId: 'thread2' },
        ],
        resultSizeEstimate: 2,
      }),
    });

    const messages = await listGmailMessages('access-tok', 'from:noreply@grab.com');
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({ id: 'msg1', threadId: 'thread1' });
  });

  it('returns empty array when no messages key (zero results)', async () => {
    mockFetch({
      ok: true,
      json: () => Promise.resolve({ resultSizeEstimate: 0 }),
    });

    const messages = await listGmailMessages('access-tok', 'from:nobody@example.com');
    expect(messages).toEqual([]);
  });

  it('returns empty array on 401 (auth error)', async () => {
    mockFetch({ ok: false, status: 401, json: () => Promise.resolve({}) });

    const messages = await listGmailMessages('bad-tok', 'query');
    expect(messages).toEqual([]);
  });

  it('returns empty array on 403 (forbidden)', async () => {
    mockFetch({ ok: false, status: 403, json: () => Promise.resolve({}) });

    const messages = await listGmailMessages('bad-tok', 'query');
    expect(messages).toEqual([]);
  });

  it('throws on 429 rate limit', async () => {
    mockFetch({ ok: false, status: 429, json: () => Promise.resolve({}) });

    await expect(listGmailMessages('tok', 'query'))
      .rejects
      .toThrow('rate limit');
  });

  it('throws on 500 server error', async () => {
    mockFetch({ ok: false, status: 500, json: () => Promise.resolve({}) });

    await expect(listGmailMessages('tok', 'query'))
      .rejects
      .toThrow('500');
  });

  it('returns empty array on malformed JSON response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('bad json')),
    });

    const messages = await listGmailMessages('tok', 'query');
    expect(messages).toEqual([]);
  });
});

// ── Get Message ────────────────────────────────────────────

describe('getGmailMessage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('extracts EmailInput from simple text/plain message', async () => {
    const body = toBase64Url('Your Grab ride cost Rp 25.000');
    mockFetch({
      ok: true,
      json: () => Promise.resolve({
        id: 'msg123',
        payload: {
          mimeType: 'text/plain',
          headers: [
            { name: 'Subject', value: 'Receipt for your Grab ride' },
            { name: 'From', value: 'noreply@grab.com' },
            { name: 'Date', value: 'Mon, 15 Jan 2024 10:30:00 +0700' },
          ],
          body: { data: body, size: 100 },
        },
      }),
    });

    const result = await getGmailMessage('access-tok', 'msg123');
    expect(result).not.toBeNull();
    expect(result!.messageId).toBe('msg123');
    expect(result!.subject).toBe('Receipt for your Grab ride');
    expect(result!.from).toBe('noreply@grab.com');
    expect(result!.body).toBe('Your Grab ride cost Rp 25.000');
    expect(result!.date).toBeTruthy();
  });

  it('extracts text/plain from multipart message', async () => {
    const textBody = toBase64Url('Your order total is Rp 50.000');
    const htmlBody = toBase64Url('<html><body><b>Your order total is Rp 50.000</b></body></html>');

    mockFetch({
      ok: true,
      json: () => Promise.resolve({
        id: 'msg-multi',
        payload: {
          mimeType: 'multipart/alternative',
          headers: [
            { name: 'Subject', value: 'Order confirmation' },
            { name: 'From', value: 'noreply@shopee.co.id' },
            { name: 'Date', value: 'Tue, 16 Jan 2024 14:00:00 +0700' },
          ],
          body: { size: 0 },
          parts: [
            { mimeType: 'text/plain', body: { data: textBody, size: 30 } },
            { mimeType: 'text/html', body: { data: htmlBody, size: 60 } },
          ],
        },
      }),
    });

    const result = await getGmailMessage('access-tok', 'msg-multi');
    expect(result).not.toBeNull();
    expect(result!.body).toBe('Your order total is Rp 50.000');
  });

  it('falls back to HTML when text/plain is missing', async () => {
    const htmlBody = toBase64Url('<html><body><p>GoFood order Rp 35.000</p></body></html>');

    mockFetch({
      ok: true,
      json: () => Promise.resolve({
        id: 'msg-html',
        payload: {
          mimeType: 'multipart/alternative',
          headers: [
            { name: 'Subject', value: 'GoFood receipt' },
            { name: 'From', value: 'noreply@gojek.com' },
            { name: 'Date', value: 'Wed, 17 Jan 2024 12:00:00 +0700' },
          ],
          body: { size: 0 },
          parts: [
            { mimeType: 'text/html', body: { data: htmlBody, size: 50 } },
          ],
        },
      }),
    });

    const result = await getGmailMessage('access-tok', 'msg-html');
    expect(result).not.toBeNull();
    expect(result!.body).toContain('GoFood order Rp 35.000');
  });

  it('returns null when message has no body parts', async () => {
    mockFetch({
      ok: true,
      json: () => Promise.resolve({
        id: 'msg-empty',
        payload: {
          mimeType: 'multipart/mixed',
          headers: [
            { name: 'Subject', value: 'Empty' },
            { name: 'From', value: 'test@example.com' },
            { name: 'Date', value: 'Thu, 18 Jan 2024 09:00:00 +0700' },
          ],
          body: { size: 0 },
          parts: [
            { mimeType: 'image/png', body: { data: '', size: 0 } },
          ],
        },
      }),
    });

    const result = await getGmailMessage('access-tok', 'msg-empty');
    expect(result).toBeNull();
  });

  it('returns null on 401 response', async () => {
    mockFetch({ ok: false, status: 401, json: () => Promise.resolve({}) });
    const result = await getGmailMessage('bad-tok', 'msg1');
    expect(result).toBeNull();
  });

  it('returns null on 403 response', async () => {
    mockFetch({ ok: false, status: 403, json: () => Promise.resolve({}) });
    const result = await getGmailMessage('bad-tok', 'msg1');
    expect(result).toBeNull();
  });

  it('throws on 500 server error', async () => {
    mockFetch({ ok: false, status: 500, json: () => Promise.resolve({}) });
    await expect(getGmailMessage('tok', 'msg1')).rejects.toThrow('500');
  });

  it('returns null on malformed JSON response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('bad json')),
    });
    const result = await getGmailMessage('tok', 'msg1');
    expect(result).toBeNull();
  });

  it('returns null when payload is missing', async () => {
    mockFetch({
      ok: true,
      json: () => Promise.resolve({ id: 'msg-no-payload' }),
    });
    const result = await getGmailMessage('tok', 'msg-no-payload');
    expect(result).toBeNull();
  });
});

// ── Base64url Decoding ─────────────────────────────────────

describe('decodeBase64Url', () => {
  it('decodes standard ASCII text', () => {
    const encoded = toBase64Url('Hello, World!');
    expect(decodeBase64Url(encoded)).toBe('Hello, World!');
  });

  it('handles base64url special characters (- and _)', () => {
    // Create text that produces + and / in standard base64
    const text = 'abc>>>???<<<';
    const encoded = toBase64Url(text);
    // Verify the encoded form uses base64url chars
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(decodeBase64Url(encoded)).toBe(text);
  });

  it('decodes Indonesian characters (UTF-8)', () => {
    const text = 'Terima kasih, Rp 50.000 untuk perjalanan Anda ke Jl. Sudirman №5';
    const encoded = toBase64Url(text);
    expect(decodeBase64Url(encoded)).toBe(text);
  });

  it('handles emoji and multi-byte UTF-8', () => {
    const text = 'Pembayaran berhasil! 🎉 Total: Rp 100.000';
    const encoded = toBase64Url(text);
    expect(decodeBase64Url(encoded)).toBe(text);
  });

  it('handles empty string', () => {
    expect(decodeBase64Url('')).toBe('');
  });
});

// ── extractBodyFromParts ───────────────────────────────────

describe('extractBodyFromParts', () => {
  it('extracts text/plain from direct body', () => {
    const result = extractBodyFromParts({
      mimeType: 'text/plain',
      body: { data: toBase64Url('Direct text body') },
    });
    expect(result).toBe('Direct text body');
  });

  it('extracts text/html from direct body and strips tags', () => {
    const result = extractBodyFromParts({
      mimeType: 'text/html',
      body: { data: toBase64Url('<html><body><p>Hello <b>world</b></p></body></html>') },
    });
    expect(result).toContain('Hello world');
  });

  it('prefers text/plain over text/html in multipart', () => {
    const result = extractBodyFromParts({
      mimeType: 'multipart/alternative',
      body: { size: 0 },
      parts: [
        { mimeType: 'text/html', body: { data: toBase64Url('<p>HTML</p>') } },
        { mimeType: 'text/plain', body: { data: toBase64Url('Plain text') } },
      ],
    });
    expect(result).toBe('Plain text');
  });

  it('handles deeply nested multipart structures', () => {
    const result = extractBodyFromParts({
      mimeType: 'multipart/mixed',
      body: { size: 0 },
      parts: [
        {
          mimeType: 'multipart/alternative',
          body: { size: 0 },
          parts: [
            { mimeType: 'text/plain', body: { data: toBase64Url('Deep nested text') } },
            { mimeType: 'text/html', body: { data: toBase64Url('<p>Deep nested HTML</p>') } },
          ],
        },
        { mimeType: 'application/pdf', body: { data: 'binary', size: 1000 } },
      ],
    });
    expect(result).toBe('Deep nested text');
  });

  it('returns null when no text parts found', () => {
    const result = extractBodyFromParts({
      mimeType: 'multipart/mixed',
      body: { size: 0 },
      parts: [
        { mimeType: 'image/png', body: { data: 'binary' } },
        { mimeType: 'application/pdf', body: { data: 'binary' } },
      ],
    });
    expect(result).toBeNull();
  });

  it('returns null for empty payload', () => {
    const result = extractBodyFromParts({
      mimeType: 'multipart/mixed',
      body: { size: 0 },
    });
    expect(result).toBeNull();
  });
});
