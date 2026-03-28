# DuitKu — Architecture & Convention Guide
## "The Single Source of Truth for AI Agents"

**Tujuan dokumen ini:** Agar siapa pun (manusia atau AI agent) bisa langsung paham cara kerja project ini dan bisa menambah fitur baru tanpa bertanya-tanya.

---

## 1. Project Overview

**DuitKu** = Personal finance tracker dengan Gmail auto-sync untuk platform Indonesia.

```
Fase 1: Personal use (Adit + teman-teman)
Fase 2: Public beta (free tier)
Fase 3: Premium features (paid tier)
```

**Tech Stack:**
- **Mobile:** React Native (Expo SDK 52+) + expo-router + zustand + tanstack-query
- **API:** Cloudflare Workers + Hono.js
- **Database:** Cloudflare D1 (SQLite)
- **Storage:** Cloudflare R2 (files/receipts)
- **Cache:** Cloudflare KV (sessions, rate limits)
- **Auth:** Manual Google OAuth2 + JWT

---

## 2. Monorepo Structure

```
duitku/
│
├── CLAUDE.md                          ← 🤖 AI AGENT: BACA INI PERTAMA
├── package.json                       ← npm workspaces root
├── turbo.json                         ← turborepo config (optional)
│
├── apps/
│   └── mobile/                        ← React Native (Expo)
│       ├── app/                       ← expo-router pages (lihat Section 6)
│       ├── components/                ← UI components (lihat Section 7)
│       ├── features/                  ← Feature modules (lihat Section 8)
│       ├── lib/                       ← Utilities & clients
│       ├── stores/                    ← Zustand stores
│       ├── hooks/                     ← Custom hooks
│       ├── constants/                 ← Static configs
│       ├── types/                     ← TypeScript types (auto-generated dari shared)
│       ├── app.json
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                        ← Shared types, utils, constants
│       ├── src/
│       │   ├── types/                 ← Canonical type definitions
│       │   │   ├── transaction.ts
│       │   │   ├── category.ts
│       │   │   ├── budget.ts
│       │   │   ├── user.ts
│       │   │   ├── sync.ts
│       │   │   ├── recurring.ts
│       │   │   ├── wallet.ts
│       │   │   └── index.ts           ← re-exports semua
│       │   ├── constants/
│       │   │   ├── categories.ts      ← default categories
│       │   │   ├── platforms.ts       ← supported platforms config
│       │   │   └── features.ts        ← feature flags
│       │   ├── utils/
│       │   │   ├── currency.ts        ← parseIndonesianAmount(), formatRupiah()
│       │   │   ├── date.ts            ← date helpers
│       │   │   └── validation.ts      ← zod schemas
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── workers/
│   └── api/                           ← Cloudflare Worker (Hono.js)
│       ├── src/
│       │   ├── index.ts               ← Hono app entry + cron handler
│       │   ├── routes/                ← API routes (lihat Section 4)
│       │   ├── middleware/            ← Auth, rate limit, etc.
│       │   ├── services/             ← Business logic (lihat Section 5)
│       │   ├── parsers/              ← Email parsers (lihat Section 9)
│       │   ├── lib/                  ← JWT, crypto, D1 helpers
│       │   └── types.ts              ← Worker-specific types (Env, etc.)
│       ├── migrations/               ← D1 SQL migrations
│       │   ├── 0001_initial.sql
│       │   └── 0002_add_wallets.sql
│       ├── tests/                    ← Vitest tests
│       │   ├── parsers/              ← Parser unit tests
│       │   └── services/             ← Service tests
│       ├── wrangler.toml
│       ├── package.json
│       └── tsconfig.json
│
└── docs/
    ├── privacy-policy.md
    ├── terms-of-service.md
    └── api-reference.md               ← Auto-generate dari route files
```

---

## 3. CLAUDE.md — AI Agent Instructions

File ini WAJIB ada di root project. AI agent baca ini pertama sebelum ngapa-ngapain.

