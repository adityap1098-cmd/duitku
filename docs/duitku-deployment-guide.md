# DuitKu — Deployment Guide
## Android-First via APK Distribution

**Strategi:** Android APK → Play Store → iOS (nanti)
**Cost awal:** $0 (APK langsung ke teman, tanpa store)

---

## 1. Deployment Phases

```
Phase A: Development (Sekarang)
├── Expo Dev Client di HP sendiri
├── Test di emulator + device fisik
└── Cost: $0

Phase B: Friends & Family (Setelah MVP ready)
├── Build APK via EAS Build
├── Share APK langsung via WhatsApp/Drive
├── Max ~20 orang
└── Cost: $0

Phase C: Public Android (Setelah stabil)
├── Build AAB → upload ke Google Play Store
├── Google Play Console: $25 (sekali bayar, lifetime)
├── Open beta / production release
└── Cost: $25

Phase D: iOS (Kalau demand ada)
├── Apple Developer Account: $99/tahun
├── TestFlight → App Store
└── Cost: $99/tahun
```

---

## 2. Setup EAS Build (One-Time)

### 2.1 Install & Login

```bash
# Install EAS CLI
npm install -g eas-cli

# Login ke Expo account (gratis)
eas login
```

### 2.2 Configure EAS

```bash
cd apps/mobile
eas build:configure
```

Ini generate `eas.json`:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "channel": "preview"
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "channel": "production"
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      }
    }
  }
}
```

### 2.3 Profiles Explained

| Profile | Output | Distribusi | Kapan |
|---------|--------|-----------|-------|
| `development` | APK (debug) | Install manual | Development & testing |
| `preview` | APK (release) | Share ke teman via WA/Drive | Phase B: Friends & Family |
| `production` | AAB (release) | Google Play Store | Phase C: Public |

---

## 3. Build & Share APK (Phase B)

### 3.1 Build Preview APK

```bash
cd apps/mobile

# Build APK untuk Android
eas build --platform android --profile preview
```

- Build berjalan di cloud Expo (gratis 30 builds/bulan)
- Tunggu ~10-15 menit
- Setelah selesai, dapat link download APK

### 3.2 Distribute ke Teman

```
Cara 1: Link langsung
  → EAS kasih link download setelah build selesai
  → Share link via WhatsApp / Telegram
  → Teman klik → download → install

Cara 2: Upload ke Google Drive
  → Download APK dari EAS
  → Upload ke Google Drive
  → Share link ke teman
  → Lebih persistent (link nggak expire)

Cara 3: Firebase App Distribution (optional)
  → Upload APK ke Firebase
  → Invite testers via email
  → Ada auto-update notification
  → Setup: firebase.google.com → App Distribution
```

### 3.3 Yang Teman Perlu Lakukan

```
1. Download APK dari link yang kamu share
2. Kalau ada warning "Install from unknown sources"
   → Settings → Security → Allow unknown sources → ON
   → Atau tap "Install anyway" di popup
3. Install & buka app
4. Login via Google
5. Done!
```

---

## 4. OTA Updates (Tanpa Rebuild APK)

Ini fitur killer Expo — bisa update app teman **tanpa** mereka download APK baru.

### 4.1 Setup EAS Update

```bash
# Install
npx expo install expo-updates

# Configure
eas update:configure
```

### 4.2 Push Update

```bash
# Setelah ada perubahan code (JS/TS only):
eas update --branch preview --message "Fix bug kategori"
```

**Cara kerjanya:**
- Teman buka app → app check update di background
- Kalau ada update → download otomatis
- Next kali buka app → udah versi terbaru
- **Tanpa** perlu download APK baru!

**Limitasi OTA:**
- Hanya untuk perubahan JavaScript/TypeScript
- Kalau ada perubahan native (tambah library native baru) → harus rebuild APK

---

## 5. app.json Configuration

```json
{
  "expo": {
    "name": "DuitKu",
    "slug": "duitku",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0B0F1E"
    },
    "assetBundlePatterns": ["**/*"],
    
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0B0F1E"
      },
      "package": "com.duitku.app",
      "versionCode": 1,
      "permissions": [
        "INTERNET",
        "USE_BIOMETRIC",
        "USE_FINGERPRINT",
        "CAMERA",
        "VIBRATE",
        "RECEIVE_BOOT_COMPLETED"
      ],
      "googleServicesFile": "./google-services.json"
    },
    
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.duitku.app",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "DuitKu memerlukan akses kamera untuk foto struk.",
        "NSFaceIDUsageDescription": "DuitKu menggunakan Face ID untuk keamanan."
      }
    },
    
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-local-authentication",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#00D09C"
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "DuitKu memerlukan akses galeri untuk foto struk."
        }
      ]
    ],
    
    "extra": {
      "eas": {
        "projectId": "xxx-xxx-xxx"
      },
      "apiUrl": "https://api.duitku.app"
    },
    
    "updates": {
      "url": "https://u.expo.dev/xxx-xxx-xxx"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
}
```

---

## 6. Environment & Secrets

### 6.1 Env Variables per Profile

```bash
# Development (local)
# apps/mobile/.env.development
API_URL=http://localhost:8787
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com

