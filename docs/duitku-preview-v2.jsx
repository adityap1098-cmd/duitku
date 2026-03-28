import { useState } from "react";

const C = {
  bg: "#0B0F1E",
  card: "#131A2E",
  cardAlt: "#1A2240",
  cardBorder: "#1E2A4A",
  hero1: "#4A3ABA",
  hero2: "#6C5CE7",
  hero3: "#8B7CF0",
  accent: "#00D09C",
  accentDim: "rgba(0,208,156,0.12)",
  teal: "#0D9488",
  tealBg: "#0F2E2C",
  red: "#FF5A7E",
  redDim: "rgba(255,90,126,0.12)",
  orange: "#FFB347",
  orangeDim: "rgba(255,179,71,0.12)",
  blue: "#5B8DEF",
  blueDim: "rgba(91,141,239,0.12)",
  purple: "#A78BFA",
  purpleDim: "rgba(167,139,250,0.12)",
  pink: "#F472B6",
  pinkDim: "rgba(244,114,182,0.12)",
  yellow: "#FBBF24",
  yellowDim: "rgba(251,191,36,0.12)",
  white: "#FFFFFF",
  t1: "#FFFFFF",
  t2: "#8B9DC3",
  t3: "#4A5C80",
  synced: "#00D09C",
  manual: "#5B8DEF",
};

const categories = [
  { name: "Makanan", icon: "🍔", color: C.orange, dim: C.orangeDim, spent: 1450000, budget: 2000000 },
  { name: "Transport", icon: "🚗", color: C.blue, dim: C.blueDim, spent: 680000, budget: 1000000 },
  { name: "Belanja", icon: "🛒", color: C.purple, dim: C.purpleDim, spent: 2100000, budget: 2500000 },
  { name: "Langganan", icon: "💳", color: C.pink, dim: C.pinkDim, spent: 350000, budget: 500000 },
  { name: "Tagihan", icon: "🏠", color: C.accent, dim: C.accentDim, spent: 1200000, budget: 1500000 },
  { name: "Lainnya", icon: "📦", color: C.yellow, dim: C.yellowDim, spent: 420000, budget: 750000 },
];

const transactions = [
  { id: 1, desc: "GrabFood - Mie Gacoan", amount: 45000, cat: "🍔", catName: "Makanan", platform: "grab", source: "gmail", bank: "OVO", date: "25 MAR 2026", time: "12:34" },
  { id: 2, desc: "Alfamart Regular D", amount: 94500, cat: "🛒", catName: "Belanja", platform: null, source: "gmail", bank: "BCA", date: "25 MAR 2026", time: "10:15" },
  { id: 3, desc: "GoRide ke Kantor", amount: 28000, cat: "🚗", catName: "Transport", platform: "gojek", source: "gmail", bank: "GOPAY", date: "25 MAR 2026", time: "08:20" },
  { id: 4, desc: "Shopee - Case HP", amount: 89000, cat: "🛒", catName: "Belanja", platform: "shopee", source: "gmail", bank: "SHOPEEPAY", date: "24 MAR 2026", time: "20:45" },
  { id: 5, desc: "Netflix Monthly", amount: 186000, cat: "💳", catName: "Langganan", platform: "netflix", source: "gmail", bank: "BCA", date: "24 MAR 2026", time: "03:00" },
  { id: 6, desc: "Kopi Kenangan", amount: 32000, cat: "🍔", catName: "Makanan", platform: null, source: "manual", bank: null, date: "24 MAR 2026", time: "15:20" },
  { id: 7, desc: "Token PLN 200K", amount: 200000, cat: "🏠", catName: "Tagihan", platform: "tokopedia", source: "gmail", bank: "BCA", date: "23 MAR 2026", time: "09:00" },
  { id: 8, desc: "Spotify Premium", amount: 54990, cat: "💳", catName: "Langganan", platform: "spotify", source: "gmail", bank: "DANA", date: "23 MAR 2026", time: "03:00" },
  { id: 9, desc: "Unknown", amount: 1, cat: "📦", catName: "Lainnya", platform: null, source: "gmail", bank: "SEABANK", date: "23 MAR 2026", time: "01:12" },
  { id: 10, desc: "GrabCar ke Bandara", amount: 185000, cat: "🚗", catName: "Transport", platform: "grab", source: "gmail", bank: "OVO", date: "22 MAR 2026", time: "05:30" },
];

