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
