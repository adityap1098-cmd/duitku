# CLAUDE.md — DuitKu Project

Personal finance tracker dengan Gmail auto-sync untuk platform Indonesia.
Stack: React Native (Expo) + Cloudflare (Workers/Hono + D1 + R2 + KV) + Google OAuth2.
Deploy: Android APK dulu (EAS Build), Play Store & iOS nanti.

## Quick Start

```bash
# Root (npm workspaces monorepo)
npm install

# API (Cloudflare Worker)
cd workers/api
cp wrangler.toml.example wrangler.toml   # isi credentials
npx wrangler d1 migrations apply duitku-db --local
npx wrangler dev                          # → localhost:8787

# Mobile (Expo)
cd apps/mobile
npx expo start                            # → Expo dev server
```

## Monorepo Layout

```
duitku/
├── CLAUDE.md                    ← KAMU BACA INI SEKARANG
├── apps/mobile/                 ← React Native (Expo) app
│   ├── app/                     ← Screens (expo-router, file-based)
│   ├── features/                ← Feature modules (hooks + components)
│   ├── lib/                     ← API client, auth helpers
│   ├── stores/                  ← Zustand stores
│   └── constants/               ← Theme, config
├── packages/shared/             ← Types, utils, constants (SINGLE SOURCE OF TRUTH)
│   └── src/
│       ├── types/               ← ALL type definitions live here
│       ├── constants/           ← Categories, platforms, feature flags
│       └── utils/               ← Currency, date, validation helpers
├── workers/api/                 ← Cloudflare Worker (Hono.js)
│   ├── src/
│   │   ├── index.ts             ← Entry + cron handler
│   │   ├── routes/              ← HTTP handlers (thin, no logic)
│   │   ├── services/            ← Business logic (thick, all logic here)
│   │   ├── parsers/             ← Email parsers (1 file per platform)
│   │   ├── middleware/          ← Auth, rate limit, error handler
│   │   └── lib/                 ← JWT, crypto, helpers
│   ├── migrations/              ← D1 SQL migrations (sequential, never edit old ones)
│   └── tests/                   ← Vitest
└── docs/                        ← Reference docs (for humans, not for AI context)
```

## Architecture Rules — ALWAYS FOLLOW

1. **Types** → SELALU di `packages/shared/src/types/`. JANGAN buat type baru di mobile atau worker.
2. **Routes = tipis** → Parse input, call service, return JSON. ZERO business logic.
3. **Services = otak** → Semua logic di `workers/api/src/services/`. Terima `(db, userId, input)`, return data.
4. **Parsers = modular** → 1 file per platform di `workers/api/src/parsers/`. Implements `EmailParser` interface.
5. **Mobile hooks** → Data fetching via TanStack Query di `apps/mobile/features/{feature}/hooks/`.
6. **Screens = render only** → `apps/mobile/app/` hanya compose components + hooks. Nggak ada fetch/logic.
7. **Uang = INTEGER** → Semua monetary values dalam Rupiah sebagai integer. BUKAN float/decimal.
8. **Boolean = INTEGER** → D1/SQLite: pakai 0/1, bukan true/false.
9. **Timestamp = TEXT** → ISO 8601 string, bukan Date object.
10. **Migrations = append-only** → JANGAN edit migration yang sudah ada. Buat file baru.

## Naming Conventions

| What       | Convention  | Example                                  |
| ---------- | ----------- | ---------------------------------------- |
| Files      | kebab-case  | `grab-parser.ts`, `transaction-card.tsx` |
| Types      | PascalCase  | `Transaction`, `CreateTransactionInput`  |
| Functions  | camelCase   | `createTransaction`, `parseGrabEmail`    |
| DB tables  | snake_case  | `transactions`, `sync_logs`              |
| DB columns | snake_case  | `user_id`, `created_at`                  |
| API routes | kebab-case  | `/transactions`, `/sync/trigger`         |
| Env vars   | UPPER_SNAKE | `JWT_SECRET`, `GOOGLE_CLIENT_ID`         |

## How To: Add a New API Endpoint

```
1. types     → packages/shared/src/types/{domain}.ts (input/output types)
2. service   → workers/api/src/services/{domain}.ts (logic)
3. route     → workers/api/src/routes/{domain}.ts (HTTP handler)
4. register  → workers/api/src/routes/index.ts (app.route())
5. hook      → apps/mobile/features/{feature}/hooks/use-{action}.ts
6. test      → workers/api/tests/services/{domain}.test.ts
```

Route pattern:

