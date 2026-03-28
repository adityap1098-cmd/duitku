/**
 * Gmail REST API client for Cloudflare Workers runtime.
 * Uses fetch() — no Node.js SDK. Handles OAuth2 token refresh,
 * message listing with query filters, and MIME body extraction.
 */

import type { EmailInput } from '@duitku/shared';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

// ── Token Refresh ──────────────────────────────────────────

export class GmailTokenError extends Error {
  constructor(
    message: string,
    public readonly isRevoked: boolean
  ) {
    super(message);
    this.name = 'GmailTokenError';
  }
}

/**
 * Exchange a refresh token for a fresh access token.
 * Detects `invalid_grant` specifically — means user revoked access.
 */
export async function refreshGmailAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  if (!refreshToken || !clientId || !clientSecret) {
    throw new GmailTokenError(
      'Missing credentials: refreshToken, clientId, and clientSecret are required',
      false
    );
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  if (!response.ok) {
    let errorBody: any;
    try {
      errorBody = await response.json();
    } catch {
      throw new GmailTokenError(
        `Token refresh failed with status ${response.status}`,
        false
      );
    }

    const isRevoked = errorBody?.error === 'invalid_grant';
    throw new GmailTokenError(
      `Token refresh failed: ${errorBody?.error_description || errorBody?.error || response.status}`,
      isRevoked
    );
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new GmailTokenError(
      'Token refresh returned malformed JSON',
      false
    );
  }

  if (!data.access_token) {
    throw new GmailTokenError(
      'Token refresh response missing access_token',
      false
    );
  }

  return data.access_token;
}

// ── Message Listing ────────────────────────────────────────

interface GmailMessageRef {
  id: string;
  threadId: string;
}

/**
 * List Gmail message IDs matching a query filter.
 * Returns empty array on auth errors (401/403) or unexpected response shape.
 */
export async function listGmailMessages(
  accessToken: string,
  query: string,
  maxResults: number = 50
): Promise<GmailMessageRef[]> {
  const params = new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
  });

  const response = await fetch(`${GMAIL_API_BASE}/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // Auth issues — return empty, caller should handle token refresh
  if (response.status === 401 || response.status === 403) {
    return [];
  }

  if (response.status === 429) {
    throw new Error('Gmail API rate limit exceeded (429)');
  }

  if (!response.ok) {
    throw new Error(`Gmail API list messages failed: ${response.status}`);
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    return [];
  }

  // Gmail returns no `messages` key when there are zero results
  if (!data.messages || !Array.isArray(data.messages)) {
    return [];
  }

  return data.messages.map((m: any) => ({
    id: m.id,
    threadId: m.threadId,
  }));
}

// ── Message Retrieval ──────────────────────────────────────

/**
 * Decode base64url-encoded string to UTF-8 text.
 * Gmail uses base64url (RFC 4648 §5): `-` instead of `+`, `_` instead of `/`, no padding.
 */
export function decodeBase64Url(data: string): string {
  // Replace base64url chars with standard base64
  let base64 = data.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if needed
  const pad = base64.length % 4;
  if (pad === 2) base64 += '==';
  else if (pad === 3) base64 += '=';

  // Decode base64 to binary string
  const binaryStr = atob(base64);

  // Convert binary string to Uint8Array for proper UTF-8 decoding
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  return new TextDecoder('utf-8').decode(bytes);
}

/**
 * Strip HTML tags and decode common entities — simple fallback for HTML-only emails.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface GmailPayload {
  mimeType?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: { data?: string; size?: number };
  parts?: GmailPayload[];
}

/**
 * Recursively walk MIME parts to find text/plain (preferred) or text/html (fallback).
 * Returns decoded body text or null if nothing found.
 */
export function extractBodyFromParts(payload: GmailPayload): string | null {
  // Direct body on this node
  if (payload.body?.data) {
    if (payload.mimeType === 'text/plain') {
      return decodeBase64Url(payload.body.data);
    }
    if (payload.mimeType === 'text/html') {
      return stripHtml(decodeBase64Url(payload.body.data));
    }
  }

  // Recurse into parts
  if (payload.parts && payload.parts.length > 0) {
    // First pass: look for text/plain
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // Second pass: recurse deeper for text/plain
    for (const part of payload.parts) {
      if (part.parts) {
        const found = extractBodyFromParts(part);
        if (found !== null) return found;
      }
    }
    // Third pass: fallback to text/html
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return stripHtml(decodeBase64Url(part.body.data));
      }
    }
    // Fourth pass: recurse for HTML
    for (const part of payload.parts) {
      if (part.parts) {
        const htmlResult = extractBodyFromParts({
          ...part,
          mimeType: undefined, // reset so we don't match on container mimeType
        });
        if (htmlResult !== null) return htmlResult;
      }
    }
  }

  return null;
}

/**
 * Extract a header value from Gmail message headers.
 */
function getHeader(
  headers: Array<{ name: string; value: string }> | undefined,
  name: string
): string {
  if (!headers) return '';
  const header = headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  );
  return header?.value ?? '';
}

/**
 * Fetch a single Gmail message and extract it into EmailInput.
 * Returns null if the message body cannot be extracted.
 */
export async function getGmailMessage(
  accessToken: string,
  messageId: string
): Promise<EmailInput | null> {
  const response = await fetch(
    `${GMAIL_API_BASE}/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return null;
    }
    throw new Error(`Gmail API get message failed: ${response.status}`);
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    return null;
  }

  if (!data.payload) {
    return null;
  }

  const headers = data.payload.headers;
  const subject = getHeader(headers, 'Subject');
  const from = getHeader(headers, 'From');
  const dateStr = getHeader(headers, 'Date');

  const body = extractBodyFromParts(data.payload);

  if (!body) {
    return null;
  }

  // Parse date — Gmail Date header is RFC 2822 format
  let isoDate: string;
  try {
    isoDate = new Date(dateStr).toISOString();
  } catch {
    isoDate = new Date().toISOString();
  }

  return {
    messageId,
    subject,
    from,
    body,
    date: isoDate,
  };
}
