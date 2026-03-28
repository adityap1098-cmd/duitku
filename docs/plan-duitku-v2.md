# DuitKu — Personal Finance Tracker with Gmail Auto-Sync
## Project Plan & Implementation Spec

**Version:** 2.0
**Author:** Adit
**Stack:** React Native (Expo) + Cloudflare (Workers + D1 + R2) + Gmail API
**Target:** iOS & Android
**Cost:** $0/month (Cloudflare free tier permanent)

---

## 1. Problem Statement

Pengeluaran digital di Indonesia tersebar di banyak platform (Grab, Gojek, Shopee, Tokopedia, OVO, GoPay, Dana, ShopeePay) dan semuanya mengirim receipt/notifikasi ke email. Saat ini tidak ada cara mudah untuk:
- Otomatis mencatat semua pengeluaran dari berbagai platform
- Mengkategorikan pengeluaran secara cerdas
- Melihat ke mana uang habis setiap bulan
- Mengontrol budget per kategori

---

## 2. Core Features

### 2.1 Gmail Auto-Sync Engine
- OAuth2 login via Google (Gmail read-only scope)
- Background sync membaca email transaksi dari platform yang didukung
- Email parser per platform (regex + pattern matching)
- Interval sync: on-demand + periodic (via Cron Triggers)
- Incremental sync (hanya email baru sejak last sync)

### 2.2 Supported Platforms & Email Patterns

| Platform | Email Sender | Data yang Di-extract |
|----------|-------------|---------------------|
| **Grab** | `no-reply@grab.com` | Amount, service type (GrabFood/GrabCar/GrabBike), merchant, date |
| **Gojek** | `no-reply@go-jek.com` | Amount, service type (GoFood/GoRide/GoCar), merchant, date |
| **Shopee** | `no-reply@shopee.co.id` | Amount, item names, seller, order ID, date |
| **Tokopedia** | `*@tokopedia.com` | Amount, item names, seller, invoice number, date |
| **OVO** | `*@ovo.id` | Amount, merchant, transaction type, date |
| **GoPay** | (via Gojek emails) | Amount, top-up/payment, merchant, date |
| **Dana** | `no-reply@dana.id` | Amount, merchant, transaction type, date |
| **ShopeePay** | (via Shopee emails) | Amount, merchant, payment type, date |
| **Notif Bank** | Bank-specific senders | Amount, description, balance (BCA, Mandiri, BRI, BNI) |

> **Note:** Email format bisa berubah. Parser harus modular agar mudah di-update. Fallback ke "Uncategorized" jika parsing gagal.

### 2.3 Auto-Categorization

Setiap transaksi otomatis dikategorikan berdasarkan source + context:

| Category | Sources |
|----------|---------|
| 🍔 Makanan & Minuman | GrabFood, GoFood, merchant F&B di Shopee/Tokped |
| 🚗 Transportasi | GrabCar/Bike, GoRide/Car |
| 🛒 Belanja Online | Shopee, Tokopedia (non-food) |
| 💳 Langganan/Subscription | Netflix, Spotify, YouTube Premium, domain, hosting |
| 📱 Pulsa & Data | Top-up via Grab/Gojek/Tokped/Shopee |
| 💰 Transfer & E-wallet | OVO, GoPay, Dana, ShopeePay top-up |
| 🏠 Tagihan | PLN, PDAM, internet, BPJS |
| 📦 Lainnya | Uncategorized / manual |

User bisa:
- Edit kategori per transaksi
- Buat custom category
- System belajar dari user corrections (simple rule-based, bukan ML)

### 2.4 Manual Input
- Quick-add: amount + kategori + note (minimal tap)
- Pilih dari preset kategori atau custom
- Optional: foto struk (stored di Cloudflare R2)
- Voice input amount (nice-to-have, phase 2)

### 2.5 Transaction Management (CRUD)
- View semua transaksi (synced + manual)
- Filter by: tanggal, kategori, source (synced/manual), platform
- Edit: amount, kategori, note, tanggal
- Delete: soft-delete dengan konfirmasi
- Bulk actions: multi-select → categorize / delete
- Badge indicator: "Synced from Gmail" vs "Manual"

### 2.6 Budget Limit & Alerts
- Set budget per kategori per bulan (e.g., Makanan: Rp 2.000.000)
- Set total budget bulanan
- Visual progress bar per kategori
- Push notification alert di 50%, 80%, 100% dari budget
- Carry-over option: sisa budget bisa rollover ke bulan depan

### 2.7 Recurring Transaction Detection
- Auto-detect pola pengeluaran berulang (Netflix tiap bulan, langganan hosting, dll)
- Tampilkan daftar recurring expenses dengan:
  - Nama langganan
  - Amount
  - Frequency (weekly/monthly/yearly)
  - Next expected date
- Alert jika ada langganan baru terdeteksi
- Alert jika langganan naik harga

### 2.8 Bank Notification Sync
- Parse email notifikasi dari BCA, Mandiri, BRI, BNI
- Extract: debit amount, description, remaining balance
- Auto-match dengan transaksi e-commerce jika ada (e.g., pembayaran Shopee via BCA)

### 2.9 Monthly Report & Export
- Dashboard ringkasan bulanan:
  - Total income vs expense
  - Expense breakdown by category (pie chart)
  - Trend line (daily spending)
  - Top 5 pengeluaran terbesar
  - Budget vs actual per kategori