```typescript
// routes/{domain}.ts — THIN, no logic
app.get("/", async (c) => {
  const userId = c.get("userId");
  const result = await someService.list(c.env.DB, userId, query);
  return c.json(result);
});
```

Service pattern:

```typescript
// services/{domain}.ts — ALL logic here
export async function list(db: D1Database, userId: string, filter: Filter) {
  const results = await db.prepare('SELECT ...').bind(userId).all();
  return { data: results.results, pagination: { ... } };
}
```

## How To: Add a New Email Parser

```
1. copy      → workers/api/src/parsers/_template.ts → {platform}.ts
2. implement → senderPatterns + parse() function
3. register  → workers/api/src/parsers/index.ts (import + add to array)
4. config    → packages/shared/src/constants/platforms.ts
5. test      → workers/api/tests/parsers/{platform}.test.ts
```

Parser interface:

```typescript
interface EmailParser {
  platform: string; // 'grab', 'gojek', 'shopee'
  displayName: string; // 'Grab', 'Gojek', 'Shopee'
  senderPatterns: RegExp[]; // match sender email
  parse(email: EmailInput): ParsedTransaction | null;
}
```

CategoryHint values: `'food' | 'transport' | 'shopping' | 'subscription' | 'topup' | 'transfer' | 'bills' | 'entertainment' | 'health' | 'education' | 'other'`

## How To: Add a New Feature Flag

```
1. packages/shared/src/constants/features.ts → tambah enum + access rule
2. Worker: isFeatureEnabled(Feature.XXX, userTier)
3. Mobile: useFeatureFlag(Feature.XXX)
```

Current tiers: `'free' | 'premium' | 'admin'`
Sekarang semua user = free. Premium nanti di Phase 3.

## How To: Add a New DB Table

```
1. Buat file: workers/api/migrations/XXXX_{name}.sql
2. WAJIB columns: id TEXT PRIMARY KEY, user_id TEXT, created_at TEXT
3. Monetary → INTEGER, Boolean → INTEGER (0/1), Date → TEXT
4. Run: npx wrangler d1 migrations apply duitku-db --local
```

## How To: Add a New Mobile Screen

```
1. screen    → apps/mobile/app/(tabs)/{section}/{screen}.tsx
2. hook      → apps/mobile/features/{feature}/hooks/
3. component → apps/mobile/features/{feature}/components/
```

Screen hanya render, semua data via hooks:

```tsx
export default function TransactionsScreen() {
  const { data, isLoading } = useTransactions(filter);
  return <TransactionList data={data} loading={isLoading} />;
}
```

## Key Dependencies

**Mobile:** expo-router, zustand, @tanstack/react-query, expo-secure-store, expo-notifications, expo-local-authentication, react-native-reanimated
**Worker:** hono, @cloudflare/workers-types
**Shared:** zod (validation)

## Error Handling

Worker: throw `AppError(code, message, status)` — JANGAN throw plain Error.

```typescript
import { Errors } from "../lib/errors";
throw Errors.NOT_FOUND("Transaction");
throw Errors.PREMIUM_REQUIRED("Export Excel");
throw Errors.VALIDATION("Amount harus > 0");
```

## Auth Flow

Google OAuth2 → Worker exchanges code → JWT (15min) + Refresh Token (KV).
Mobile stores tokens in expo-secure-store. Auto-refresh on 401.
Every Worker route: `authMiddleware` → sets `c.get('userId')`.
Manual RLS: every DB query MUST filter by `user_id = ?`.

## Don'ts

- JANGAN taruh business logic di route files
- JANGAN buat type di mobile/worker — pakai shared/
- JANGAN hardcode fitur availability — pakai feature flags
- JANGAN pakai float untuk uang — INTEGER only
- JANGAN edit migration lama — buat baru
- JANGAN simpan raw email body penuh — max 200 char snippet
- JANGAN auto-merge duplicates — selalu minta user confirm

## UI/UX Design System

Baca section ini sebelum bikin/edit komponen UI.

### Theme: Dark Only

Background: `#0B0F1E`. Tidak ada light mode.

### Colors

