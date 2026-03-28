# DuitKu Design System & UI/UX Guide
## For AI Agents & Developers

---

## 1. Visual Hierarchy

Mata user membaca dalam pola F-pattern (scan atas→kiri→bawah). Elemen paling penting harus paling menonjol.

**Hierarchy tools (gunakan kombinasi ini):**
```
SIZE     → Heading besar, body kecil
WEIGHT   → Bold = penting, Regular = supporting
COLOR    → Accent = action, Muted = secondary
SPACING  → Lebih banyak space = lebih penting
```

**Contoh penerapan di DuitKu:**
```tsx
{/* ✅ Good: Jelas mana yang paling penting */}
<View>
  <Text style={{ fontSize: 32, fontWeight: '900', color: '#FFFFFF' }}>
    Rp 6.200.000
  </Text>
  <Text style={{ fontSize: 13, color: '#8B9DC3', marginTop: 4 }}>
    Total Pengeluaran Bulan Ini
  </Text>
  <Pressable style={{ marginTop: 20, backgroundColor: '#00D09C', paddingVertical: 14, borderRadius: 14 }}>
    <Text style={{ fontSize: 15, fontWeight: '700', color: '#0B0F1E', textAlign: 'center' }}>
      Sync Sekarang
    </Text>
  </Pressable>
  <Pressable style={{ marginTop: 10 }}>
    <Text style={{ fontSize: 12, color: '#4A5C80', textAlign: 'center' }}>
      Lihat Detail →
    </Text>
  </Pressable>
</View>

{/* ❌ Bad: Semua ukuran & warna sama, user bingung fokus ke mana */}
<View>
  <Text style={{ fontSize: 16, color: '#FFFFFF' }}>Rp 6.200.000</Text>
  <Text style={{ fontSize: 16, color: '#FFFFFF' }}>Total Pengeluaran</Text>
  <Pressable style={{ backgroundColor: '#333' }}>
    <Text style={{ fontSize: 16, color: '#FFFFFF' }}>Sync</Text>
  </Pressable>
  <Pressable style={{ backgroundColor: '#333' }}>
    <Text style={{ fontSize: 16, color: '#FFFFFF' }}>Detail</Text>
  </Pressable>
</View>
```

---

## 2. Design Tokens

Selalu pakai token dari file ini. JANGAN hardcode angka/warna random.

### Colors

```typescript
// constants/theme.ts

export const colors = {
  // ─── Base ──────────────────────────────
  bg:          '#0B0F1E',     // App background
  card:        '#131A2E',     // Card background
  cardAlt:     '#1A2240',     // Nested/elevated card
  cardBorder:  '#1E2A4A',     // Card borders

  // ─── Text ──────────────────────────────
  text:        '#FFFFFF',     // Primary text (heading, amounts)
  textSec:     '#8B9DC3',     // Secondary text (labels, descriptions)
  textMuted:   '#4A5C80',     // Muted text (timestamps, hints)

  // ─── Accent ────────────────────────────
  accent:      '#00D09C',     // Primary action (sync, confirm, success)
  accentDim:   'rgba(0,208,156,0.12)',

  // ─── Semantic ──────────────────────────
  red:         '#FF5A7E',     // Expense, error, delete, danger
  redDim:      'rgba(255,90,126,0.12)',
  orange:      '#FFB347',     // Warning, approaching limit
  orangeDim:   'rgba(255,179,71,0.12)',
  blue:        '#5B8DEF',     // Info, manual badge, bank
  blueDim:     'rgba(91,141,239,0.12)',
  purple:      '#A78BFA',     // Category accent, premium
  purpleDim:   'rgba(167,139,250,0.12)',
  pink:        '#F472B6',     // Subscription category
  pinkDim:     'rgba(244,114,182,0.12)',
  yellow:      '#FBBF24',     // Attention, highlight
  yellowDim:   'rgba(251,191,36,0.12)',

  // ─── Hero Gradient ────────────────────
  hero1:       '#4A3ABA',     // Gradient start
  hero2:       '#6C5CE7',     // Gradient middle
  hero3:       '#8B7CF0',     // Gradient end
  teal:        '#0D9488',     // Summary card alt

  // ─── Platform Colors ──────────────────
  grab:        '#00B14F',
  gojek:       '#00AA13',
  shopee:      '#EE4D2D',
  tokopedia:   '#42B549',
  ovo:         '#4C2A86',
  dana:        '#108EE9',
  bca:         '#003D79',
  mandiri:     '#003876',
} as const;
```