```markdown
# CLAUDE.md — DuitKu Project Guide

## Quick Start
- `npm install` di root (workspaces)
- `cd workers/api && npx wrangler dev` → API di localhost:8787
- `cd apps/mobile && npx expo start` → Mobile app

## Architecture Rules
1. Types SELALU didefinisikan di `packages/shared/src/types/`
2. API routes SELALU di `workers/api/src/routes/` — 1 file per domain
3. Business logic SELALU di `workers/api/src/services/` — BUKAN di routes
4. Email parsers SELALU di `workers/api/src/parsers/` — 1 file per platform
5. Mobile screens SELALU di `apps/mobile/app/` (expo-router file-based)
6. Feature modules SELALU di `apps/mobile/features/` — 1 folder per feature
7. Semua monetary values disimpan sebagai INTEGER (dalam satuan Rupiah, bukan float)

## Adding a New API Endpoint
1. Tambah route di `workers/api/src/routes/{domain}.ts`
2. Tambah service function di `workers/api/src/services/{domain}.ts`
3. Tambah types di `packages/shared/src/types/{domain}.ts`
4. Route hanya handle HTTP (parse input, call service, return response)
5. Service handle business logic (query DB, validate, transform)

## Adding a New Email Parser
1. Copy `workers/api/src/parsers/_template.ts`
2. Rename ke `{platform}.ts`
3. Implement `senderPatterns` dan `parse()`
4. Register di `workers/api/src/parsers/index.ts`
5. Tambah test di `workers/api/tests/parsers/{platform}.test.ts`
6. Tambah platform config di `packages/shared/src/constants/platforms.ts`

## Adding a New Mobile Screen
1. Buat file di `apps/mobile/app/(tabs)/{section}/{screen}.tsx`
2. Screen hanya render UI — data fetching via hooks
3. Business logic di `apps/mobile/features/{feature}/`

## Adding a New Feature Flag
1. Tambah di `packages/shared/src/constants/features.ts`
2. Gunakan `useFeatureFlag(flag)` hook di mobile
3. Check `isFeatureEnabled(flag, user)` di worker service

## Database Conventions
- Tabel baru → buat migration file baru: `migrations/XXXX_{name}.sql`
- Semua tabel WAJIB punya: `id TEXT PRIMARY KEY`, `user_id TEXT`, `created_at TEXT`
- Soft delete pakai `is_deleted INTEGER DEFAULT 0`
- Monetary values pakai `INTEGER` (Rupiah, bukan float)
- Boolean pakai `INTEGER` (0/1)
- Timestamps pakai `TEXT` (ISO 8601)

## Naming Conventions
- Files: kebab-case (`grab-parser.ts`, `transaction-card.tsx`)
- Types: PascalCase (`Transaction`, `CreateTransactionInput`)
- Functions: camelCase (`createTransaction`, `parseGrabEmail`)
- DB tables: snake_case (`transactions`, `sync_logs`)
- DB columns: snake_case (`user_id`, `created_at`)
- API routes: kebab-case (`/transactions`, `/sync/trigger`)
- Env vars: UPPER_SNAKE_CASE (`JWT_SECRET`, `GOOGLE_CLIENT_ID`)

## Don't
- JANGAN taruh business logic di route files
- JANGAN buat type baru di mobile app — selalu di shared/
- JANGAN hardcode feature availability — pakai feature flags
- JANGAN pakai REAL/FLOAT untuk uang — pakai INTEGER (Rupiah)
- JANGAN edit migration yang sudah dijalankan — buat migration baru
```

---

## 4. API Route Convention

### Pattern: 1 file per domain, thin routes

```
workers/api/src/routes/
├── auth.ts              ← /auth/*
├── transactions.ts      ← /transactions/*
├── categories.ts        ← /categories/*
├── budgets.ts           ← /budgets/*
├── sync.ts              ← /sync/*
├── recurring.ts         ← /recurring/*
├── insights.ts          ← /insights/*
├── export.ts            ← /export/*
├── wallets.ts           ← /wallets/*
├── upload.ts            ← /upload/*
└── index.ts             ← registers all routes
```

### Route File Template

```typescript
// workers/api/src/routes/transactions.ts

import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { authMiddleware } from '../middleware/auth';
import * as transactionService from '../services/transactions';

const app = new Hono<AppEnv>();

// Middleware: semua routes butuh auth
app.use('/*', authMiddleware);

// GET /transactions — list with filters
app.get('/', async (c) => {
  const userId = c.get('userId');
  const query = {
    startDate: c.req.query('startDate'),
    endDate: c.req.query('endDate'),
    categoryId: c.req.query('categoryId'),
    source: c.req.query('source') as 'manual' | 'gmail_sync' | undefined,
    platform: c.req.query('platform'),
    page: Number(c.req.query('page') || 1),
    limit: Number(c.req.query('limit') || 20),
  };
  const result = await transactionService.list(c.env.DB, userId, query);
  return c.json(result);
});

// GET /transactions/:id
app.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const result = await transactionService.getById(c.env.DB, userId, id);
  if (!result) return c.json({ error: 'Not found' }, 404);
  return c.json(result);
});

// POST /transactions — create manual
app.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  // Validation via zod (from shared package)
  const result = await transactionService.create(c.env.DB, userId, body);
  return c.json(result, 201);
});

// PUT /transactions/:id — update
app.put('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = await c.req.json();
  const result = await transactionService.update(c.env.DB, userId, id, body);
  if (!result) return c.json({ error: 'Not found' }, 404);
  return c.json(result);
});

// DELETE /transactions/:id — soft delete
app.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  await transactionService.softDelete(c.env.DB, userId, id);
  return c.json({ success: true });
});

export default app;
```

### Route Registry (index.ts)