# Preview (APK ke teman)
# apps/mobile/.env.preview
API_URL=https://api.duitku.app
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com

# Production (Play Store)
# apps/mobile/.env.production
API_URL=https://api.duitku.app
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

### 6.2 EAS Secrets (for build)

```bash
# Set secrets yang nggak boleh di-commit
eas secret:create --name GOOGLE_CLIENT_ID --value "xxx" --scope project
eas secret:create --name GOOGLE_CLIENT_SECRET --value "xxx" --scope project
```

---

## 7. Versioning Strategy

### Semantic Versioning

```
Format: MAJOR.MINOR.PATCH
Example: 1.2.3

MAJOR → Breaking changes (rare)
MINOR → New features
PATCH → Bug fixes
```

### Version Bump Workflow

```bash
# Bump version sebelum build
# package.json: version field
# app.json: version + android.versionCode

# Contoh:
# v1.0.0 → MVP launch ke teman
# v1.1.0 → Tambah fitur budget
# v1.1.1 → Fix bug sync
# v1.2.0 → Tambah parser Tokopedia
# v2.0.0 → Play Store launch + premium features
```

### Android versionCode

```
versionCode HARUS naik setiap build untuk Play Store.
Untuk APK distribution, technically nggak wajib tapi best practice tetap naikkan.

Strategy: versionCode = MAJOR * 10000 + MINOR * 100 + PATCH
v1.0.0 → 10000
v1.1.0 → 10100
v1.2.3 → 10203
v2.0.0 → 20000
```

---

## 8. Build Commands Cheatsheet

```bash
# ─── Development ───────────────────────────
npx expo start                          # Start dev server
npx expo start --android                # Start + open on Android

# ─── Build APK (share ke teman) ───────────
eas build -p android --profile preview  # Build preview APK
                                         # → Download link setelah selesai

# ─── OTA Update (tanpa rebuild) ───────────
eas update --branch preview --message "Deskripsi update"

# ─── Build for Play Store ─────────────────
eas build -p android --profile production   # Build AAB
eas submit -p android --profile production  # Submit ke Play Store

# ─── Build iOS (nanti) ────────────────────
eas build -p ios --profile production       # Build IPA
eas submit -p ios --profile production      # Submit ke App Store

# ─── Check build status ──────────────────
eas build:list                          # List all builds
```

---

## 9. Pre-Build Checklist (Sebelum Share APK ke Teman)

```
□ App icon sudah ada (1024x1024 PNG)
   → assets/icon.png
   → assets/adaptive-icon.png (Android adaptive)

□ Splash screen sudah ada
   → assets/splash.png (1284x2778 recommended)

□ API Worker sudah deployed ke Cloudflare
   → wrangler deploy

□ D1 database sudah di-migrate
   → wrangler d1 migrations apply duitku-db

□ Google OAuth2 sudah setup
   → Google Cloud Console → OAuth consent screen
   → Android client ID created (dengan SHA-1 fingerprint)

□ Environment variables sudah set
   → eas secret:create (semua secrets)

□ Test di device sendiri dulu
   → Login flow works
   → Gmail sync works
   → Manual input works
   → Data persists

□ Build preview APK
   → eas build -p android --profile preview
   → Test APK di device lain sebelum share
```

---

## 10. Cost Summary

| Phase | Item | Cost |
|-------|------|------|
| **A: Development** | Expo (free tier) | $0 |
| | Cloudflare (free tier) | $0 |
| | Google Cloud Console | $0 |
| **B: Friends APK** | EAS Build (30 free/month) | $0 |
| | APK distribution | $0 |
| | OTA updates | $0 |
| **C: Play Store** | Google Play Console | $25 (sekali) |
| **D: iOS (nanti)** | Apple Developer Program | $99/tahun |
| | | |
| **Total Phase A+B** | | **$0** |
| **Total Phase A+B+C** | | **$25** |
| **Total semua** | | **$25 + $99/tahun** |
