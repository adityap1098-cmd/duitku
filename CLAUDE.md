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

## UI/UX Design

Semua design rules ada di `DESIGN_SYSTEM.md`. WAJIB baca sebelum bikin/edit komponen UI.

Key points:

- Dark theme only (bg: #0B0F1E)
- Expense = merah (#FF5A7E), Income = hijau (#00D09C)
- Pakai design tokens dari `constants/theme.ts` — JANGAN hardcode warna/size
- Card SELALU punya border 1px (#1E2A4A)
- Badge source (Synced/Manual) di setiap transaksi
- Progress bar: hijau (<70%) → orange (70-90%) → merah (>90%)
- Empty state WAJIB di setiap list/screen
- Animasi purposeful only, jangan over-animate

## Don'ts

- JANGAN taruh business logic di route files
- JANGAN buat type di mobile/worker — pakai shared/
- JANGAN hardcode fitur availability — pakai feature flags
- JANGAN pakai float untuk uang — INTEGER only
- JANGAN edit migration lama — buat baru
- JANGAN simpan raw email body penuh — max 200 char snippet
- JANGAN auto-merge duplicates — selalu minta user confirm
