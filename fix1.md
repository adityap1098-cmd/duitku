Deep Scan Results - Post-Fix Audit

  Yang Sudah FIXED (Confirmed)

  ┌─────┬─────────────────────────┬───────────────────────────────────────────────────┐
  │  #  │          Issue          │                     Evidence                      │
  ├─────┼─────────────────────────┼───────────────────────────────────────────────────┤
  │ 1   │ .dev.vars di .gitignore │ Root + worker .gitignore keduanya exclude         │
  ├─────┼─────────────────────────┼───────────────────────────────────────────────────┤
  │ 2   │ Open redirect via state │ Allowlist validation ditambah                     │
  ├─────┼─────────────────────────┼───────────────────────────────────────────────────┤
  │ 3   │ Arbitrary redirect_uri  │ Whitelist di /auth/exchange                       │
  ├─────┼─────────────────────────┼───────────────────────────────────────────────────┤
  │ 4   │ Rate limiting           │ 3 layer: global (100/min), auth (10/min), headers │
  ├─────┼─────────────────────────┼───────────────────────────────────────────────────┤
  │ 5   │ JWT alg validation      │ Header decoded + HS256 enforced                   │
  ├─────┼─────────────────────────┼───────────────────────────────────────────────────┤
  │ 6   │ Security headers        │ HSTS, X-Frame, CSP, nosniff, Referrer-Policy      │
  ├─────┼─────────────────────────┼───────────────────────────────────────────────────┤
  │ 7   │ Error sanitization      │ sanitizeError() strips internal details           │
  ├─────┼─────────────────────────┼───────────────────────────────────────────────────┤
  │ 8   │ getSyncLogById RLS      │ user_id filter added                              │
  ├─────┼─────────────────────────┼───────────────────────────────────────────────────┤
  │ 9   │ Amount upper bound      │ MAX_AMOUNT = 999_999_999_999                      │
  ├─────┼─────────────────────────┼───────────────────────────────────────────────────┤
  │ 10  │ Concurrent sync guard   │ KV lock with 5min TTL                             │
  ├─────┼─────────────────────────┼───────────────────────────────────────────────────┤
  │ 11  │ Mandiri parser test     │ All 356 tests pass                                │
  ├─────┼─────────────────────────┼───────────────────────────────────────────────────┤
  │ 12  │ Theme colors            │ Match CLAUDE.md spec, tiered expense colors       │
  ├─────┼─────────────────────────┼───────────────────────────────────────────────────┤
  │ 13  │ expo-linear-gradient    │ Moved to mobile package.json                      │
  ├─────┼─────────────────────────┼───────────────────────────────────────────────────┤
  │ 14  │ react-native-worklets   │ Moved to mobile package.json                      │
  ├─────┼─────────────────────────┼───────────────────────────────────────────────────┤
  │ 15  │ Home screen real data   │ useTransactionSummary() + useTransactions()       │
  ├─────┼─────────────────────────┼───────────────────────────────────────────────────┤
  │ 16  │ Metro monorepo config   │ Properly configured                               │
  └─────┴─────────────────────────┴───────────────────────────────────────────────────┘

  ---
  MASIH HARUS FIX (Kritikal & High Priority)

  Deployment Blockers (App TIDAK bisa jalan)

  ┌─────┬──────────────────────────────────────────────────────────┬──────────────────┬───────────────┐
  │  #  │                          Issue                           │       File       │    Status     │
  ├─────┼──────────────────────────────────────────────────────────┼──────────────────┼───────────────┤
  │ 1   │ D1 database_id masih placeholder "<YOUR_D1_DATABASE_ID>" │ wrangler.toml:9  │ BLOCKER       │
  ├─────┼──────────────────────────────────────────────────────────┼──────────────────┼───────────────┤
  │ 2   │ KV namespace ID masih "local-kv-dev"                     │ wrangler.toml:15 │ BLOCKER       │
  ├─────┼──────────────────────────────────────────────────────────┼──────────────────┼───────────────┤
  │ 3   │ GOOGLE_REDIRECT_URI = localhost                          │ wrangler.toml:26 │ RUNTIME_ERROR │
  ├─────┼──────────────────────────────────────────────────────────┼──────────────────┼───────────────┤
  │ 4   │ API URL = trycloudflare (ephemeral)                      │ app.json:52      │ RUNTIME_ERROR │
  ├─────┼──────────────────────────────────────────────────────────┼──────────────────┼───────────────┤
  │ 5   │ ALLOWED_ORIGINS hanya dev URLs                           │ wrangler.toml:27 │ RUNTIME_ERROR │
  └─────┴──────────────────────────────────────────────────────────┴──────────────────┴───────────────┘

  Security (Masih Present)

  ┌─────┬──────────────────────────────────┬──────────┬────────────────────────────────────────────────────────────────────────────┐
  │  #  │              Issue               │ Severity │                                   Detail                                   │
  ├─────┼──────────────────────────────────┼──────────┼────────────────────────────────────────────────────────────────────────────┤
  │ 6   │ Refresh token di deep link URL   │ HIGH     │ Token lengkap ada di ?data= parameter - visible di system logs, adb logcat │
  ├─────┼──────────────────────────────────┼──────────┼────────────────────────────────────────────────────────────────────────────┤
  │ 7   │ No CSRF nonce di OAuth state     │ HIGH     │ State hanya berisi return URI, no random nonce                             │
  ├─────┼──────────────────────────────────┼──────────┼────────────────────────────────────────────────────────────────────────────┤
  │ 8   │ Search input no length cap       │ MEDIUM   │ GET query string bypass body limit, DoS via 10MB search                    │
  ├─────┼──────────────────────────────────┼──────────┼────────────────────────────────────────────────────────────────────────────┤
  │ 9   │ Rate limit fail-open on KV error │ MEDIUM   │ Jika KV down, semua rate limiting hilang                                   │
  └─────┴──────────────────────────────────┴──────────┴────────────────────────────────────────────────────────────────────────────┘

  Code Logic (Baru Ditemukan)

  ┌─────┬─────────────────────────────────────┬──────────┬──────────────────────────────────────────────────────────────────────┐
  │  #  │                Issue                │ Severity │                                Detail                                │
  ├─────┼─────────────────────────────────────┼──────────┼──────────────────────────────────────────────────────────────────────┤
  │ 10  │ Cron sync bypass KV lock            │ MEDIUM   │ syncAllUsers tidak pakai lock yang sama, bisa duplicate transactions │
  ├─────┼─────────────────────────────────────┼──────────┼──────────────────────────────────────────────────────────────────────┤
  │ 11  │ getSpendingTrend crash on NaN       │ MEDIUM   │ months=abc -> parseInt = NaN -> Invalid Date -> unhandled 500        │
  ├─────┼─────────────────────────────────────┼──────────┼──────────────────────────────────────────────────────────────────────┤
  │ 12  │ Insights date params not validated  │ MEDIUM   │ date_from=garbage -> silently wrong results                          │
  ├─────┼─────────────────────────────────────┼──────────┼──────────────────────────────────────────────────────────────────────┤
  │ 13  │ confirmRecurring no duplicate guard │ MEDIUM   │ User bisa confirm pattern yang sama berkali-kali                     │
  ├─────┼─────────────────────────────────────┼──────────┼──────────────────────────────────────────────────────────────────────┤
  │ 14  │ updateSyncLog no user_id filter     │ LOW      │ UPDATE hanya by ID, melanggar RLS convention                         │
  ├─────┼─────────────────────────────────────┼──────────┼──────────────────────────────────────────────────────────────────────┤
  │ 15  │ findOrCreateUser race condition     │ LOW      │ Concurrent OAuth bisa create duplicate users                         │
  └─────┴─────────────────────────────────────┴──────────┴──────────────────────────────────────────────────────────────────────┘

  Mobile App

  ┌─────┬────────────────────────────────┬──────────┬─────────────────────────────────────────────────────────────────────────────┐
  │  #  │             Issue              │ Severity │                                   Detail                                    │
  ├─────┼────────────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────────────┤
  │ 16  │ Auth login race condition      │ MEDIUM   │ 3s setTimeout bisa reject setelah resolve; deep link hilang di slow network │
  ├─────┼────────────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────────────┤
  │ 17  │ restoreSession() never called  │ HIGH     │ App trust persisted isAuthenticated tanpa verify token                      │
  ├─────┼────────────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────────────┤
  │ 18  │ No AUTH_EXPIRED global handler │ MEDIUM   │ User stuck di app dengan errors, tidak auto-redirect ke login               │
  ├─────┼────────────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────────────┤
  │ 19  │ Sync response type mismatch    │ MEDIUM   │ Hook expects {sync_id, status}, API returns {success, data: SyncLog}        │
  ├─────┼────────────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────────────┤
  │ 20  │ Budget alerts client-side only │ MEDIUM   │ Alerts hanya muncul jika user buka budget screen                            │
  ├─────┼────────────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────────────┤
  │ 21  │ Export bypass 401 refresh      │ LOW      │ downloadFileAsync tidak pakai api-client, expired token = fail              │
  ├─────┼────────────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────────────┤
  │ 22  │ console.log di production      │ MEDIUM   │ auth.ts, callback.tsx log sensitive URIs                                    │
  ├─────┼────────────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────────────┤
  │ 23  │ No EAS env overrides           │ HIGH     │ Semua profile (dev/preview/prod) pakai URL yang sama                        │
  └─────┴────────────────────────────────┴──────────┴─────────────────────────────────────────────────────────────────────────────┘

  Still Unfixed from Round 1

  ┌─────┬─────────────────────────────────────────┬──────────┐
  │  #  │                  Issue                  │ Severity │
  ├─────┼─────────────────────────────────────────┼──────────┤
  │ 24  │ Auth service 0% test coverage           │ HIGH     │
  ├─────┼─────────────────────────────────────────┼──────────┤
  │ 25  │ Unbounded email body ke parsers         │ MEDIUM   │
  ├─────┼─────────────────────────────────────────┼──────────┤
  │ 26  │ No Gmail API retry logic                │ MEDIUM   │
  ├─────┼─────────────────────────────────────────┼──────────┤
  │ 27  │ parseRupiahAmount greedy fallback       │ MEDIUM   │
  ├─────┼─────────────────────────────────────────┼──────────┤
  │ 28  │ LIKE wildcards not escaped              │ LOW      │
  ├─────┼─────────────────────────────────────────┼──────────┤
  │ 29  │ Export loads all rows to memory         │ MEDIUM   │
  ├─────┼─────────────────────────────────────────┼──────────┤
  │ 30  │ No formatRupiah/formatCompact in shared │ MEDIUM   │
  ├─────┼─────────────────────────────────────────┼──────────┤
  │ 31  │ Custom fonts not configured             │ MEDIUM   │
  ├─────┼─────────────────────────────────────────┼──────────┤
  │ 32  │ No pull-to-refresh on home              │ LOW      │
  └─────┴─────────────────────────────────────────┴──────────┘

  ---
  E2E Flow Test Results

  ┌─────────────────────────┬─────────────────┬─────────────────────────────────────────┐
  │         Journey         │     Result      │                Blocker?                 │
  ├─────────────────────────┼─────────────────┼─────────────────────────────────────────┤
  │ First-time login        │ PARTIALLY_WORKS │ Auth race condition, dual callback path │
  ├─────────────────────────┼─────────────────┼─────────────────────────────────────────┤
  │ Gmail sync              │ PARTIALLY_WORKS │ Response type mismatch                  │
  ├─────────────────────────┼─────────────────┼─────────────────────────────────────────┤
  │ Manual CRUD             │ WORKS           │ None                                    │
  ├─────────────────────────┼─────────────────┼─────────────────────────────────────────┤
  │ Budget alerts           │ PARTIALLY_WORKS │ Client-side only, no server push        │
  ├─────────────────────────┼─────────────────┼─────────────────────────────────────────┤
  │ Export                  │ WORKS           │ Minor: bypass 401 refresh               │
  ├─────────────────────────┼─────────────────┼─────────────────────────────────────────┤
  │ 401 -> refresh -> retry │ WORKS WELL      │ Missing global AUTH_EXPIRED handler     │
  ├─────────────────────────┼─────────────────┼─────────────────────────────────────────┤
  │ Offline handling        │ PARTIALLY_WORKS │ No global offline banner                │
  └─────────────────────────┴─────────────────┴─────────────────────────────────────────┘

  ---
  Top 10 Priority Fixes

  ┌─────┬────────────────────────────────────────────────────────────────────┬──────────┬────────┐
  │  #  │                               Action                               │ Category │ Effort │
  ├─────┼────────────────────────────────────────────────────────────────────┼──────────┼────────┤
  │ 1   │ Setup D1 + KV production IDs                                       │ Deploy   │ 5 min  │
  ├─────┼────────────────────────────────────────────────────────────────────┼──────────┼────────┤
  │ 2   │ Set production GOOGLE_REDIRECT_URI + ALLOWED_ORIGINS               │ Deploy   │ 5 min  │
  ├─────┼────────────────────────────────────────────────────────────────────┼──────────┼────────┤
  │ 3   │ Update app.json apiUrl ke permanent Worker URL + EAS env overrides │ Deploy   │ 15 min │
  ├─────┼────────────────────────────────────────────────────────────────────┼──────────┼────────┤
  │ 4   │ Implement handoff code pattern (token tidak di URL)                │ Security │ 2 hr   │
  ├─────┼────────────────────────────────────────────────────────────────────┼──────────┼────────┤
  │ 5   │ Call restoreSession() on app launch + add AUTH_EXPIRED handler     │ Mobile   │ 1 hr   │
  ├─────┼────────────────────────────────────────────────────────────────────┼──────────┼────────┤
  │ 6   │ Fix getSpendingTrend NaN crash + validate insights date params     │ API      │ 30 min │
  ├─────┼────────────────────────────────────────────────────────────────────┼──────────┼────────┤
  │ 7   │ Add cron sync lock (sama seperti manual sync)                      │ API      │ 30 min │
  ├─────┼────────────────────────────────────────────────────────────────────┼──────────┼────────┤
  │ 8   │ Fix auth login race condition (clear timeout on resolve)           │ Mobile   │ 30 min │
  ├─────┼────────────────────────────────────────────────────────────────────┼──────────┼────────┤
  │ 9   │ Fix sync response type mismatch                                    │ Mobile   │ 15 min │
  ├─────┼────────────────────────────────────────────────────────────────────┼──────────┼────────┤
  │ 10  │ Add search length cap (200 chars)                                  │ API      │ 5 min  │
  └─────┴────────────────────────────────────────────────────────────────────┴──────────┴────────┘

  jalankan beberapa fix secara paralel. Yang paling urgent adalah #1-3 (deployment config) karena tanpa itu app sama sekali tidak
  bisa jalan di production.