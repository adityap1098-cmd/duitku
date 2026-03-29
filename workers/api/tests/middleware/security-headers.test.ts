/**
 * Tests for security headers middleware.
 */

import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { securityHeaders } from '../../src/middleware/security-headers';

function createApp() {
  const app = new Hono();
  app.use('*', securityHeaders);
  app.get('/test', (c) => c.json({ ok: true }));
  app.get('/html', (c) => c.html('<p>hello</p>'));
  return app;
}

describe('securityHeaders', () => {
  it('sets X-Frame-Options: DENY', async () => {
    const app = createApp();
    const res = await app.request('/test');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('sets X-Content-Type-Options: nosniff', async () => {
    const app = createApp();
    const res = await app.request('/test');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('sets X-XSS-Protection', async () => {
    const app = createApp();
    const res = await app.request('/test');
    expect(res.headers.get('X-XSS-Protection')).toBe('1; mode=block');
  });

  it('sets Referrer-Policy', async () => {
    const app = createApp();
    const res = await app.request('/test');
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });

  it('sets Permissions-Policy', async () => {
    const app = createApp();
    const res = await app.request('/test');
    expect(res.headers.get('Permissions-Policy')).toContain('camera=()');
  });

  it('sets CSP for non-HTML responses', async () => {
    const app = createApp();
    const res = await app.request('/test');
    expect(res.headers.get('Content-Security-Policy')).toBe(
      "default-src 'none'; frame-ancestors 'none'"
    );
  });

  it('does NOT override CSP for HTML responses', async () => {
    const app = createApp();
    const res = await app.request('/html');
    // HTML responses should not get the strict API CSP
    // (the callback page sets its own via meta tag)
    expect(res.headers.get('Content-Security-Policy')).toBeNull();
  });

  it('sets HSTS for HTTPS requests', async () => {
    const app = createApp();
    const res = await app.request('https://api.example.com/test');
    expect(res.headers.get('Strict-Transport-Security')).toBe(
      'max-age=31536000; includeSubDomains'
    );
  });

  it('does NOT set HSTS for HTTP requests', async () => {
    const app = createApp();
    const res = await app.request('http://localhost:8787/test');
    expect(res.headers.get('Strict-Transport-Security')).toBeNull();
  });
});