- Export ke Excel (.xlsx):
  - Sheet 1: Summary
  - Sheet 2: Detail transaksi
  - Sheet 3: Budget vs Actual
  - Sheet 4: Recurring subscriptions
- Share via WhatsApp / email

---

## 3. Smart Features (Differentiators)

### 3.1 Duplicate Detection
- Problem: Bayar Shopee via GoPay → 2 email (Shopee receipt + GoPay payment)
- Solution: Match by amount + timestamp (±5 menit) + cross-platform flag
- UI: Tampilkan "Possible duplicate" badge, user confirm merge/keep

### 3.2 Uncategorized Inbox
- Transaksi yang parser nggak yakin → masuk ke "Review Inbox"
- User categorize → system simpan rule untuk pattern serupa
- Inbox count badge di home screen
- Weekly reminder jika ada transaksi belum di-review

### 3.3 Spending Insights
- "Kamu habiskan 40% lebih banyak untuk GrabFood bulan ini vs bulan lalu"
- "Langganan bulanan kamu total Rp 500.000/bulan"
- "Pengeluaran Shopee kamu naik 3 bulan berturut-turut"
- Simple rule-based comparisons (month-over-month, category trends)

### 3.4 Multi-Currency Support (Phase 2)
- Deteksi transaksi dalam USD/SGD (e.g., App Store, subscription luar)
- Auto-convert ke IDR berdasarkan rate saat transaksi

---

## 4. Tech Stack & Architecture

### 4.1 Frontend — React Native (Expo)
```
React Native (Expo SDK 52+)
├── expo-router              → File-based navigation
├── expo-secure-store        → Token storage (JWT, refresh tokens)
├── expo-notifications       → Push notifications (budget alerts)
├── expo-local-authentication → Biometric lock (FaceID/Fingerprint)
├── expo-file-system         → Excel export handling
├── expo-sharing             → Share reports via WA/email
├── react-native-reanimated  → Smooth animations
├── react-native-chart-kit   → Charts (pie, line, bar)
│   OR victory-native
├── zustand                  → State management
├── tanstack/react-query     → API caching + background refetch
└── expo-image-picker        → Receipt photo capture
```

### 4.2 Backend — Cloudflare (100% Free Tier)

```
Cloudflare
├── Workers          → REST API + Gmail sync logic
│   ├── Hono.js     → Lightweight API framework (Express-like)
│   ├── JWT auth    → Manual Google OAuth2 + session management
│   └── Cron Triggers → Scheduled Gmail sync (setiap 6 jam)
│
├── D1 (SQLite)      → Primary database
│   ├── 5GB storage (free)
│   ├── 5M rows read/day (free)
│   ├── 100K rows written/day (free)
│   └── Familiar SQLite syntax
│
├── R2 (Object Storage) → Receipt photos + exported files
│   ├── 10GB storage (free)
│   ├── 1M class A ops/month (free — PUT, POST)
│   ├── 10M class B ops/month (free — GET)
│   └── Zero egress fees (always free!)
│
├── KV (Key-Value)   → Session cache, rate limiting
│   ├── 100K reads/day (free)
│   └── 1K writes/day (free)
│
└── Email Workers     → (Optional) receive webhook emails
```

### 4.3 Why Cloudflare > Supabase (for this project)

| Aspect | Cloudflare | Supabase Free |
|--------|-----------|---------------|
| Auto-pause? | ❌ Never pauses | ⚠️ Pauses after 1 week inactive |
| Project limit | Unlimited | 2 projects only |
| DB storage | 5GB (D1) | 500MB |
| File storage | 10GB (R2) + zero egress | 1GB + 2GB bandwidth |
| API requests | 100K/day (Workers) | 500K/month (Edge) |
| Cron/scheduled | Built-in Cron Triggers | Needs pg_cron (limited) |
| Cost if scale | Pay-as-you-go (cheap) | $25/mo jump (Pro plan) |
| Auth built-in? | ❌ Manual (Google OAuth2) | ✅ Built-in |
| Realtime? | ❌ Needs polling/SSE | ✅ Built-in |

> **Trade-off:** Auth dan Realtime harus dibangun manual. Tapi untuk app ini, Google OAuth2 straightforward dan realtime nggak critical.

### 4.4 External APIs
```
├── Gmail API (read-only)    → Fetch transaction emails
├── Google OAuth2            → Authentication (login + Gmail consent)
├── Google Cloud Console     → OAuth client ID (free)
└── ExchangeRate API         → Currency conversion (phase 2)
```