const recurring = [
  { name: "Netflix", amount: 186000, freq: "Bulanan", next: "25 Apr", icon: "🎬", color: C.red },
  { name: "Spotify", amount: 54990, freq: "Bulanan", next: "20 Apr", icon: "🎵", color: C.accent },
  { name: "YouTube Premium", amount: 109000, freq: "Bulanan", next: "1 Apr", icon: "▶️", color: C.red },
  { name: "iCloud 50GB", amount: 15000, freq: "Bulanan", next: "5 Apr", icon: "☁️", color: C.blue },
  { name: "Domain .app", amount: 210000, freq: "Tahunan", next: "12 Dec", icon: "🌐", color: C.purple },
];

const fmt = (n) => "Rp " + n.toLocaleString("id-ID");

const PlatformBadge = ({ platform }) => {
  const p = {
    grab: { l: "Grab", c: "#00B14F" }, gojek: { l: "Gojek", c: "#00AA13" },
    shopee: { l: "Shopee", c: "#EE4D2D" }, tokopedia: { l: "Tokped", c: "#42B549" },
    netflix: { l: "Netflix", c: "#E50914" }, spotify: { l: "Spotify", c: "#1DB954" },
  }[platform];
  if (!p) return null;
  return <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: p.c + "25", color: p.c, fontWeight: 700 }}>{p.l}</span>;
};

const SourceBadge = ({ source }) => (
  <span style={{
    fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700,
    background: source === "gmail" ? C.accentDim : C.blueDim,
    color: source === "gmail" ? C.accent : C.blue,
  }}>
    {source === "gmail" ? "📧 Synced" : "✏️ Manual"}
  </span>
);

const BankLabel = ({ bank }) => {
  if (!bank) return null;
  return <span style={{ fontSize: 10, color: C.t3, fontWeight: 500 }}>{bank}</span>;
};