### Spacing

```typescript
export const spacing = {
  xs:    4,     // Gap kecil (antar badge, inline elements)
  sm:    8,     // Padding internal kecil
  md:    12,    // Gap antar items dalam list
  base:  16,    // Padding card, gap standar
  lg:    20,    // Padding section
  xl:    24,    // Gap antar sections
  '2xl': 32,    // Gap besar (antar major sections)
  '3xl': 40,    // Top/bottom padding screen
} as const;
```

### Border Radius

```typescript
export const radius = {
  sm:    8,     // Badge, tag, small button
  md:    12,    // Input field, small card
  lg:    16,    // Card, list container
  xl:    20,    // Hero card, modal
  '2xl': 22,    // Main hero/banner
  full:  9999,  // Pill button, avatar
} as const;
```

### Typography

```typescript
export const typography = {
  // Heading
  h1:     { fontSize: 32, fontWeight: '900' as const, letterSpacing: -1 },
  h2:     { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.5 },
  h3:     { fontSize: 18, fontWeight: '700' as const },

  // Body
  body:   { fontSize: 14, fontWeight: '400' as const },
  bodyBold: { fontSize: 14, fontWeight: '700' as const },

  // Small
  sm:     { fontSize: 12, fontWeight: '500' as const },
  smBold: { fontSize: 12, fontWeight: '700' as const },
  xs:     { fontSize: 10, fontWeight: '600' as const },

  // Special
  amount: { fontSize: 15, fontWeight: '800' as const },      // Transaction amount
  amountLg: { fontSize: 28, fontWeight: '900' as const },    // Hero amount
  label:  { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1, textTransform: 'uppercase' as const },
  badge:  { fontSize: 9, fontWeight: '700' as const },
} as const;
```

---

## 3. Whitespace Rules

Jangan takut ruang kosong. Whitespace bikin design terasa premium.

```
Rule 1: Card padding MINIMAL 16px (spacing.base)
Rule 2: Antar section MINIMAL 16px gap
Rule 3: Hero card padding 20-24px
Rule 4: Screen horizontal padding 16px
Rule 5: List item vertical padding 12-14px
Rule 6: Antar text lines (margin) minimal 4px
```

```tsx
{/* ✅ Good: Bernafas, premium feel */}
<View style={{ padding: 20, gap: 16 }}>
  <Text style={typography.label}>TOTAL PENGELUARAN</Text>
  <Text style={{ ...typography.amountLg, marginTop: 8 }}>Rp 6.200.000</Text>
</View>

{/* ❌ Bad: Sesak, murah */}
<View style={{ padding: 8 }}>
  <Text>TOTAL PENGELUARAN</Text>
  <Text>Rp 6.200.000</Text>
</View>
```

---

## 4. Color Usage Rules

```
🟢 Accent (green)  → Primary actions: Sync, Confirm, Save, Success state
🔴 Red             → Expenses (amount), Delete, Error, Over-budget
🟠 Orange          → Warning: approaching budget limit (>70%)
🔵 Blue            → Info: manual badge, bank labels, secondary actions
🟣 Purple          → Categories, premium features, decorative
⬛ Dark bg         → Always dark theme (no light mode for now)
```

**Amount coloring:**
```tsx
// Expense → SELALU merah
<Text style={{ color: colors.red, ...typography.amount }}>-Rp 45.000</Text>

// Income → SELALU hijau accent
<Text style={{ color: colors.accent, ...typography.amount }}>+Rp 5.000.000</Text>
```

**Budget progress coloring:**
```tsx
// Dynamic color based on percentage
const getProgressColor = (pct: number) => {
  if (pct > 90) return colors.red;      // Danger!
  if (pct > 70) return colors.orange;   // Warning
  return colors.accent;                  // Safe
};
```

