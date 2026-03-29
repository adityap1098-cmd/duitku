/**
 * Tests for body size limit middleware.
 */

import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { bodyLimitMiddleware } from '../../src/middleware/body-limit';

function createApp(maxBytes?: number) {
  const app = new Hono();
  app.use('*', bodyLimitMiddleware(maxBytes));
  app.post('/test', async (c) => {
    const body = await c.req.text();
    return c.json({ received: body.length });
  });
  app.get('/test', (c) => c.json({ ok: true }));
  return app;
}

describe('bodyLimitMiddleware', () => {
  it('allows GET requests regardless of headers', async () => {
    const app = createApp(100);
    const res = await app.request('/test', {
      method: 'GET',
      headers: { 'Content-Length': '999999' },
    });
    expect(res.status).toBe(200);
  });

  it('allows POST requests within limit', async () => {
    const app = createApp(1024);
    const res = await app.request('/test', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'Content-Length': '10' },
      body: 'small body',
    });
    expect(res.status).toBe(200);
  });

  it('rejects POST requests exceeding Content-Length limit', async () => {
    const app = createApp(100);
    const res = await app.request('/test', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'Content-Length': '5000' },
      body: 'x'.repeat(5000),
    });
    expect(res.status).toBe(400);
    const json = await res.json() as any;
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.message).toContain('too large');
  });

  it('allows POST without Content-Length header (no fast path)', async () => {
    const app = createApp(1024 * 1024);
    const res = await app.request('/test', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'hello',
    });
    expect(res.status).toBe(200);
  });
});