### 4.5 Architecture Diagram
```
┌──────────────────────────────────────────────────────┐
│                React Native App (Expo)                │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌─────────┐ │
│  │Dashboard │ │Transaksi │ │ Budget  │ │ Profile │ │
│  │  Screen  │ │  Screen  │ │ Screen  │ │ Screen  │ │
│  └────┬─────┘ └────┬─────┘ └────┬────┘ └────┬────┘ │
│       └─────────────┼────────────┘           │       │
│                     │                         │       │
│           ┌─────────┴─────────┐               │       │
│           │ Zustand + TanStack│               │       │
│           │   React Query     │               │       │
│           └─────────┬─────────┘               │       │
└─────────────────────┼─────────────────────────┘       │
                      │ HTTPS                            │
┌─────────────────────┼────────────────────────────────┐
│           Cloudflare Edge Network                     │
│                     │                                 │
│  ┌──────────────────┴────────────────────────┐       │
│  │         Workers (Hono.js API)             │       │
│  │                                            │       │
│  │  Routes:                                   │       │
│  │  ├── /auth/*        → Google OAuth flow    │       │
│  │  ├── /transactions  → CRUD + filters       │       │
│  │  ├── /categories    → CRUD                 │       │
│  │  ├── /budgets       → CRUD + progress      │       │
│  │  ├── /sync          → Trigger Gmail sync   │       │
│  │  ├── /recurring     → Subscription mgmt    │       │
│  │  ├── /insights      → Spending analytics   │       │
│  │  └── /export        → Generate .xlsx       │       │
│  │                                            │       │
│  │  Cron Triggers:                            │       │
│  │  └── Every 6 hours → Gmail auto-sync       │       │
│  └───┬──────────┬──────────┬─────────────────┘       │
│      │          │          │                          │
│  ┌───┴───┐  ┌──┴───┐  ┌──┴──┐  ┌────┐               │
│  │  D1   │  │  R2  │  │ KV  │  │    │               │
│  │SQLite │  │Files │  │Cache│  │    │               │
│  │       │  │      │  │     │  │    │               │
│  │users  │  │receipts│ │sessions│ │    │              │
│  │txns   │  │exports │ │tokens  │ │    │              │
│  │budget │  │      │  │rate_lim│ │    │              │
│  │rules  │  │      │  │     │  │    │               │
│  └───────┘  └──────┘  └─────┘  └────┘               │
│                                                       │
└───────────────────────┬───────────────────────────────┘
                        │
               ┌────────┴────────┐
               │   Gmail API     │
               │  (read-only)    │
               └─────────────────┘
```

---

## 5. Database Schema (D1 — SQLite)

### 5.1 Tables

```sql
-- ============================================================
-- DuitKu Database Schema — Cloudflare D1 (SQLite)
-- ============================================================

-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- UUID generated by Worker
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  google_id TEXT UNIQUE,                  -- Google OAuth sub
  gmail_connected INTEGER DEFAULT 0,      -- 0/1 boolean
  gmail_refresh_token TEXT,               -- encrypted
  gmail_last_history_id TEXT,             -- for incremental sync
  last_sync_at TEXT,                      -- ISO 8601 timestamp
  currency TEXT DEFAULT 'IDR',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Categories
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,                     -- emoji
  color TEXT NOT NULL,                    -- hex color
  is_default INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Transactions
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id),
  
  -- Core fields
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'IDR',
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  description TEXT,
  note TEXT,
  
  -- Source tracking
  source TEXT NOT NULL CHECK (source IN ('manual', 'gmail_sync')),
  platform TEXT,                          -- grab, gojek, shopee, tokopedia, ovo, etc.
  platform_ref TEXT,                      -- order ID / invoice number
  
  -- Gmail tracking
  gmail_message_id TEXT UNIQUE,           -- prevent duplicate sync
  gmail_subject TEXT,
  raw_email_snippet TEXT,                 -- for debugging parser
  
  -- Metadata
  transaction_date TEXT NOT NULL,         -- YYYY-MM-DD
  is_recurring INTEGER DEFAULT 0,
  recurring_group_id TEXT,
  is_deleted INTEGER DEFAULT 0,           -- soft delete
  
  -- Duplicate detection
  possible_duplicate_of TEXT,
  duplicate_resolved INTEGER DEFAULT 0,
  
  -- Receipt
  receipt_key TEXT,                        -- R2 object key
  
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Budget limits
CREATE TABLE budgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id),
  month TEXT NOT NULL,                     -- YYYY-MM-01
  limit_amount REAL NOT NULL,
  carry_over INTEGER DEFAULT 0,
  carry_over_amount REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  
  UNIQUE(user_id, category_id, month)
);

-- Recurring transactions
CREATE TABLE recurring_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id),
  description TEXT NOT NULL,
  platform TEXT,
  expected_amount REAL,
  frequency TEXT CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
  next_expected_date TEXT,
  last_detected_at TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Category rules (learned from user corrections)
CREATE TABLE category_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id),
  platform TEXT,
  keyword TEXT NOT NULL,                   -- match against description/merchant
  priority INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Sync logs
CREATE TABLE sync_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  emails_processed INTEGER DEFAULT 0,
  transactions_created INTEGER DEFAULT 0,
  errors TEXT DEFAULT '[]',                -- JSON array
  status TEXT CHECK (status IN ('running', 'completed', 'failed'))
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_txn_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_txn_user_category ON transactions(user_id, category_id);
CREATE INDEX idx_txn_gmail_msg ON transactions(gmail_message_id);
CREATE INDEX idx_txn_user_source ON transactions(user_id, source);
CREATE INDEX idx_txn_user_platform ON transactions(user_id, platform);
CREATE INDEX idx_txn_user_deleted ON transactions(user_id, is_deleted);
CREATE INDEX idx_budget_user_month ON budgets(user_id, month);
CREATE INDEX idx_rules_user_kw ON category_rules(user_id, platform, keyword);
CREATE INDEX idx_categories_user ON categories(user_id);
CREATE INDEX idx_recurring_user ON recurring_transactions(user_id, is_active);
```

### 5.2 D1 Notes (vs PostgreSQL)

| Aspect | D1 (SQLite) | PostgreSQL |
|--------|------------|------------|
| UUID generation | Generated in Worker (`crypto.randomUUID()`) | `gen_random_uuid()` |
| Boolean | INTEGER 0/1 | Native BOOLEAN |
| Timestamp | TEXT (ISO 8601) | TIMESTAMPTZ |
| JSON column | TEXT (parse in Worker) | Native JSONB |
| Row Level Security | Manual in Worker middleware | Built-in RLS |
| DECIMAL | REAL (float64) | DECIMAL(15,2) |