```typescript
// workers/api/src/routes/index.ts

import { Hono } from 'hono';
import type { AppEnv } from '../types';

import auth from './auth';
import transactions from './transactions';
import categories from './categories';
import budgets from './budgets';
import sync from './sync';
import recurring from './recurring';
import insights from './insights';
import exportRoutes from './export';
import wallets from './wallets';
import upload from './upload';

export function registerRoutes(app: Hono<AppEnv>) {
  app.route('/auth', auth);
  app.route('/transactions', transactions);
  app.route('/categories', categories);
  app.route('/budgets', budgets);
  app.route('/sync', sync);
  app.route('/recurring', recurring);
  app.route('/insights', insights);
  app.route('/export', exportRoutes);
  app.route('/wallets', wallets);
  app.route('/upload', upload);
}

// 🤖 AI AGENT: Untuk menambah route baru:
// 1. Buat file baru di folder ini
// 2. Import dan tambahkan app.route() di atas
// 3. Buat service file yang sesuai di ../services/
```

---

## 5. Service Layer Convention

### Pattern: Pure business logic, no HTTP concerns

```
workers/api/src/services/
├── transactions.ts      ← Transaction CRUD + filters
├── categories.ts        ← Category CRUD + defaults
├── budgets.ts           ← Budget CRUD + progress calculation
├── sync.ts              ← Gmail sync orchestrator
├── gmail.ts             ← Gmail API client (token refresh, fetch emails)
├── categorizer.ts       ← Auto-categorization engine
├── duplicate-detector.ts ← Duplicate detection
├── recurring-detector.ts ← Recurring pattern detection
├── insights.ts          ← Spending analytics
├── export.ts            ← Excel generation
├── wallets.ts           ← Wallet/account management
└── auth.ts              ← Token management, user creation
```

### Service File Template

```typescript
// workers/api/src/services/transactions.ts

import type { D1Database } from '@cloudflare/workers-types';
import type { Transaction, CreateTransactionInput, TransactionFilter } from '@duitku/shared';
import { generateId } from '../lib/id';

// ─── LIST ─────────────────────────────────
export async function list(
  db: D1Database,
  userId: string,
  filter: TransactionFilter
) {
  const { startDate, endDate, categoryId, source, platform, page, limit } = filter;
  
  let query = `SELECT * FROM transactions WHERE user_id = ? AND is_deleted = 0`;
  const params: any[] = [userId];
  
  if (startDate) { query += ` AND transaction_date >= ?`; params.push(startDate); }
  if (endDate) { query += ` AND transaction_date <= ?`; params.push(endDate); }
  if (categoryId) { query += ` AND category_id = ?`; params.push(categoryId); }
  if (source) { query += ` AND source = ?`; params.push(source); }
  if (platform) { query += ` AND platform = ?`; params.push(platform); }
  
  query += ` ORDER BY transaction_date DESC, created_at DESC`;
  query += ` LIMIT ? OFFSET ?`;
  params.push(limit, (page - 1) * limit);
  
  const results = await db.prepare(query).bind(...params).all();
  
  // Get total count for pagination
  let countQuery = `SELECT COUNT(*) as total FROM transactions WHERE user_id = ? AND is_deleted = 0`;
  const countParams: any[] = [userId];
  // ... same filters ...
  const countResult = await db.prepare(countQuery).bind(...countParams).first();
  
  return {
    data: results.results as Transaction[],
    pagination: {
      page,
      limit,
      total: countResult?.total as number || 0,
      totalPages: Math.ceil((countResult?.total as number || 0) / limit),
    }
  };
}

// ─── GET BY ID ────────────────────────────
export async function getById(
  db: D1Database,
  userId: string,
  id: string
): Promise<Transaction | null> {
  const result = await db
    .prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ? AND is_deleted = 0')
    .bind(id, userId)
    .first();
  return result as Transaction | null;
}

// ─── CREATE ───────────────────────────────
export async function create(
  db: D1Database,
  userId: string,
  input: CreateTransactionInput
): Promise<Transaction> {
  const id = generateId();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO transactions (id, user_id, category_id, amount, type, description, note, source, platform, transaction_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', NULL, ?, ?, ?)
  `).bind(id, userId, input.categoryId, input.amount, input.type, input.description, input.note || null, input.transactionDate, now, now).run();
  
  return getById(db, userId, id) as Promise<Transaction>;
}