---

## 5. Component Patterns

### Card

```tsx
{/* Standard card */}
<View style={{
  backgroundColor: colors.card,
  borderRadius: radius.lg,        // 16
  padding: spacing.base,          // 16
  borderWidth: 1,
  borderColor: colors.cardBorder,
}}>
  {children}
</View>

{/* Hero card (gradient) */}
<LinearGradient
  colors={[colors.hero1, colors.hero2, colors.hero3]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={{
    borderRadius: radius['2xl'],  // 22
    padding: spacing.lg,          // 20
    overflow: 'hidden',
  }}
>
  {/* Decorative circle (dari referensi UI) */}
  <View style={{
    position: 'absolute', right: -20, top: -20,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  }} />
  {children}
</LinearGradient>
```

### List Item (Transaction)

```tsx
<View style={{
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.md,          // 12
  paddingVertical: 14,
  paddingHorizontal: spacing.base,
  borderBottomWidth: 1,
  borderBottomColor: colors.cardBorder,
}}>
  {/* Icon container — 42x42, radius 12 */}
  <View style={{
    width: 42, height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.cardAlt,
    alignItems: 'center', justifyContent: 'center',
  }}>
    <Text style={{ fontSize: 18 }}>{categoryIcon}</Text>
  </View>

  {/* Content — flex 1 */}
  <View style={{ flex: 1 }}>
    <Text style={{ ...typography.bodyBold, color: colors.text }}>{description}</Text>
    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
      {/* Badges here */}
    </View>
  </View>

  {/* Amount — right aligned */}
  <View style={{ alignItems: 'flex-end' }}>
    <Text style={{ ...typography.amount, color: colors.red }}>-Rp 45.000</Text>
    <Text style={{ ...typography.xs, color: colors.textMuted, marginTop: 2 }}>12:34</Text>
  </View>
</View>
```

### Badge

```tsx
{/* Source badge */}
<View style={{
  backgroundColor: source === 'gmail' ? colors.accentDim : colors.blueDim,
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: radius.sm,    // 8 → tapi badge pakai 4
}}>
  <Text style={{
    ...typography.badge,       // fontSize 9, fontWeight 700
    color: source === 'gmail' ? colors.accent : colors.blue,
  }}>
    {source === 'gmail' ? '📧 Synced' : '✏️ Manual'}
  </Text>
</View>

{/* Platform badge */}
<View style={{
  backgroundColor: platformColor + '25',  // 25% opacity
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
}}>
  <Text style={{ ...typography.badge, color: platformColor }}>
    {platformName}
  </Text>
</View>
```

### Progress Bar

```tsx
<View style={{
  height: 6,
  borderRadius: 3,
  backgroundColor: colors.cardBorder,
  overflow: 'hidden',
}}>
  <View style={{
    height: '100%',
    borderRadius: 3,
    backgroundColor: getProgressColor(percentage),
    width: `${Math.min(percentage, 100)}%`,
  }} />
</View>
```

### Button

```tsx
{/* Primary button */}
<Pressable style={{
  backgroundColor: colors.accent,
  paddingVertical: 14,
  borderRadius: radius.md,      // 12
  alignItems: 'center',
}}>
  <Text style={{ ...typography.bodyBold, color: colors.bg }}>Label</Text>
</Pressable>

{/* Secondary/outline button */}
<Pressable style={{
  backgroundColor: colors.cardAlt,
  paddingVertical: 14,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.cardBorder,
  alignItems: 'center',
}}>
  <Text style={{ ...typography.bodyBold, color: colors.text }}>Label</Text>
</Pressable>

{/* Danger button */}
<Pressable style={{
  backgroundColor: colors.redDim,
  paddingVertical: 14,
  borderRadius: radius.md,
  alignItems: 'center',
}}>
  <Text style={{ ...typography.bodyBold, color: colors.red }}>Hapus</Text>
</Pressable>
```

### FAB (Floating Action Button)