> **Penting:** Karena D1 pakai SQLite, semua auth & row-level access control dihandle di Worker middleware, bukan di database level.

---

## 6. Auth System (Manual Google OAuth2)

### 6.1 Auth Flow

```
┌──────────┐     ┌───────────────┐     ┌──────────────┐
│  App     │     │  Worker API   │     │  Google      │
│  (Expo)  │     │  /auth/*      │     │  OAuth2      │
└────┬─────┘     └──────┬────────┘     └──────┬───────┘
     │                   │                     │
     │ 1. Tap "Login     │                     │
     │    with Google"   │                     │
     │──────────────────>│                     │
     │                   │ 2. Redirect to      │
     │                   │    Google consent   │
     │                   │────────────────────>│
     │                   │                     │
     │    3. User grants │                     │
     │    gmail.readonly │                     │
     │<────────────────────────────────────────│
     │                   │                     │
     │ 4. Auth code      │                     │
     │──────────────────>│                     │
     │                   │ 5. Exchange code    │
     │                   │    for tokens       │
     │                   │────────────────────>│
     │                   │                     │
     │                   │ 6. access_token +   │
     │                   │    refresh_token    │
     │                   │<────────────────────│
     │                   │                     │
     │                   │ 7. Create/update user in D1
     │                   │    Store encrypted refresh_token
     │                   │    Generate JWT session token
     │                   │                     │
     │ 8. JWT token +    │                     │
     │    user profile   │                     │
     │<──────────────────│                     │
     │                   │                     │
     │ 9. Store JWT in   │                     │
     │    expo-secure-store                    │
     │                   │                     │
```

### 6.2 Token Management

```
┌─────────────────────────────────────────────────┐
│                  Token Strategy                  │
├──────────────────┬──────────────────────────────┤
│ JWT Session      │ Short-lived (15 min)         │
│                  │ Stored in expo-secure-store   │
│                  │ Contains: user_id, email      │
├──────────────────┼──────────────────────────────┤
│ Refresh Token    │ Long-lived (stored in KV)     │
│ (DuitKu)        │ Used to get new JWT           │
│                  │ Rotated on each refresh       │
├──────────────────┼──────────────────────────────┤
│ Google Refresh   │ Stored encrypted in D1        │
│ Token            │ Used for Gmail API access     │
│                  │ Only accessed by sync Worker  │
└──────────────────┴──────────────────────────────┘
```

### 6.3 Worker Middleware

```typescript
// Auth middleware — replaces Supabase RLS
async function authMiddleware(c: Context, next: Next) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  
  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    c.set('userId', payload.sub);
    await next();
  } catch {
    return c.json({ error: 'Token expired' }, 401);
  }
}

// Every DB query filtered by userId — manual RLS
const txns = await c.env.DB
  .prepare('SELECT * FROM transactions WHERE user_id = ? AND is_deleted = 0')
  .bind(c.get('userId'))
  .all();
```

---

## 7. Gmail Sync Engine (Worker + Cron)

### 7.1 Sync Flow

```
1. Trigger: User tap "Sync Now" OR Cron Trigger (every 6 hours)
2. Worker dipanggil
3. Ambil gmail_refresh_token dari D1 (decrypt)
4. Refresh Gmail access_token via Google OAuth2
5. Query Gmail API:
   - q: "from:(grab.com OR go-jek.com OR shopee.co.id OR tokopedia.com
         OR ovo.id OR dana.id) newer_than:7d"
   - Atau pakai historyId untuk incremental sync
6. Untuk setiap email:
   a. Check gmail_message_id di D1 → skip jika sudah ada
   b. Detect platform dari sender address
   c. Route ke platform-specific parser
   d. Extract: amount, merchant, date, category hint
   e. Run duplicate detection
   f. Auto-categorize (rules table → fallback default mapping)
   g. Insert ke transactions table
7. Update last_sync_at + gmail_last_history_id
8. Return sync summary ke app
```

### 7.2 Cron Trigger Config

```toml
# wrangler.toml
[triggers]
crons = ["0 */6 * * *"]  # Every 6 hours
```

```typescript
// Worker scheduled handler
export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    // Get all users with gmail_connected = 1
    const users = await env.DB
      .prepare('SELECT id, gmail_refresh_token FROM users WHERE gmail_connected = 1')
      .all();
    
    for (const user of users.results) {
      await syncGmailForUser(user, env);
    }
  },
  
  async fetch(request: Request, env: Env) {
    // ... Hono API routes
  }
}
```

### 7.3 Parser Architecture

```typescript
// Modular parser system
interface ParsedTransaction {
  amount: number;
  currency: string;
  description: string;
  merchant?: string;
  platform: string;
  platformRef?: string;
  transactionDate: string;    // YYYY-MM-DD
  categoryHint: string;       // "food", "transport", "shopping", etc.
}

interface EmailParser {
  platform: string;
  senderPatterns: RegExp[];
  parse(emailBody: string, subject: string): ParsedTransaction | null;
}

// Registry pattern
const parsers: EmailParser[] = [
  new GrabParser(),
  new GojekParser(),
  new ShopeeParser(),
  new TokopediaParser(),
  new OvoParser(),
  new DanaParser(),
  new BCAParser(),
  new MandiriParser(),
];

function parseEmail(from: string, body: string, subject: string): ParsedTransaction | null {
  for (const parser of parsers) {
    if (parser.senderPatterns.some(p => p.test(from))) {
      return parser.parse(body, subject);
    }
  }
  return null; // Unknown sender → skip
}
```