const ProgressBar = ({ pct, color, h = 6 }) => (
  <div style={{ height: h, borderRadius: h / 2, background: C.cardBorder, overflow: "hidden", flex: 1 }}>
    <div style={{ height: "100%", borderRadius: h / 2, background: color, width: `${Math.min(pct, 100)}%`, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
  </div>
);

const DonutChart = ({ data, size = 130 }) => {
  const total = data.reduce((s, d) => s + d.spent, 0);
  let cum = 0;
  const r = 48, circ = 2 * Math.PI * r, gap = 0.008;
  return (
    <svg width={size} height={size} viewBox="0 0 130 130">
      <circle cx="65" cy="65" r={r} fill="none" stroke={C.cardBorder} strokeWidth="13" />
      {data.map((d, i) => {
        const pct = d.spent / total;
        const off = cum;
        cum += pct;
        return <circle key={i} cx="65" cy="65" r={r} fill="none" stroke={d.color} strokeWidth="13"
          strokeDasharray={`${(pct - gap) * circ} ${circ}`} strokeDashoffset={-off * circ}
          strokeLinecap="round" transform="rotate(-90 65 65)" />;
      })}
      <text x="65" y="60" textAnchor="middle" fill={C.t1} fontSize="13" fontWeight="800" fontFamily="'DM Sans',sans-serif">{fmt(total)}</text>
      <text x="65" y="76" textAnchor="middle" fill={C.t2} fontSize="9" fontFamily="'DM Sans',sans-serif">Bulan Ini</text>
    </svg>
  );
};

// ─── SCREENS ─────────────────────────────

const HomeScreen = () => {
  const totalSpent = categories.reduce((s, c) => s + c.spent, 0);
  const todayTxns = transactions.filter(t => t.date === "25 MAR 2026");
  const todayTotal = todayTxns.reduce((s, t) => s + t.amount, 0);
  const week7 = transactions.reduce((s, t) => s + t.amount, 0);
  const groups = [...new Set(transactions.map(t => t.date))];

  return (
    <div style={{ padding: "0 16px 100px" }}>
      {/* Hero Card — inspired by reference */}
      <div style={{
        background: `linear-gradient(135deg, ${C.hero1} 0%, ${C.hero2} 60%, ${C.hero3} 100%)`,
        borderRadius: 22, padding: "22px 22px 18px", marginBottom: 14, position: "relative", overflow: "hidden",
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", right: -20, top: -20, width: 120, height: 120, borderRadius: 60, background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", right: 30, top: 40, width: 80, height: 80, borderRadius: 40, background: "rgba(255,255,255,0.05)" }} />
        
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, margin: 0, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600 }}>
          Total Pengeluaran Bulan Ini
        </p>
        <p style={{ color: C.white, fontSize: 32, fontWeight: 900, margin: "8px 0 10px", letterSpacing: -1 }}>
          {fmt(totalSpent)}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12 }}>✅</span>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 500 }}>
            Terakhir sinkron: 25 Mar • 16.06
          </span>
        </div>
      </div>

      {/* Summary Cards — Hari Ini & 7 Hari */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        <div style={{
          background: `linear-gradient(135deg, ${C.hero1}90, ${C.hero2}70)`,
          borderRadius: 16, padding: "14px 16px",
        }}>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, margin: 0, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>Hari Ini</p>
          <p style={{ color: C.white, fontSize: 20, fontWeight: 800, margin: "6px 0 0", letterSpacing: -0.5 }}>{fmt(todayTotal)}</p>
        </div>
        <div style={{
          background: `linear-gradient(135deg, ${C.teal}90, ${C.tealBg})`,
          borderRadius: 16, padding: "14px 16px",
        }}>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, margin: 0, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>7 Hari Terakhir</p>
          <p style={{ color: C.white, fontSize: 20, fontWeight: 800, margin: "6px 0 0", letterSpacing: -0.5 }}>{fmt(week7)}</p>
        </div>
      </div>

      {/* Transaction List — grouped with daily subtotals */}
      {groups.map(date => {
        const items = transactions.filter(t => t.date === date);
        const dayTotal = items.reduce((s, t) => s + t.amount, 0);
        return (
          <div key={date} style={{ marginBottom: 14 }}>
            {/* Date header with subtotal */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 0 8px 2px" }}>
              <span style={{ color: C.t2, fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>{date}</span>
              <span style={{ color: C.red, fontSize: 11, fontWeight: 700, background: C.redDim, padding: "3px 10px", borderRadius: 10 }}>
                -{fmt(dayTotal)}
              </span>
            </div>
            <div style={{ background: C.card, borderRadius: 16, overflow: "hidden", border: `1px solid ${C.cardBorder}` }}>
              {items.map((t, i) => (
                <div key={t.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px 14px",
                  borderBottom: i < items.length - 1 ? `1px solid ${C.cardBorder}` : "none",
                }}>
                  {/* Category icon with arrow indicator like reference */}
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, background: C.cardAlt,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: `1px solid ${C.cardBorder}`, position: "relative",
                  }}>
                    <span style={{ fontSize: 18 }}>{t.cat}</span>
                    <div style={{
                      position: "absolute", bottom: -2, right: -2, width: 14, height: 14,
                      borderRadius: 4, background: t.source === "gmail" ? C.accent : C.blue,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 7, color: C.bg, fontWeight: 900,
                    }}>{t.source === "gmail" ? "↗" : "✎"}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: C.t1, fontSize: 13, fontWeight: 700, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.desc}</p>
                    <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                      <BankLabel bank={t.bank} />
                      {t.platform && <PlatformBadge platform={t.platform} />}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ color: C.red, fontSize: 14, fontWeight: 800, margin: 0 }}>-{fmt(t.amount)}</p>
                    <p style={{ color: C.t3, fontSize: 10, margin: "3px 0 0" }}>{t.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const StatsScreen = () => {
  const totalSpent = categories.reduce((s, c) => s + c.spent, 0);
  const totalBudget = categories.reduce((s, c) => s + c.budget, 0);
  
  // Fake weekly data for bar chart
  const weeks = [
    { label: "W1", val: 1800000 }, { label: "W2", val: 2200000 },
    { label: "W3", val: 1500000 }, { label: "W4", val: 2700000 },
  ];
  const maxWeek = Math.max(...weeks.map(w => w.val));

  return (
    <div style={{ padding: "0 16px 100px" }}>
      {/* Chart Section */}
      <div style={{ background: C.card, borderRadius: 20, padding: 20, marginBottom: 14, border: `1px solid ${C.cardBorder}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <p style={{ color: C.t1, fontSize: 14, fontWeight: 800, margin: 0 }}>Pengeluaran per Kategori</p>
          <span style={{ color: C.t3, fontSize: 11 }}>Maret 2026</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <DonutChart data={categories} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            {categories.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: c.color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: C.t2, flex: 1 }}>{c.icon} {c.name}</span>
                <span style={{ fontSize: 10, color: C.t1, fontWeight: 700 }}>{Math.round(c.spent / totalSpent * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Bar Chart */}
      <div style={{ background: C.card, borderRadius: 20, padding: 20, marginBottom: 14, border: `1px solid ${C.cardBorder}` }}>
        <p style={{ color: C.t1, fontSize: 14, fontWeight: 800, margin: "0 0 16px" }}>Trend Mingguan</p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 120 }}>
          {weeks.map((w, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 9, color: C.t2, fontWeight: 600 }}>{fmt(w.val).replace("Rp ", "")}</span>
              <div style={{
                width: "100%", borderRadius: 8,
                height: `${(w.val / maxWeek) * 80}px`,
                background: i === weeks.length - 1
                  ? `linear-gradient(180deg, ${C.hero2}, ${C.hero1})`
                  : C.cardAlt,
                transition: "height 0.6s ease",
              }} />
              <span style={{ fontSize: 10, color: C.t3, fontWeight: 600 }}>{w.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Budget vs Actual */}
      <div style={{ background: C.card, borderRadius: 20, padding: 20, border: `1px solid ${C.cardBorder}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <p style={{ color: C.t1, fontSize: 14, fontWeight: 800, margin: 0 }}>Budget vs Aktual</p>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 8,
            background: C.orangeDim, color: C.orange,
          }}>{Math.round(totalSpent / totalBudget * 100)}%</span>
        </div>
        {categories.map((c, i) => {
          const pct = Math.round(c.spent / c.budget * 100);
          return (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: C.t2 }}>{c.icon} {c.name}</span>
                <span style={{ fontSize: 11, color: pct > 90 ? C.red : C.t1, fontWeight: 600 }}>{fmt(c.spent)} / {fmt(c.budget)}</span>
              </div>
              <ProgressBar pct={pct} color={pct > 90 ? C.red : pct > 70 ? C.orange : c.color} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const WalletScreen = () => {
  const wallets = [
    { name: "BCA", type: "Bank", balance: 4500000, icon: "🏦", color: C.blue },
    { name: "Mandiri", type: "Bank", balance: 2100000, icon: "🏦", color: C.yellow },
    { name: "SeaBank", type: "Bank", balance: 850000, icon: "🏦", color: C.teal },
    { name: "OVO", type: "E-wallet", balance: 320000, icon: "💳", color: C.purple },
    { name: "GoPay", type: "E-wallet", balance: 150000, icon: "💳", color: C.accent },
    { name: "ShopeePay", type: "E-wallet", balance: 75000, icon: "💳", color: C.orange },
    { name: "Dana", type: "E-wallet", balance: 200000, icon: "💳", color: C.blue },
    { name: "Cash", type: "Tunai", balance: 500000, icon: "💵", color: C.accent },
  ];
  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);

  return (
    <div style={{ padding: "0 16px 100px" }}>
      {/* Total Balance */}
      <div style={{
        background: `linear-gradient(135deg, ${C.hero1}, ${C.hero2})`,
        borderRadius: 22, padding: "22px", marginBottom: 16, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: -15, top: -15, width: 100, height: 100, borderRadius: 50, background: "rgba(255,255,255,0.06)" }} />
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, margin: 0, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600 }}>Total Saldo</p>
        <p style={{ color: C.white, fontSize: 30, fontWeight: 900, margin: "8px 0 0", letterSpacing: -1 }}>{fmt(totalBalance)}</p>
      </div>

      {/* Wallet groups */}
      {["Bank", "E-wallet", "Tunai"].map(type => {
        const items = wallets.filter(w => w.type === type);
        return (
          <div key={type} style={{ marginBottom: 14 }}>
            <p style={{ color: C.t3, fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: "0 0 8px 2px", textTransform: "uppercase" }}>{type}</p>
            <div style={{ background: C.card, borderRadius: 16, overflow: "hidden", border: `1px solid ${C.cardBorder}` }}>
              {items.map((w, i) => (
                <div key={w.name} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px",
                  borderBottom: i < items.length - 1 ? `1px solid ${C.cardBorder}` : "none",
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, background: w.color + "18",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, border: `1px solid ${w.color}30`,
                  }}>{w.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: C.t1, fontSize: 14, fontWeight: 700, margin: 0 }}>{w.name}</p>
                    <p style={{ color: C.t3, fontSize: 11, margin: "2px 0 0" }}>Saldo terakhir</p>
                  </div>
                  <p style={{ color: C.t1, fontSize: 15, fontWeight: 800, margin: 0 }}>{fmt(w.balance)}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const BudgetScreen = () => {
  const [tab, setTab] = useState("budget");
  return (
    <div style={{ padding: "0 16px 100px" }}>
      <div style={{ display: "flex", gap: 4, background: C.card, borderRadius: 12, padding: 4, marginBottom: 16 }}>
        {[{ id: "budget", label: "💰 Budget" }, { id: "recurring", label: "🔄 Langganan" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px", borderRadius: 10, border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 700,
            background: tab === t.id ? C.accent : "transparent",
            color: tab === t.id ? C.bg : C.t2,
          }}>{t.label}</button>
        ))}
      </div>
      {tab === "budget" ? (
        <>
          <div style={{ background: C.card, borderRadius: 20, padding: 20, marginBottom: 14, border: `1px solid ${C.cardBorder}` }}>
            <p style={{ color: C.t3, fontSize: 10, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Total Budget Maret 2026</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <span style={{ color: C.t1, fontSize: 24, fontWeight: 900 }}>{fmt(categories.reduce((s, c) => s + c.spent, 0))}</span>
              <span style={{ color: C.t2, fontSize: 13 }}>/ {fmt(categories.reduce((s, c) => s + c.budget, 0))}</span>
            </div>
            <ProgressBar pct={Math.round(categories.reduce((s, c) => s + c.spent, 0) / categories.reduce((s, c) => s + c.budget, 0) * 100)} color={C.accent} />
          </div>
          {categories.map((c, i) => {
            const pct = Math.round((c.spent / c.budget) * 100);
            return (
              <div key={i} style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 10, border: `1px solid ${C.cardBorder}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: c.dim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{c.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: C.t1, fontSize: 13, fontWeight: 700, margin: 0 }}>{c.name}</p>
                    <p style={{ color: C.t2, fontSize: 11, margin: "2px 0 0" }}>{fmt(c.spent)} / {fmt(c.budget)}</p>
                  </div>
                  <div style={{
                    background: pct > 90 ? C.redDim : pct > 70 ? C.orangeDim : C.accentDim,
                    color: pct > 90 ? C.red : pct > 70 ? C.orange : C.accent,
                    borderRadius: 8, padding: "4px 8px", fontSize: 12, fontWeight: 800,
                  }}>{pct}%</div>
                </div>
                <ProgressBar pct={pct} color={pct > 90 ? C.red : pct > 70 ? C.orange : c.color} />
                {pct > 80 && <p style={{ color: C.orange, fontSize: 10, margin: "8px 0 0", fontWeight: 600 }}>⚠️ {pct >= 100 ? "Budget habis!" : `Hampir limit (${pct}%)`}</p>}
              </div>
            );
          })}
        </>
      ) : (
        <>
          <div style={{ background: C.card, borderRadius: 20, padding: 20, marginBottom: 14, border: `1px solid ${C.cardBorder}` }}>
            <p style={{ color: C.t3, fontSize: 10, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Total Langganan Bulanan</p>
            <p style={{ color: C.t1, fontSize: 24, fontWeight: 900, margin: "4px 0 0" }}>
              {fmt(recurring.filter(r => r.freq === "Bulanan").reduce((s, r) => s + r.amount, 0))}
              <span style={{ color: C.t2, fontSize: 13, fontWeight: 400 }}> /bulan</span>
            </p>
          </div>
          {recurring.map((r, i) => (
            <div key={i} style={{
              background: C.card, borderRadius: 16, padding: 16, marginBottom: 10,
              border: `1px solid ${C.cardBorder}`, display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: C.cardAlt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, border: `1px solid ${C.cardBorder}` }}>{r.icon}</div>
              <div style={{ flex: 1 }}>
                <p style={{ color: C.t1, fontSize: 13, fontWeight: 700, margin: 0 }}>{r.name}</p>
                <p style={{ color: C.t2, fontSize: 11, margin: "2px 0 0" }}>{r.freq} • Next: {r.next}</p>
              </div>
              <p style={{ color: C.t1, fontSize: 14, fontWeight: 800, margin: 0 }}>{fmt(r.amount)}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

const ProfileScreen = () => {
  const menuSections = [
    {
      title: "AKUN",
      items: [
        { icon: "📧", label: "Gmail Sync", desc: "Connected • adit@gmail.com", color: C.accent },
        { icon: "📂", label: "Kategori", desc: "6 kategori aktif", color: C.blue },
        { icon: "📊", label: "Export Laporan", desc: "Excel (.xlsx)", color: C.purple },
      ]
    },
    {
      title: "PENGATURAN",
      items: [
        { icon: "🔐", label: "Biometric Lock", desc: "Face ID aktif", color: C.accent },
        { icon: "🔔", label: "Notifikasi", desc: "Budget alerts ON", color: C.orange },
        { icon: "🌙", label: "Dark Mode", desc: "Aktif", color: C.blue },
        { icon: "💱", label: "Mata Uang", desc: "IDR (Rupiah)", color: C.purple },
      ]
    }
  ];
  return (
    <div style={{ padding: "0 16px 100px" }}>
      <div style={{ background: C.card, borderRadius: 20, padding: 20, marginBottom: 20, border: `1px solid ${C.cardBorder}`, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${C.hero2}, ${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: C.bg }}>A</div>
        <div>
          <p style={{ color: C.t1, fontSize: 16, fontWeight: 800, margin: 0 }}>Adit</p>
          <p style={{ color: C.t2, fontSize: 12, margin: "2px 0 0" }}>adit@gmail.com</p>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <span style={{ fontSize: 22, cursor: "pointer" }}>🌙</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Transaksi", value: "847", icon: "📋" },
          { label: "Bulan Aktif", value: "6", icon: "📅" },
          { label: "Synced", value: "92%", icon: "📧" },
        ].map((s, i) => (
          <div key={i} style={{ background: C.card, borderRadius: 14, padding: "14px 10px", textAlign: "center", border: `1px solid ${C.cardBorder}` }}>
            <p style={{ fontSize: 18, margin: "0 0 4px" }}>{s.icon}</p>
            <p style={{ color: C.t1, fontSize: 18, fontWeight: 900, margin: 0 }}>{s.value}</p>
            <p style={{ color: C.t2, fontSize: 9, margin: "2px 0 0", letterSpacing: 0.5 }}>{s.label}</p>
          </div>
        ))}
      </div>
      {menuSections.map((section, si) => (
        <div key={si} style={{ marginBottom: 16 }}>
          <p style={{ color: C.t3, fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: "0 0 8px 4px" }}>{section.title}</p>
          <div style={{ background: C.card, borderRadius: 16, overflow: "hidden", border: `1px solid ${C.cardBorder}` }}>
            {section.items.map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer",
                borderBottom: i < section.items.length - 1 ? `1px solid ${C.cardBorder}` : "none",
              }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ color: C.t1, fontSize: 13, fontWeight: 600, margin: 0 }}>{item.label}</p>
                  <p style={{ color: C.t2, fontSize: 11, margin: "1px 0 0" }}>{item.desc}</p>
                </div>
                <span style={{ color: C.t3, fontSize: 14 }}>›</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── MAIN APP ────────────────────────────

export default function DuitKuPreview() {
  const [activeTab, setActiveTab] = useState("home");

  const tabs = [
    { id: "home", svg: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4", label: "Home" },
    { id: "stats", svg: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", label: "Stats" },
    { id: "add", svg: null, label: "" },
    { id: "wallet", svg: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z", label: "Wallet" },
    { id: "profile", svg: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", label: "Me" },
  ];

  const titles = { home: "", stats: "Statistik", wallet: "Wallet", budget: "Budget", profile: "Profile" };
  const actualTab = activeTab === "add" ? "home" : activeTab;

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", background: "#040610", padding: 20,
      fontFamily: "'DM Sans', 'SF Pro Display', -apple-system, sans-serif",
    }}>
      <div style={{
        width: 375, height: 812, background: C.bg, borderRadius: 48,
        border: "3px solid #1A1A2E", overflow: "hidden", position: "relative",
        boxShadow: "0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)",
      }}>
        {/* Status bar */}
        <div style={{ height: 54, padding: "16px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: C.t1, fontSize: 15, fontWeight: 700 }}>9:41</span>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><rect x="0" y="8" width="3" height="4" rx="0.5" fill={C.t1}/><rect x="4.5" y="5" width="3" height="7" rx="0.5" fill={C.t1}/><rect x="9" y="2" width="3" height="10" rx="0.5" fill={C.t1}/><rect x="13.5" y="0" width="2.5" height="12" rx="0.5" fill={C.t1}/></svg>
            <svg width="20" height="12" viewBox="0 0 20 12" fill="none"><rect x="0.5" y="0.5" width="17" height="11" rx="2" stroke={C.t1} strokeWidth="1"/><rect x="18" y="4" width="2" height="4" rx="0.5" fill={C.t1}/><rect x="2" y="2" width="11" height="8" rx="1" fill={C.accent}/></svg>
          </div>
        </div>

        {/* Header */}
        <div style={{ padding: "4px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {actualTab === "home" ? (
            <>
              <div>
                <span style={{ color: C.t2, fontSize: 13 }}>Selamat Datang, </span>
                <span style={{ color: C.t1, fontSize: 17, fontWeight: 900 }}>Adit</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button style={{
                  display: "flex", alignItems: "center", gap: 6, background: C.cardAlt,
                  border: `1px solid ${C.cardBorder}`, borderRadius: 20, padding: "7px 14px", cursor: "pointer",
                }}>
                  <span style={{ fontSize: 12 }}>🔄</span>
                  <span style={{ color: C.t1, fontSize: 12, fontWeight: 700 }}>Sync</span>
                </button>
                <span style={{ fontSize: 20, cursor: "pointer" }}>🌙</span>
              </div>
            </>
          ) : (
            <h1 style={{ color: C.t1, fontSize: 22, fontWeight: 900, margin: 0 }}>{titles[actualTab]}</h1>
          )}
        </div>

        {/* Content */}
        <div style={{ height: "calc(100% - 54px - 46px - 76px)", overflowY: "auto", overflowX: "hidden" }}>
          {actualTab === "home" && <HomeScreen />}
          {actualTab === "stats" && <StatsScreen />}
          {actualTab === "wallet" && <WalletScreen />}
          {actualTab === "budget" && <BudgetScreen />}
          {actualTab === "profile" && <ProfileScreen />}
        </div>

        {/* Bottom Tab Bar — with center FAB */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 76,
          background: "rgba(11,15,30,0.96)", backdropFilter: "blur(24px)",
          borderTop: `1px solid ${C.cardBorder}`,
          display: "flex", justifyContent: "space-around", alignItems: "center",
          paddingBottom: 12,
        }}>
          {tabs.map(t => {
            if (t.id === "add") {
              return (
                <button key="add" style={{
                  width: 52, height: 52, borderRadius: 16, border: "none", cursor: "pointer",
                  background: `linear-gradient(135deg, ${C.hero2}, ${C.hero3})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginTop: -26, boxShadow: `0 8px 28px ${C.hero1}80`,
                  position: "relative", zIndex: 2,
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              );
            }
            const isActive = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "4px 12px", position: "relative", opacity: isActive ? 1 : 0.45,
                transition: "opacity 0.2s",
              }}>
                {isActive && <div style={{ position: "absolute", top: -1, width: 18, height: 2, background: C.accent, borderRadius: 1 }} />}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isActive ? C.accent : C.t2} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={t.svg} />
                </svg>
                <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? C.accent : C.t3, letterSpacing: 0.3 }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