// ─── UPDATE ───────────────────────────────
export async function update(
  db: D1Database,
  userId: string,
  id: string,
  input: Partial<CreateTransactionInput>
): Promise<Transaction | null> {
  const existing = await getById(db, userId, id);
  if (!existing) return null;
  
  const now = new Date().toISOString();
  await db.prepare(`
    UPDATE transactions 
    SET category_id = ?, amount = ?, description = ?, note = ?, transaction_date = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).bind(
    input.categoryId ?? existing.category_id,
    input.amount ?? existing.amount,
    input.description ?? existing.description,
    input.note ?? existing.note,
    input.transactionDate ?? existing.transaction_date,
    now, id, userId
  ).run();
  
  return getById(db, userId, id);
}

// ─── SOFT DELETE ──────────────────────────
export async function softDelete(
  db: D1Database,
  userId: string,
  id: string
): Promise<void> {
  await db.prepare(`
    UPDATE transactions SET is_deleted = 1, updated_at = ? WHERE id = ? AND user_id = ?
  `).bind(new Date().toISOString(), id, userId).run();
}
```

---

## 6. Shared Types Convention

### Pattern: Single source of truth, always in packages/shared

```typescript
// packages/shared/src/types/transaction.ts

// ─── Database Row ─────────────────────────
export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;           // INTEGER — Rupiah (bukan float!)
  currency: string;
  type: 'expense' | 'income';
  description: string;
  note: string | null;
  source: 'manual' | 'gmail_sync';
  platform: string | null;
  platform_ref: string | null;
  gmail_message_id: string | null;
  gmail_subject: string | null;
  raw_email_snippet: string | null;
  transaction_date: string;  // YYYY-MM-DD
  is_recurring: number;      // 0 or 1
  recurring_group_id: string | null;
  is_deleted: number;        // 0 or 1
  possible_duplicate_of: string | null;
  duplicate_resolved: number; // 0 or 1
  receipt_key: string | null;
  created_at: string;
  updated_at: string;
}

// ─── API Input Types ──────────────────────
export interface CreateTransactionInput {
  categoryId: string;
  amount: number;
  type: 'expense' | 'income';
  description: string;
  note?: string;
  transactionDate: string;    // YYYY-MM-DD
}

export interface UpdateTransactionInput {
  categoryId?: string;
  amount?: number;
  description?: string;
  note?: string;
  transactionDate?: string;
}

// ─── API Query/Filter Types ───────────────
export interface TransactionFilter {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  source?: 'manual' | 'gmail_sync';
  platform?: string;
  page: number;
  limit: number;
}

// ─── API Response Types ───────────────────
export interface TransactionListResponse {
  data: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Enriched Types (for UI) ──────────────
export interface TransactionWithCategory extends Transaction {
  category_name: string;
  category_icon: string;
  category_color: string;
}
```

```typescript
// packages/shared/src/types/index.ts
// 🤖 AI AGENT: Setiap type baru WAJIB di-export dari sini

export * from './transaction';
export * from './category';
export * from './budget';
export * from './user';
export * from './sync';
export * from './recurring';
export * from './wallet';
export * from './api';       // generic API response wrappers
```

---

## 7. Email Parser Convention

### Pattern: 1 file per platform, implements EmailParser interface

```
workers/api/src/parsers/
├── _template.ts         ← 🤖 Copy this to add new parser
├── index.ts             ← Parser registry (auto-discovers)
├── types.ts             ← Parser interfaces
├── grab.ts
├── gojek.ts
├── shopee.ts
├── tokopedia.ts
├── ovo.ts
├── dana.ts
├── gopay.ts
├── shopeepay.ts
├── bank-bca.ts
├── bank-mandiri.ts
├── bank-bri.ts
└── bank-bni.ts
```

### Parser Interface

```typescript
// workers/api/src/parsers/types.ts

export interface ParsedTransaction {
  amount: number;            // INTEGER Rupiah
  currency: string;          // 'IDR'
  description: string;       // human-readable description
  merchant?: string;         // merchant/seller name
  platform: string;          // platform identifier (lowercase)
  platformRef?: string;      // order ID / invoice number
  transactionDate: string;   // YYYY-MM-DD
  categoryHint: CategoryHint; // helps auto-categorization
}

export type CategoryHint =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'subscription'
  | 'topup'
  | 'transfer'
  | 'bills'
  | 'entertainment'
  | 'health'
  | 'education'
  | 'other';

export interface EmailParser {
  /** Unique platform identifier (lowercase, kebab-case) */
  platform: string;
  
  /** Display name for UI */
  displayName: string;
  
  /** Regex patterns to match sender email address */
  senderPatterns: RegExp[];
  
  /** Parse email body + subject into transaction data */
  parse(email: EmailInput): ParsedTransaction | null;
}

export interface EmailInput {
  from: string;
  subject: string;
  body: string;         // HTML body
  textBody?: string;    // plain text body (if available)
  date: string;         // email received date
  messageId: string;    // Gmail message ID
}
```

### Parser Template

```typescript
// workers/api/src/parsers/_template.ts
//
// 🤖 AI AGENT: Copy this file to create a new parser.
//
// Steps:
// 1. Copy this file → rename to {platform}.ts
// 2. Update platform, displayName, senderPatterns
// 3. Implement parse() logic
// 4. Register in ./index.ts
// 5. Add test in ../../tests/parsers/{platform}.test.ts
// 6. Add platform to packages/shared/src/constants/platforms.ts

import type { EmailParser, EmailInput, ParsedTransaction } from './types';
import { parseIndonesianAmount, extractDate } from './helpers';

export const parser: EmailParser = {
  platform: 'platform-name',       // lowercase, kebab-case
  displayName: 'Platform Name',     // for UI display
  
  senderPatterns: [
    /no-reply@platform\.com/i,
    /noreply@platform\.co\.id/i,
  ],

  parse(email: EmailInput): ParsedTransaction | null {
    const { body, subject, date } = email;

    // 1. Extract amount
    const amountMatch = body.match(/Rp\s?[\d.,]+/i);
    if (!amountMatch) return null;
    const amount = parseIndonesianAmount(amountMatch[0]);
    if (amount <= 0) return null;

    // 2. Extract description/merchant
    const description = 'TODO: extract from email';

    // 3. Extract reference/order ID
    const platformRef = undefined; // TODO

    // 4. Extract or fallback date
    const transactionDate = extractDate(body) || date.split('T')[0];

    // 5. Determine category hint
    const categoryHint = 'other' as const;

    return {
      amount,
      currency: 'IDR',
      description,
      platform: this.platform,
      platformRef,
      transactionDate,
      categoryHint,
    };
  },
};
```

### Parser Registry

```typescript
// workers/api/src/parsers/index.ts

import type { EmailParser, EmailInput, ParsedTransaction } from './types';

// 🤖 AI AGENT: Import dan tambahkan parser baru di sini
import { parser as grabParser } from './grab';
import { parser as gojekParser } from './gojek';
import { parser as shopeeParser } from './shopee';
import { parser as tokopediaParser } from './tokopedia';
import { parser as ovoParser } from './ovo';
import { parser as danaParser } from './dana';
import { parser as bcaParser } from './bank-bca';
import { parser as mandiriParser } from './bank-mandiri';

// ─── Registry ─────────────────────────────
const parsers: EmailParser[] = [
  grabParser,
  gojekParser,
  shopeeParser,
  tokopediaParser,
  ovoParser,
  danaParser,
  bcaParser,
  mandiriParser,
  // 🤖 AI AGENT: Tambahkan parser baru di sini
];

// ─── Lookup Functions ─────────────────────
export function findParser(fromEmail: string): EmailParser | null {
  return parsers.find(p => 
    p.senderPatterns.some(pattern => pattern.test(fromEmail))
  ) || null;
}

export function parseEmail(email: EmailInput): ParsedTransaction | null {
  const parser = findParser(email.from);
  if (!parser) return null;
  return parser.parse(email);
}

export function getAllParsers(): EmailParser[] {
  return [...parsers];
}

export function getSupportedPlatforms(): string[] {
  return parsers.map(p => p.platform);
}
```

---

## 8. Feature Flag System

### Pattern: Flags defined in shared, checked in both Worker and Mobile

```typescript
// packages/shared/src/constants/features.ts

export enum Feature {
  // ─── Free Features ──────────────────────
  MANUAL_TRANSACTIONS = 'manual_transactions',
  GMAIL_SYNC = 'gmail_sync',
  BASIC_CATEGORIES = 'basic_categories',
  BASIC_BUDGET = 'basic_budget',
  BASIC_INSIGHTS = 'basic_insights',
  
  // ─── Premium Features (Phase 3) ────────
  UNLIMITED_CATEGORIES = 'unlimited_categories',
  ADVANCED_INSIGHTS = 'advanced_insights',
  EXPORT_EXCEL = 'export_excel',
  RECURRING_DETECTION = 'recurring_detection',
  MULTI_CURRENCY = 'multi_currency',
  RECEIPT_OCR = 'receipt_ocr',
  FAMILY_BUDGET = 'family_budget',
  AI_ADVISOR = 'ai_advisor',
  
  // ─── Experimental / Beta ────────────────
  BANK_SYNC = 'bank_sync',
  WHATSAPP_BOT = 'whatsapp_bot',
  CRYPTO_TRACKING = 'crypto_tracking',
}

export type UserTier = 'free' | 'premium' | 'admin';

// ─── Feature Access Matrix ────────────────
const featureAccess: Record<Feature, UserTier[]> = {
  // Free
  [Feature.MANUAL_TRANSACTIONS]: ['free', 'premium', 'admin'],
  [Feature.GMAIL_SYNC]: ['free', 'premium', 'admin'],
  [Feature.BASIC_CATEGORIES]: ['free', 'premium', 'admin'],
  [Feature.BASIC_BUDGET]: ['free', 'premium', 'admin'],
  [Feature.BASIC_INSIGHTS]: ['free', 'premium', 'admin'],
  
  // Premium
  [Feature.UNLIMITED_CATEGORIES]: ['premium', 'admin'],
  [Feature.ADVANCED_INSIGHTS]: ['premium', 'admin'],
  [Feature.EXPORT_EXCEL]: ['premium', 'admin'],
  [Feature.RECURRING_DETECTION]: ['premium', 'admin'],
  [Feature.MULTI_CURRENCY]: ['premium', 'admin'],
  [Feature.RECEIPT_OCR]: ['premium', 'admin'],
  [Feature.FAMILY_BUDGET]: ['premium', 'admin'],
  [Feature.AI_ADVISOR]: ['premium', 'admin'],
  
  // Beta (admin only for now)
  [Feature.BANK_SYNC]: ['admin'],
  [Feature.WHATSAPP_BOT]: ['admin'],
  [Feature.CRYPTO_TRACKING]: ['admin'],
};

// ─── Free Tier Limits ─────────────────────
export const FREE_LIMITS = {
  maxCategories: 8,
  maxBudgets: 8,
  syncFrequencyHours: 12,     // premium: 1 hour
  insightsMonthsBack: 1,      // premium: 12
  maxWallets: 3,              // premium: unlimited
} as const;

export const PREMIUM_LIMITS = {
  maxCategories: Infinity,
  maxBudgets: Infinity,
  syncFrequencyHours: 1,
  insightsMonthsBack: 12,
  maxWallets: Infinity,
} as const;

// ─── Check Functions ──────────────────────
export function isFeatureEnabled(feature: Feature, tier: UserTier): boolean {
  return featureAccess[feature]?.includes(tier) ?? false;
}

export function getLimits(tier: UserTier) {
  return tier === 'free' ? FREE_LIMITS : PREMIUM_LIMITS;
}

// 🤖 AI AGENT: Untuk menambah feature flag baru:
// 1. Tambah enum value di Feature
// 2. Tambah access rule di featureAccess
// 3. (Optional) tambah limit di FREE_LIMITS / PREMIUM_LIMITS
// 4. Gunakan isFeatureEnabled() di worker service
// 5. Gunakan useFeatureFlag() hook di mobile
```

### Usage in Worker

```typescript
// workers/api/src/services/export.ts
import { Feature, isFeatureEnabled } from '@duitku/shared';

export async function exportToExcel(db: D1Database, userId: string, userTier: UserTier) {
  if (!isFeatureEnabled(Feature.EXPORT_EXCEL, userTier)) {
    throw new AppError('PREMIUM_REQUIRED', 'Export Excel adalah fitur premium');
  }
  // ... actual export logic
}
```

### Usage in Mobile

```typescript
// apps/mobile/hooks/useFeatureFlag.ts
import { Feature, isFeatureEnabled, UserTier } from '@duitku/shared';
import { useAuthStore } from '../stores/auth-store';

export function useFeatureFlag(feature: Feature): boolean {
  const tier = useAuthStore(s => s.user?.tier ?? 'free');
  return isFeatureEnabled(feature, tier as UserTier);
}

export function useFeatureLimits() {
  const tier = useAuthStore(s => s.user?.tier ?? 'free');
  return getLimits(tier as UserTier);
}
```

```tsx
// In a component:
function ExportButton() {
  const canExport = useFeatureFlag(Feature.EXPORT_EXCEL);
  
  if (!canExport) {
    return <PremiumBadge feature="Export Excel" />;
  }
  
  return <Button onPress={handleExport}>Export .xlsx</Button>;
}
```

---

## 9. Mobile Feature Modules Convention

### Pattern: Feature-based organization, not type-based

```
apps/mobile/features/
├── transactions/
│   ├── hooks/
│   │   ├── use-transactions.ts       ← data fetching (tanstack-query)
│   │   ├── use-create-transaction.ts ← mutation
│   │   └── use-delete-transaction.ts
│   ├── components/
│   │   ├── transaction-card.tsx
│   │   ├── transaction-filters.tsx
│   │   └── source-badge.tsx
│   └── utils/
│       └── format-transaction.ts
│
├── sync/
│   ├── hooks/
│   │   ├── use-sync-status.ts
│   │   └── use-trigger-sync.ts
│   ├── components/
│   │   ├── sync-banner.tsx
│   │   └── sync-history.tsx
│   └── index.ts
│
├── budget/
│   ├── hooks/
│   │   ├── use-budgets.ts
│   │   └── use-budget-progress.ts
│   ├── components/
│   │   ├── budget-progress-bar.tsx
│   │   └── budget-alert-banner.tsx
│   └── index.ts
│
├── insights/
│   ├── hooks/
│   │   └── use-monthly-insights.ts
│   ├── components/
│   │   ├── expense-pie-chart.tsx
│   │   ├── spending-trend-line.tsx
│   │   └── insight-card.tsx
│   └── index.ts
│
├── wallet/
│   ├── hooks/
│   │   └── use-wallets.ts
│   ├── components/
│   │   └── wallet-card.tsx
│   └── index.ts
│
└── recurring/
    ├── hooks/
    │   └── use-recurring.ts
    ├── components/
    │   └── recurring-card.tsx
    └── index.ts
```

### Hook Template (TanStack Query)

```typescript
// apps/mobile/features/transactions/hooks/use-transactions.ts

import { useQuery } from '@tanstack/react-query';
import type { TransactionFilter, TransactionListResponse } from '@duitku/shared';
import { api } from '../../../lib/api';

export function useTransactions(filter: TransactionFilter) {
  return useQuery<TransactionListResponse>({
    queryKey: ['transactions', filter],
    queryFn: () => api.get('/transactions', { params: filter }),
  });
}

// 🤖 AI AGENT: Pattern untuk semua data fetching hooks:
// 1. Pakai useQuery untuk GET, useMutation untuk POST/PUT/DELETE
// 2. queryKey selalu array: ['domain', ...params]
// 3. Return type selalu dari @duitku/shared
// 4. API calls via lib/api.ts (pre-configured fetch wrapper)
```

---

## 10. API Client (Mobile)

```typescript
// apps/mobile/lib/api.ts

import * as SecureStore from 'expo-secure-store';

const BASE_URL = __DEV__
  ? 'http://localhost:8787'
  : 'https://api.duitku.app';

class ApiClient {
  private async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync('access_token');
  }

  private async refreshToken(): Promise<string> {
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json();
    await SecureStore.setItemAsync('access_token', data.accessToken);
    await SecureStore.setItemAsync('refresh_token', data.refreshToken);
    return data.accessToken;
  }

  async request<T>(path: string, options: RequestInit & { params?: Record<string, any> } = {}): Promise<T> {
    let token = await this.getToken();
    const { params, ...fetchOptions } = options;
    
    // Build URL with query params
    let url = `${BASE_URL}${path}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) searchParams.set(k, String(v));
      });
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    // First attempt
    let res = await fetch(url, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...fetchOptions.headers,
      },
    });

    // Auto-refresh on 401
    if (res.status === 401) {
      token = await this.refreshToken();
      res = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...fetchOptions.headers,
        },
      });
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(res.status, error.error || 'Request failed', error.code);
    }

    return res.json();
  }

  get<T>(path: string, options?: { params?: Record<string, any> }): Promise<T> {
    return this.request<T>(path, { method: 'GET', ...options });
  }

  post<T>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }

  put<T>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = new ApiClient();