### 7.4 Example Parser: Grab

```typescript
class GrabParser implements EmailParser {
  platform = 'grab';
  senderPatterns = [/no-reply@grab\.com/i, /noreply@grab\.com/i];
  
  parse(body: string, subject: string): ParsedTransaction | null {
    // Detect service type from subject/body
    const isFood = /grabfood/i.test(subject) || /grabfood/i.test(body);
    const isRide = /grabcar|grabbike|grabride/i.test(subject);
    
    // Extract amount: "Rp 45.000" or "Rp45,000" etc.
    const amountMatch = body.match(/Rp\s?[\d.,]+/i);
    if (!amountMatch) return null;
    
    const amount = parseIndonesianAmount(amountMatch[0]);
    
    // Extract merchant for GrabFood
    const merchantMatch = body.match(/(?:from|dari)\s+([^\n<]+)/i);
    
    // Extract date
    const dateMatch = body.match(/(\d{1,2}\s+\w+\s+\d{4})/);
    
    return {
      amount,
      currency: 'IDR',
      description: isFood 
        ? `GrabFood - ${merchantMatch?.[1]?.trim() || 'Unknown'}` 
        : `GrabCar/Bike ride`,
      merchant: merchantMatch?.[1]?.trim(),
      platform: 'grab',
      transactionDate: parseDate(dateMatch?.[1]) || today(),
      categoryHint: isFood ? 'food' : 'transport',
    };
  }
}

// Helper: parse "Rp 45.000" → 45000
function parseIndonesianAmount(str: string): number {
  return Number(str.replace(/[Rp\s.]/g, '').replace(',', '.'));
}
```

### 7.5 Duplicate Detection Logic

```typescript
async function detectDuplicate(
  newTxn: ParsedTransaction,
  userId: string,
  db: D1Database
): Promise<string | null> {
  // Cari transaksi dengan:
  // 1. Amount sama
  // 2. Tanggal sama
  // 3. Platform berbeda (cross-platform duplicate indicator)
  const candidates = await db
    .prepare(`
      SELECT id FROM transactions 
      WHERE user_id = ? 
        AND amount = ? 
        AND transaction_date = ?
        AND platform != ?
        AND is_deleted = 0
      LIMIT 1
    `)
    .bind(userId, newTxn.amount, newTxn.transactionDate, newTxn.platform)
    .first();
  
  return candidates?.id as string | null;
}
```

---

## 8. API Routes (Hono.js)

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors());

// ── Auth ──────────────────────────────────
app.get('/auth/google', handleGoogleLogin);
app.get('/auth/callback', handleGoogleCallback);
app.post('/auth/refresh', handleTokenRefresh);
app.post('/auth/logout', authMiddleware, handleLogout);

// ── Transactions ──────────────────────────
app.get('/transactions', authMiddleware, listTransactions);
app.get('/transactions/:id', authMiddleware, getTransaction);
app.post('/transactions', authMiddleware, createTransaction);
app.put('/transactions/:id', authMiddleware, updateTransaction);
app.delete('/transactions/:id', authMiddleware, softDeleteTransaction);
app.post('/transactions/bulk-delete', authMiddleware, bulkDelete);
app.post('/transactions/bulk-categorize', authMiddleware, bulkCategorize);
app.post('/transactions/:id/resolve-duplicate', authMiddleware, resolveDuplicate);

// ── Categories ────────────────────────────
app.get('/categories', authMiddleware, listCategories);
app.post('/categories', authMiddleware, createCategory);
app.put('/categories/:id', authMiddleware, updateCategory);
app.delete('/categories/:id', authMiddleware, deleteCategory);

// ── Budgets ───────────────────────────────
app.get('/budgets', authMiddleware, listBudgets);         // ?month=2025-01
app.get('/budgets/progress', authMiddleware, getBudgetProgress);
app.post('/budgets', authMiddleware, upsertBudget);
app.delete('/budgets/:id', authMiddleware, deleteBudget);

// ── Gmail Sync ────────────────────────────
app.post('/sync/trigger', authMiddleware, triggerSync);
app.get('/sync/status', authMiddleware, getSyncStatus);
app.get('/sync/logs', authMiddleware, getSyncLogs);
app.post('/sync/disconnect', authMiddleware, disconnectGmail);

// ── Recurring ─────────────────────────────
app.get('/recurring', authMiddleware, listRecurring);
app.put('/recurring/:id', authMiddleware, updateRecurring);
app.delete('/recurring/:id', authMiddleware, deactivateRecurring);

// ── Insights & Export ─────────────────────
app.get('/insights/monthly', authMiddleware, getMonthlyInsights);
app.get('/insights/trends', authMiddleware, getSpendingTrends);
app.get('/export/xlsx', authMiddleware, exportToExcel);

// ── Upload (Receipt Photos) ───────────────
app.post('/upload/receipt', authMiddleware, uploadReceipt);

export default app;
```

---

## 9. App Screens & Navigation

### 9.1 Tab Navigation

```
┌──────────────────────────────────────────┐
│              DuitKu App                   │
├──────────┬───────────┬─────────┬─────────┤
│   Home   │ Transaksi │ Budget  │ Profile │
│    🏠    │    📋     │   💰    │   👤    │
└──────────┴───────────┴─────────┴─────────┘
```

### 9.2 Screen Map

```
(auth)/
├── login.tsx                → Google OAuth login
├── register.tsx             → Optional email signup
└── onboarding.tsx           → Category setup + Gmail connect prompt