```typescript
// ─── Base ──────────────────────────────
bg: "#0B0F1E"; // App background
card: "#131A2E"; // Card background
cardAlt: "#1A2240"; // Nested/elevated card
cardBorder: "#1E2A4A"; // Card borders & dividers

// ─── Text ──────────────────────────────
text: "#FFFFFF"; // Primary (heading, amounts)
textSec: "#8B9DC3"; // Secondary (labels, descriptions)
textMuted: "#4A5C80"; // Muted (timestamps, hints)

// ─── Accent & Semantic ─────────────────
accent: "#00D09C"; // Primary action, income, success
accentDim: "rgba(0,208,156,0.12)";
red: "#FF5A7E"; // Expense amounts, delete, error, over-budget
redDim: "rgba(255,90,126,0.12)";
orange: "#FFB347"; // Warning, approaching budget limit
orangeDim: "rgba(255,179,71,0.12)";
blue: "#5B8DEF"; // Info, manual badge, bank
blueDim: "rgba(91,141,239,0.12)";
purple: "#A78BFA"; // Category accent, premium
pink: "#F472B6"; // Subscription category
yellow: "#FBBF24"; // Attention, highlight

// ─── Hero Gradient ─────────────────────
hero1: "#4A3ABA"; // Gradient start
hero2: "#6C5CE7"; // Gradient middle
hero3: "#8B7CF0"; // Gradient end

// ─── Platform Colors ───────────────────
grab: "#00B14F";
gojek: "#00AA13";
shopee: "#EE4D2D";
tokopedia: "#42B549";
ovo: "#4C2A86";
dana: "#108EE9";
```

### Spacing Scale

```
xs: 4    — gap kecil (antar badge)
sm: 8    — padding internal kecil
md: 12   — gap antar items dalam list
base: 16 — padding card, gap standar
lg: 20   — padding section/hero
xl: 24   — gap antar sections
2xl: 32  — gap besar antar major sections
```

### Border Radius

```
sm: 8    — badge, tag
md: 12   — input, small card, button
lg: 16   — card, list container
xl: 20   — hero card, modal
2xl: 22  — main hero/banner
full: 9999 — pill button, avatar
```

### Typography

```
h1:      fontSize 32, fontWeight 900, letterSpacing -1
h2:      fontSize 24, fontWeight 800, letterSpacing -0.5
h3:      fontSize 18, fontWeight 700
body:    fontSize 14, fontWeight 400
bodyBold: fontSize 14, fontWeight 700
sm:      fontSize 12, fontWeight 500
smBold:  fontSize 12, fontWeight 700
xs:      fontSize 10, fontWeight 600
amount:  fontSize 15, fontWeight 800
amountLg: fontSize 28, fontWeight 900
label:   fontSize 11, fontWeight 700, letterSpacing 1, uppercase
badge:   fontSize 9, fontWeight 700
```

### Color Rules

```
Expense amount → SELALU merah (red)
Income amount  → SELALU hijau (accent)
Budget progress:
  < 70%  → hijau (accent)
  70-90% → orange
  > 90%  → merah (red)
Card → SELALU punya border 1px (cardBorder)
Badge source → Synced: accent, Manual: blue
```

### Component Patterns

**Card:** bg card, borderRadius lg (16), padding base (16), border 1px cardBorder.
**Hero card:** LinearGradient hero1→hero3, borderRadius 2xl (22), padding lg (20), decorative circle top-right rgba(255,255,255,0.08).
**List item:** flexDirection row, gap md (12), paddingVertical 14, borderBottom 1px cardBorder.
**Icon container:** 42x42, borderRadius md (12), bg cardAlt, centered.
**Badge:** paddingHorizontal 6, paddingVertical 2, borderRadius 4, fontSize 9, fontWeight 700, bg = color + 12% opacity.
**Progress bar:** height 6, borderRadius 3, bg cardBorder, inner fill with dynamic color.
**Primary button:** bg accent, paddingVertical 14, borderRadius md (12), text color bg.
**Danger button:** bg redDim, text color red.
**FAB:** 52x52, borderRadius lg (16), bg hero2, marginTop -26, shadow hero1.

### UI Don'ts

- JANGAN hardcode warna/size — pakai tokens di atas
- JANGAN buat card tanpa border
- JANGAN pakai light/white background
- JANGAN over-animate — animasi harus purposeful
- JANGAN lupa empty state di setiap list/screen
- JANGAN lupa badge source (Synced/Manual) di transaksi
- JANGAN lupa platform badge (Grab/Shopee/dll) di synced transactions

## Finance-Specific UX Rules

### Angka = Raja

Angka adalah hal pertama yang user lihat. Harus instantly scannable.

```
WAJIB:
- Selalu pakai prefix "Rp " (dengan spasi)
- Separator titik untuk ribuan: Rp 1.250.000 (BUKAN Rp 1,250,000)
- Pakai monospace/tabular font KHUSUS untuk angka agar align di list
- Minus sign eksplisit untuk expense: -Rp 45.000
- Plus sign untuk income: +Rp 5.000.000
- Amount SELALU right-aligned di list

Format function:
  formatRupiah(45000)     → "Rp 45.000"
  formatRupiah(-45000)    → "-Rp 45.000"
  formatRupiah(5000000)   → "+Rp 5.000.000"  (income)
```