```

---

## 11. Error Handling Convention

### Worker Errors

```typescript
// workers/api/src/lib/errors.ts

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
    public details?: any,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Pre-defined errors
export const Errors = {
  UNAUTHORIZED: () => new AppError('UNAUTHORIZED', 'Unauthorized', 401),
  FORBIDDEN: () => new AppError('FORBIDDEN', 'Forbidden', 403),
  NOT_FOUND: (entity: string) => new AppError('NOT_FOUND', `${entity} not found`, 404),
  VALIDATION: (msg: string) => new AppError('VALIDATION_ERROR', msg, 400),
  PREMIUM_REQUIRED: (feature: string) => new AppError('PREMIUM_REQUIRED', `${feature} requires premium`, 403),
  RATE_LIMITED: () => new AppError('RATE_LIMITED', 'Too many requests', 429),
  SYNC_FAILED: (msg: string) => new AppError('SYNC_FAILED', msg, 500),
} as const;

// 🤖 AI AGENT: Tambahkan error baru di sini, jangan throw Error() langsung
```

### Global Error Handler

```typescript
// workers/api/src/middleware/error-handler.ts

import { Context } from 'hono';
import { AppError } from '../lib/errors';

export async function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json({
      error: err.message,
      code: err.code,
      details: err.details,
    }, err.status as any);
  }
  
  // Unexpected error
  console.error('Unhandled error:', err);
  return c.json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  }, 500);
}
```

---

## 12. Database Migration Convention

### Pattern: Sequential numbered files, never edit existing ones

```
workers/api/migrations/
├── 0001_initial.sql            ← Core tables
├── 0002_add_wallets.sql        ← Wallet feature
├── 0003_add_user_tier.sql      ← Premium feature
├── 0004_add_family_groups.sql  ← Family budget feature
└── ...
```

### Migration File Template

```sql
-- migrations/XXXX_{description}.sql
-- 🤖 AI AGENT: JANGAN edit migration yang sudah dijalankan!
--              Selalu buat file baru.
--
-- Description: {what this migration does}
-- Date: {YYYY-MM-DD}