(tabs)/
├── home/
│   ├── index.tsx            → Dashboard: summary cards + pie chart 
│   │                          + recent transactions + sync banner
│   └── insights.tsx         → Month-over-month trends + top spending
│
├── transactions/
│   ├── index.tsx            → Full transaction list + filters + search
│   ├── [id].tsx             → Transaction detail → edit/delete
│   ├── add.tsx              → Manual input form (quick-add)
│   └── review.tsx           → Uncategorized inbox (needs review)
│
├── budget/
│   ├── index.tsx            → All budgets + progress bars
│   ├── [categoryId].tsx     → Budget detail per category + history
│   └── recurring.tsx        → Recurring subscriptions list
│
├── profile/
│   ├── index.tsx            → Profile overview + quick settings
│   ├── gmail-sync.tsx       → Gmail connection, sync history, 
│   │                          trigger manual sync
│   ├── categories.tsx       → Manage categories (add/edit/reorder)
│   ├── export.tsx           → Export reports (.xlsx) + share
│   └── settings.tsx         → Biometric lock, notifications, theme,
│                              currency, data management
```

### 9.3 Key UI Components

```
TransactionCard          → Amount, category icon+color, merchant, date,
                           source badge ("Gmail" / "Manual")
CategoryBudgetBar        → Category icon + name + progress bar + Rp X / Rp Y
SyncStatusBanner         → "Last synced 2h ago" + "Sync Now" button + spinner
QuickAddFAB              → Floating "+" button for manual input
MonthPicker              → Horizontal swipeable month selector
ExpensePieChart          → Donut chart by category
SpendingTrendLine        → Daily spending line chart
DuplicateMergeSheet      → Bottom sheet: "Possible duplicate found" → merge/keep
ReviewInboxBadge         → Red badge count on Transaksi tab
BudgetAlertBanner        → "⚠️ Makanan sudah 80% dari budget!"
RecurringCard            → Subscription name + amount + frequency + next date
```

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1-2)
```
□ Expo project init (SDK 52+ with expo-router)
□ Cloudflare account + wrangler CLI setup
□ D1 database creation + run schema migrations
□ Hono.js Worker skeleton with CORS
□ Google Cloud Console: OAuth2 client ID setup
□ Google OAuth2 flow (Worker + Expo AuthSession)
□ JWT auth system + refresh token rotation
□ Basic tab navigation + theme (colors, fonts)
□ ⚠️ Submit Google OAuth verification request (gmail.readonly)
```

### Phase 2: Core CRUD — Manual Transactions (Week 3-4)
```
□ Default categories seeding (per new user)
□ Manual transaction input form (quick-add)
□ Transaction list screen with infinite scroll
□ Filter: by date range, category, type (income/expense)
□ Transaction detail → edit all fields
□ Soft delete with confirmation dialog
□ Category management CRUD
□ Dashboard: total expense this month + balance card
□ QuickAddFAB component
```

### Phase 3: Gmail Sync Engine (Week 5-7)
```
□ Gmail OAuth consent (request gmail.readonly in auth flow)
□ Gmail API integration in Worker
□ Parser framework + registry pattern
□ Parser: Grab (GrabFood + GrabCar/Bike)
□ Parser: Gojek (GoFood + GoRide/GoCar)
□ Parser: Shopee (orders + ShopeePay)
□ Parser: Tokopedia (orders + payment)
□ Parser: OVO
□ Parser: Dana
□ Duplicate detection logic
□ Auto-categorization engine (platform→category mapping + rules table)
□ Sync trigger endpoint + Cron Trigger setup
□ Sync UI: progress indicator, sync history, manual trigger
□ Uncategorized review inbox screen
□ Category learning: save rules from user corrections
```

### Phase 4: Budget & Alerts (Week 8-9)
```
□ Budget setup UI per category + total monthly
□ Budget progress bars (real-time calculation)
□ Expo push notifications setup
□ Budget alert triggers: 50%, 80%, 100%
□ Carry-over logic (rollover unused budget)
□ Budget vs Actual comparison view
□ BudgetAlertBanner component on dashboard
```

### Phase 5: Recurring Detection & Insights (Week 10-11)
```
□ Recurring detection algorithm:
  - Group transactions by similar amount + platform + monthly interval
  - Auto-flag as recurring if 2+ consecutive months match
□ Recurring subscriptions screen
□ Price change detection (amount differs from expected)
□ Dashboard pie chart (expense by category)
□ Spending trend line chart (daily/weekly)
□ Month-over-month insights (natural language)
□ Top spending categories + merchants
```

### Phase 6: Bank Sync & Export (Week 12-13)
```
□ Parser: BCA email notifications
□ Parser: Mandiri email notifications
□ Parser: BRI / BNI email notifications
□ Cross-match: bank debit ↔ e-commerce payment
□ Excel export Worker endpoint (generate .xlsx in Worker)
  - Sheet 1: Monthly Summary
  - Sheet 2: Transaction Detail
  - Sheet 3: Budget vs Actual
  - Sheet 4: Recurring Subscriptions