### Emotional Color — Jangan Bikin User Takut Buka App

```
SALAH:  Semua pengeluaran merah terang → user anxiety
BENAR:  Pengeluaran biasa = soft/muted, alert hanya saat masalah

Color tiers:
  Normal expense     → red biasa (#FF5A7E) — informative, bukan scary
  Over-budget        → red BRIGHT + ⚠️ icon + background redDim — INI baru urgent
  Under budget       → accent green — positif reinforcement
  Insight positif    → "Hemat 20%!" → green + 🎉 — celebration
  Insight negatif    → "Naik 40%" → orange (WARNING, bukan red/ERROR)

Goal: App terasa seperti helpful advisor, BUKAN debt collector.
```

### Data Density — Compact List, Spacious Hero

```
Hero section      → SPACIOUS (padding 20-24px, banyak breathing room)
Summary cards     → MEDIUM (padding 14-16px)
Transaction list  → COMPACT (paddingVertical 12px per item, gap minimal)

Target: 5-6 transaksi visible tanpa scroll di home screen.

JANGAN terlalu banyak whitespace di list — user harus scroll terus = bad UX.
JANGAN terlalu packed di hero — terasa murah.
```

### Gesture Interactions

```
Swipe left on transaction  → Reveal delete button (red)
Swipe right on transaction → Reveal quick-edit category
Long press transaction     → Enter multi-select mode (bulk delete/categorize)
Pull to refresh            → Trigger Gmail sync
Tap amount on hero card    → Toggle antara "pengeluaran" dan "sisa budget"

Semua gesture WAJIB ada haptic feedback (Haptics.impactAsync).
```

### Loading & Sync States

```
Initial load        → Skeleton shimmer (bukan spinner)
Gmail syncing       → Banner: "Menyinkronkan... 12/25 email" + progress
Sync complete       → Brief success toast: "✅ 8 transaksi baru"
Sync error          → Persistent banner: "⚠️ Sync gagal. Tap untuk retry"
Pull to refresh     → Standard RN refresh control
Empty first launch  → Friendly empty state dengan CTA "Mulai Sync Gmail"

JANGAN pakai loading spinner di tengah layar — selalu skeleton atau inline indicator.
```

### Number Formatting Helper

```typescript
// Ini WAJIB dipakai di semua tempat yang tampilkan uang
// JANGAN format manual pakai template string

export function formatRupiah(
  amount: number,
  type?: "expense" | "income",
): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("id-ID");

  if (type === "income" || amount > 0) return `+Rp ${formatted}`;
  if (type === "expense" || amount < 0) return `-Rp ${formatted}`;
  return `Rp ${formatted}`;
}

// Usage:
// formatRupiah(45000, 'expense')  → "-Rp 45.000"
// formatRupiah(5000000, 'income') → "+Rp 5.000.000"
// formatRupiah(1250000)           → "Rp 1.250.000"
```

### REVISI: Amount Color Rules

```
LAMA (semua merah):
  Expense → #FF5A7E (semua)

BARU (tiered):
  Normal expense      → #C4C9D4 (muted silver) — tenang, informatif
  Large expense >500K → #FFB347 (orange) — perhatian, tapi bukan alarm
  Over-budget item    → #FF5A7E (red) + bg redDim — HANYA ini yang urgent
  Income / refund     → #00D09C (green) — selalu positif
  Daily subtotal      → #FF5A7E (red) — OK karena cuma 1 per date group
  Hero total          → #FFFFFF (white) — netral, nggak judge

Tambahkan ke theme.ts:
  expenseNormal:  '#C4C9D4'   // default expense amount
  expenseLarge:   '#FFB347'   // expense > threshold (500K default)
  expenseOver:    '#FF5A7E'   // category over budget
  income:         '#00D09C'   // income, refund, positive
```

```typescript
// Helper function — WAJIB pakai ini, jangan hardcode warna amount
export function getAmountColor(
  amount: number,
  type: "expense" | "income",
  isOverBudget?: boolean,
): string {
  if (type === "income") return colors.income; // #00D09C
  if (isOverBudget) return colors.expenseOver; // #FF5A7E
  if (amount >= 500000) return colors.expenseLarge; // #FFB347
  return colors.expenseNormal; // #C4C9D4
}
```

Goal: User buka app terasa **"oh, ini pengeluaran hari ini"** (netral).
BUKAN **"KAMU BOROS!!!"** (semua merah teriak-teriak).
Merah cuma muncul saat memang perlu tindakan = over budget.