-- ── UP ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bank', 'ewallet', 'cash')),
  balance INTEGER DEFAULT 0,    -- Rupiah (integer, bukan float!)
  icon TEXT,
  color TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id, is_active);
```

### Running Migrations

```bash
# Apply all migrations
npx wrangler d1 migrations apply duitku-db

# Apply to local dev
npx wrangler d1 migrations apply duitku-db --local
```

---

## 13. Testing Convention

```
workers/api/tests/
├── parsers/
│   ├── grab.test.ts            ← Sample email → expected output
│   ├── gojek.test.ts
│   ├── shopee.test.ts
│   └── fixtures/               ← Real email samples (anonymized)
│       ├── grab-food-1.html
│       ├── grab-ride-1.html
│       ├── shopee-order-1.html
│       └── ...
├── services/
│   ├── transactions.test.ts
│   ├── categorizer.test.ts
│   └── duplicate-detector.test.ts
└── setup.ts                    ← Test DB setup
```

### Parser Test Template

```typescript
// workers/api/tests/parsers/grab.test.ts
import { describe, it, expect } from 'vitest';
import { parser } from '../../src/parsers/grab';
import { readFixture } from '../helpers';

describe('Grab Parser', () => {
  it('should match grab sender emails', () => {
    expect(parser.senderPatterns.some(p => p.test('no-reply@grab.com'))).toBe(true);
    expect(parser.senderPatterns.some(p => p.test('random@other.com'))).toBe(false);
  });

  it('should parse GrabFood receipt', () => {
    const email = {
      from: 'no-reply@grab.com',
      subject: 'Your GrabFood receipt',
      body: readFixture('grab-food-1.html'),
      date: '2026-03-25T12:00:00Z',
      messageId: 'test-123',
    };
    
    const result = parser.parse(email);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(45000);
    expect(result!.categoryHint).toBe('food');
    expect(result!.platform).toBe('grab');
  });

  it('should parse GrabCar receipt', () => {
    // ...
  });

  it('should return null for unparseable email', () => {
    const email = {
      from: 'no-reply@grab.com',
      subject: 'Welcome to Grab',
      body: '<p>Welcome!</p>',  // No transaction data
      date: '2026-03-25T12:00:00Z',
      messageId: 'test-456',
    };
    
    const result = parser.parse(email);
    expect(result).toBeNull();
  });
});
```

---

## 14. Deployment & Environment

### Wrangler Config

```toml
# workers/api/wrangler.toml