□ R2: store generated export files
□ Share export via WhatsApp / email (expo-sharing)
```

### Phase 7: Polish & Launch (Week 14-16)
```
□ Biometric lock (expo-local-authentication)
□ Dark mode support
□ App icon + splash screen design
□ Onboarding flow (welcome → connect Gmail → setup categories)
□ Empty states for all screens
□ Error handling + retry logic (network failures)
□ Loading skeletons
□ Performance: optimize D1 queries + React Query caching
□ Accessibility basics
□ TestFlight (iOS) + Internal Track (Android)
□ Privacy policy + terms of service pages
□ App Store + Play Store submission
□ Simple landing page (duitku.app)
```

---

## 11. Gmail API & Privacy

### Required OAuth Scopes
```
openid                                     → Basic profile
email                                      → Email address
profile                                    → Name + avatar
https://www.googleapis.com/auth/gmail.readonly  → Read-only Gmail
```

### Privacy Safeguards
- ✅ Gmail access is **read-only** — cannot send, delete, or modify emails
- ✅ Only emails matching known sender patterns are processed
- ✅ Raw email body is **NOT** stored — only parsed transaction data
- ✅ `raw_email_snippet` stores max 200 chars for debugging only
- ✅ Google refresh token encrypted before storing in D1
- ✅ User can disconnect Gmail anytime → token deleted + sync stopped
- ✅ All data deletable (GDPR-style "delete my account" feature)

### Google OAuth Verification Process
1. Create OAuth consent screen in Google Cloud Console
2. Add gmail.readonly scope → triggers "Sensitive scope" review
3. Prepare: privacy policy URL, terms of service URL, homepage
4. Submit for verification (takes 2-4 weeks)
5. During review: limited to 100 test users
6. After approval: unlimited users

> ⚠️ **Submit verification in Phase 1!** Don't wait until Gmail sync is built.

---

## 12. Cost Analysis (Monthly)

### Cloudflare Free Tier Limits

| Service | Free Limit | Expected Usage (1K users) | Headroom |
|---------|-----------|--------------------------|----------|
| Workers requests | 100K/day | ~30K/day | 3x margin |
| D1 reads | 5M/day | ~500K/day | 10x margin |
| D1 writes | 100K/day | ~20K/day | 5x margin |
| D1 storage | 5GB | ~500MB | 10x margin |
| R2 storage | 10GB | ~2GB | 5x margin |
| R2 Class A ops | 1M/month | ~100K/month | 10x margin |
| R2 Class B ops | 10M/month | ~500K/month | 20x margin |
| KV reads | 100K/day | ~10K/day | 10x margin |
| Cron Triggers | Unlimited | 4/day per user | ∞ |

### Total Cost

| Item | Cost |
|------|------|
| Cloudflare (Workers + D1 + R2 + KV) | **$0/month** (free forever) |
| Gmail API | **$0** (free, generous quota) |
| Google Cloud Console (OAuth) | **$0** |
| Apple Developer Account | **$99/year** (~$8.25/month) |
| Google Play Console | **$25 one-time** |
| Domain (duitku.app) | **~$12/year** (~$1/month) |
| Expo EAS Build (free tier) | **$0** |
| **Total monthly (at launch)** | **~$9.25/month** |
| **Total monthly (at scale to 1K users)** | **~$9.25/month** (still free tier!) |

### When to Upgrade (Paid Tier)

| Trigger | Solution | Cost |
|---------|----------|------|
| >100K Workers req/day | Workers Paid ($5/mo + $0.50/M req) | ~$5/mo |
| >5GB D1 storage | D1 Paid ($0.75/GB) | ~$2/mo |
| >10GB R2 | R2 Paid ($0.015/GB) | <$1/mo |

> **Realistically:** Free tier bisa handle 1,000-5,000 users sebelum perlu upgrade. Total upgrade cost ~$8-10/month saat itu.

---

## 13. Project File Structure

```
duitku/
│
├── apps/
│   └── mobile/                         # React Native (Expo) app
│       ├── app/                        # Expo Router pages
│       │   ├── (auth)/
│       │   │   ├── login.tsx
│       │   │   ├── register.tsx
│       │   │   └── onboarding.tsx
│       │   ├── (tabs)/
│       │   │   ├── home/
│       │   │   │   ├── index.tsx       # Dashboard
│       │   │   │   └── insights.tsx    # Trends & analytics
│       │   │   ├── transactions/
│       │   │   │   ├── index.tsx       # Transaction list
│       │   │   │   ├── [id].tsx        # Detail/edit/delete
│       │   │   │   ├── add.tsx         # Manual input
│       │   │   │   └── review.tsx      # Uncategorized inbox
│       │   │   ├── budget/
│       │   │   │   ├── index.tsx       # Budget overview
│       │   │   │   ├── [categoryId].tsx
│       │   │   │   └── recurring.tsx   # Subscriptions
│       │   │   └── profile/
│       │   │       ├── index.tsx
│       │   │       ├── gmail-sync.tsx
│       │   │       ├── categories.tsx
│       │   │       ├── export.tsx
│       │   │       └── settings.tsx
│       │   └── _layout.tsx
│       │
│       ├── components/
│       │   ├── ui/
│       │   │   ├── TransactionCard.tsx
│       │   │   ├── CategoryBudgetBar.tsx
│       │   │   ├── MonthPicker.tsx
│       │   │   ├── QuickAddFAB.tsx
│       │   │   ├── SyncStatusBanner.tsx
│       │   │   ├── DuplicateMergeSheet.tsx
│       │   │   ├── BudgetAlertBanner.tsx
│       │   │   └── RecurringCard.tsx
│       │   └── charts/
│       │       ├── ExpensePieChart.tsx
│       │       └── SpendingTrendLine.tsx
│       │
│       ├── lib/
│       │   ├── api.ts                  # API client (fetch wrapper)
│       │   ├── auth.ts                 # Google OAuth + token mgmt
│       │   └── excel.ts               # Local xlsx helper (if needed)
│       │
│       ├── stores/
│       │   ├── authStore.ts            # Zustand: auth state
│       │   ├── transactionStore.ts     # Zustand: transactions
│       │   └── budgetStore.ts          # Zustand: budgets
│       │
│       ├── types/
│       │   └── index.ts
│       │
│       ├── constants/
│       │   ├── categories.ts           # Default categories config
│       │   ├── platforms.ts            # Platform parser configs
│       │   └── theme.ts               # Colors, fonts, spacing
│       │
│       ├── app.json                    # Expo config
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                         # Shared types & utils
│       ├── types.ts                    # Shared TypeScript types
│       └── utils.ts                    # Amount parsing, date helpers
│
├── workers/
│   └── api/                            # Cloudflare Worker (Hono.js)
│       ├── src/
│       │   ├── index.ts                # Hono app + routes + cron handler
│       │   ├── middleware/
│       │   │   ├── auth.ts             # JWT verification middleware
│       │   │   └── rateLimit.ts        # KV-based rate limiting
│       │   ├── routes/
│       │   │   ├── auth.ts             # Google OAuth endpoints
│       │   │   ├── transactions.ts     # Transaction CRUD
│       │   │   ├── categories.ts       # Category CRUD
│       │   │   ├── budgets.ts          # Budget CRUD + progress
│       │   │   ├── sync.ts             # Gmail sync trigger + status
│       │   │   ├── recurring.ts        # Recurring detection + CRUD
│       │   │   ├── insights.ts         # Analytics queries
│       │   │   └── export.ts           # Excel generation
│       │   ├── services/
│       │   │   ├── gmail.ts            # Gmail API client
│       │   │   ├── sync.ts             # Sync orchestrator
│       │   │   ├── categorizer.ts      # Auto-categorization engine
│       │   │   └── duplicateDetector.ts
│       │   ├── parsers/
│       │   │   ├── index.ts            # Parser registry
│       │   │   ├── grab.ts
│       │   │   ├── gojek.ts
│       │   │   ├── shopee.ts
│       │   │   ├── tokopedia.ts
│       │   │   ├── ovo.ts
│       │   │   ├── dana.ts
│       │   │   ├── bank-bca.ts
│       │   │   ├── bank-mandiri.ts
│       │   │   └── bank-bri.ts
│       │   └── lib/
│       │       ├── jwt.ts              # JWT sign/verify helpers
│       │       ├── crypto.ts           # Encrypt/decrypt tokens
│       │       └── d1-helpers.ts       # Query builder helpers
│       │
│       ├── migrations/
│       │   └── 0001_initial.sql        # D1 schema
│       │
│       ├── wrangler.toml               # Cloudflare config
│       ├── package.json
│       └── tsconfig.json
│
├── docs/
│   ├── privacy-policy.md
│   └── terms-of-service.md
│
├── package.json                        # Monorepo root (npm workspaces)
└── README.md
```

---

## 14. Key Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Google OAuth verification delay (2-4 weeks) | Gmail sync blocked | Submit ASAP in Phase 1, use 100 test users meanwhile |
| Email format changes (platform update HTML) | Parser breaks, txns not captured | Modular parsers + fallback to uncategorized + error alerts |
| D1 SQLite limitations (no RLS, no realtime) | Security relies on Worker code | Strict middleware auth + comprehensive unit tests |
| Duplicate detection false positives | Double/missing transactions | Never auto-merge, always require user confirmation |
| Cloudflare free tier rate limits | API throttled at peak | Implement client-side caching (React Query) + batch D1 reads |
| App Store rejection | Launch delay | Follow Apple guidelines strictly, proper privacy labels |
| User privacy concerns | Low adoption | Transparent consent UX, minimal data storage, easy delete |
| Workers 10ms CPU limit (free) | Complex parsing timeout | Optimize parsers, batch process emails |

---

## 15. Success Metrics

| Metric | Target |
|--------|--------|
| **Sync accuracy** | >90% emails parsed correctly |
| **Parse coverage** | >95% of transaction emails from supported platforms |
| **Sync latency** | <30 seconds for manual sync trigger |
| **App responsiveness** | <200ms API response time (p95) |
| **Duplicate detection precision** | >85% true positives |
| **Budget alert delivery** | <5 min after threshold crossed |
| **User retention** | 60% weekly active after 1 month |
| **Manual vs Synced ratio** | Target 80% synced / 20% manual |

---

## 16. Future Enhancements (Post-Launch)

- [ ] Multi-currency support + auto conversion (ExchangeRate API)
- [ ] Voice input untuk quick-add ("GrabFood 50 ribu")
- [ ] Receipt OCR (scan struk fisik via camera)
- [ ] Family/shared budget (multi-user per household)
- [ ] Investment tracking integration
- [ ] Bill reminder & auto-pay tracking
- [ ] WhatsApp bot interface (kirim struk → auto logged)
- [ ] iOS Widget + Android Widget (expense summary)
- [ ] AI-powered spending advisor (Claude API integration)
- [ ] Crypto wallet sync (Solana on-chain tracking via Helius)
- [ ] Web dashboard companion (Cloudflare Pages — free)
- [ ] Offline-first with local SQLite + sync when online