```tsx
{/* Center FAB — tombol "+" di tengah tab bar */}
<Pressable style={{
  width: 52, height: 52,
  borderRadius: radius.lg,         // 16
  backgroundColor: colors.hero2,   // Gradient bisa pakai LinearGradient
  alignItems: 'center', justifyContent: 'center',
  // Elevated from tab bar
  marginTop: -26,
  shadowColor: colors.hero1,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.4,
  shadowRadius: 14,
  elevation: 8,
}}>
  <PlusIcon color="#FFFFFF" size={24} strokeWidth={2.5} />
</Pressable>
```

---

## 6. Screen Layout Pattern

```tsx
{/* Standard screen structure */}
<View style={{ flex: 1, backgroundColor: colors.bg }}>
  {/* Content — scrollable */}
  <ScrollView
    style={{ flex: 1 }}
    contentContainerStyle={{
      padding: spacing.base,        // 16 horizontal
      paddingBottom: 100,            // space for tab bar + FAB
    }}
    showsVerticalScrollIndicator={false}
  >
    {/* Hero section */}
    <HeroCard />

    {/* Summary cards (grid) */}
    <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base }}>
      <SummaryCard flex={1} />
      <SummaryCard flex={1} />
    </View>

    {/* List section */}
    <SectionHeader title="Transaksi Terbaru" action="Lihat Semua →" />
    <Card>
      <TransactionList />
    </Card>
  </ScrollView>
</View>
```

---

## 7. Animation Guidelines

```
PENTING: Jangan over-animate. Animasi harus purposeful.

✅ DO animate:
- Screen transitions (expo-router default)
- Pull-to-refresh
- Progress bar fill (budget)
- Skeleton loading shimmer
- FAB press scale feedback
- Swipe to delete

❌ DON'T animate:
- Every card appearing (terlalu ramai)
- Text content changes
- Color changes on static elements
- Things that distract from financial data
```

**Press feedback:**
```tsx
<Pressable
  style={({ pressed }) => ({
    opacity: pressed ? 0.7 : 1,
    transform: [{ scale: pressed ? 0.98 : 1 }],
  })}
>
```

---

## 8. Empty States

Setiap screen HARUS punya empty state yang helpful.

```tsx
{/* Empty state pattern */}
<View style={{
  alignItems: 'center',
  paddingVertical: spacing['3xl'],
  paddingHorizontal: spacing.xl,
}}>
  <Text style={{ fontSize: 48, marginBottom: spacing.base }}>📭</Text>
  <Text style={{ ...typography.h3, color: colors.text, textAlign: 'center' }}>
    Belum Ada Transaksi
  </Text>
  <Text style={{
    ...typography.sm, color: colors.textSec,
    textAlign: 'center', marginTop: spacing.sm,
  }}>
    Tap + untuk tambah manual, atau sync Gmail untuk import otomatis
  </Text>
  <Pressable style={{
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
  }}>
    <Text style={{ ...typography.bodyBold, color: colors.bg }}>Mulai Sync Gmail</Text>
  </Pressable>
</View>
```

---

## 9. Dark Theme Only (For Now)

DuitKu hanya dark theme. Semua warna di Section 2 sudah dark-optimized.

```
Rationale:
- Finance app sering dibuka malam hari
- Dark = premium feel
- Simpler to maintain (1 theme)
- Light mode bisa ditambah nanti via feature flag
```

---

## 10. DO & DON'T Checklist

```
✅ DO:
- Pakai design tokens dari Section 2 (JANGAN hardcode)
- Expense amount SELALU merah, income SELALU hijau
- Card SELALU punya border (1px cardBorder)
- Badge untuk source (Synced/Manual) di setiap transaksi
- Progress bar berubah warna sesuai persentase
- Empty state di setiap list/screen
- Padding minimal 16px di card
- Spacing konsisten (pakai spacing scale)

❌ DON'T:
- Jangan pakai warna di luar palette tanpa alasan
- Jangan buat font size di luar typography scale
- Jangan buat card tanpa border
- Jangan taruh terlalu banyak info di satu card
- Jangan gunakan light/white background
- Jangan pakai shadow berlebihan (subtle aja, kalau perlu)
- Jangan animasi yang nggak purposeful
- Jangan lupa platform badge di synced transactions
```