name = "duitku-api"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[triggers]
crons = ["0 */6 * * *"]    # Gmail sync every 6 hours

# ─── D1 Database ─────────────────────────
[[d1_databases]]
binding = "DB"
database_name = "duitku-db"
database_id = "xxx-xxx-xxx"
migrations_dir = "migrations"

# ─── R2 Storage ──────────────────────────
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "duitku-files"

# ─── KV Namespace ────────────────────────
[[kv_namespaces]]
binding = "KV"
id = "xxx-xxx-xxx"

# ─── Environment Variables ───────────────
[vars]
ENVIRONMENT = "production"
APP_URL = "https://duitku.app"

# ─── Secrets (set via CLI) ───────────────
# wrangler secret put JWT_SECRET
# wrangler secret put GOOGLE_CLIENT_ID
# wrangler secret put GOOGLE_CLIENT_SECRET
# wrangler secret put ENCRYPTION_KEY
```

### Worker Env Types

```typescript
// workers/api/src/types.ts

export interface Env {
  // Bindings
  DB: D1Database;
  STORAGE: R2Bucket;
  KV: KVNamespace;
  
  // Secrets
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  ENCRYPTION_KEY: string;
  
  // Vars
  ENVIRONMENT: 'development' | 'production';
  APP_URL: string;
}

export type AppEnv = { Bindings: Env; Variables: { userId: string } };
```

---

## 15. Checklist: Adding a New Feature End-to-End

```
🤖 AI AGENT CHECKLIST — New Feature

□ 1. TYPES
  → packages/shared/src/types/{feature}.ts
  → Export from packages/shared/src/types/index.ts

□ 2. DATABASE (if needed)
  → New migration: workers/api/migrations/XXXX_{feature}.sql
  → NEVER edit existing migrations

□ 3. SERVICE
  → workers/api/src/services/{feature}.ts
  → Pure business logic, receives DB + userId + input
  → Use AppError for errors

□ 4. ROUTE
  → workers/api/src/routes/{feature}.ts
  → Thin: parse input → call service → return JSON
  → Register in workers/api/src/routes/index.ts

□ 5. FEATURE FLAG (if premium)
  → packages/shared/src/constants/features.ts
  → Add enum + access rule

□ 6. MOBILE HOOK
  → apps/mobile/features/{feature}/hooks/use-{feature}.ts
  → useQuery for GET, useMutation for POST/PUT/DELETE

□ 7. MOBILE COMPONENT
  → apps/mobile/features/{feature}/components/{component}.tsx

□ 8. MOBILE SCREEN (if new page)
  → apps/mobile/app/(tabs)/{section}/{screen}.tsx
  → Screen only renders, data via hooks

□ 9. TESTS
  → workers/api/tests/services/{feature}.test.ts
  → workers/api/tests/parsers/{parser}.test.ts (if parser)

□ 10. DOCUMENTATION
  → Update CLAUDE.md if new conventions introduced
  → Update docs/api-reference.md
```

---

## 16. Summary: Why This Structure Works for AI Agents

| Principle | Implementation |
|-----------|---------------|
| **Predictable** | Every feature follows the same file structure pattern |
| **Discoverable** | CLAUDE.md tells the AI where everything lives |
| **Isolated** | Changing a parser can't break budget logic |
| **Templated** | `_template.ts` files for common patterns (parsers, hooks) |
| **Type-safe** | Single source of truth in `packages/shared` |
| **Incrementally growable** | Feature flags + migrations = safe additions |
| **Testable** | Each layer can be tested independently |
| **Self-documenting** | Comments marked with 🤖 guide AI agents specifically |

```
The goal: "Tambahkan parser untuk Traveloka"
AI reads CLAUDE.md → copies _template.ts → implements → registers → writes test → done.
No ambiguity. No "where should I put this?" moments.
```
