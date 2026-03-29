/**
 * Insights service — spending analytics: category breakdown, trend, month comparison.
 * All monetary values are INTEGER (Rupiah). Every query filters by user_id (manual RLS).
 */

import type {
  CategoryBreakdown,
  SpendingTrend,
  MonthComparison,
  CategoryChange,
  CategoryHint,
} from '@duitku/shared';
import { DEFAULT_CATEGORIES } from '@duitku/shared';

// --------------- Helpers ---------------

/** Map of category id → display metadata for O(1) lookups. */
const CATEGORY_MAP = new Map(
  DEFAULT_CATEGORIES.map((c) => [c.id, { label: c.label, icon: c.icon }])
);

function getCategoryMeta(category: string): { label: string; icon: string } {
  return CATEGORY_MAP.get(category as CategoryHint) ?? { label: category, icon: '📦' };
}

/**
 * Get the first and last day of a month relative to now.
 * monthOffset: 0 = current, -1 = previous, etc.
 */
function getMonthRange(monthOffset: number): { start: string; end: string; label: string } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + monthOffset; // 0-indexed
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0)); // last day of month

  const y = start.getUTCFullYear();
  const m = String(start.getUTCMonth() + 1).padStart(2, '0');

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    label: `${y}-${m}`,
  };
}

// --------------- Service functions ---------------

/**
 * Category breakdown — total spending per category with labels, icons, and percentages.
 * Optionally filtered by date range.
 */
export async function getCategoryBreakdown(
  db: D1Database,
  userId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{ data: CategoryBreakdown[] }> {
  let sql = `SELECT category, SUM(amount) as total
    FROM transactions
    WHERE user_id = ? AND type = 'expense'`;
  const params: unknown[] = [userId];

  if (dateFrom) {
    sql += ' AND date >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    sql += ' AND date <= ?';
    params.push(dateTo);
  }

  sql += ' GROUP BY category ORDER BY total DESC';

  const result = await db
    .prepare(sql)
    .bind(...params)
    .all<{ category: string; total: number }>();

  const rows = result.results ?? [];
  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

  const data: CategoryBreakdown[] = rows.map((row) => {
    const meta = getCategoryMeta(row.category);
    return {
      category: row.category as CategoryHint,
      label: meta.label,
      icon: meta.icon,
      amount: row.total,
      percentage: grandTotal > 0 ? Math.round((row.total / grandTotal) * 100) : 0,
    };
  });

  return { data };
}

/**
 * Spending trend — monthly expense totals for the last N months.
 */
export async function getSpendingTrend(
  db: D1Database,
  userId: string,
  months: number = 6
): Promise<{ data: SpendingTrend[] }> {
  // Validate months to prevent NaN or extreme values causing Invalid Date
  const safeMonths = isNaN(months) || months < 1 ? 6 : Math.min(months, 24);

  // Calculate start date as N months ago (first day of that month)
  const now = new Date();
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - safeMonths + 1, 1));

  // Guard against Invalid Date
  if (isNaN(startDate.getTime())) {
    return { data: [] };
  }

  const startStr = startDate.toISOString().split('T')[0];

  const result = await db
    .prepare(
      `SELECT strftime('%Y-%m', date) as month, SUM(amount) as amount
       FROM transactions
       WHERE user_id = ? AND type = 'expense' AND date >= ?
       GROUP BY month
       ORDER BY month ASC`
    )
    .bind(userId, startStr)
    .all<{ month: string; amount: number }>();

  return { data: result.results ?? [] };
}

/**
 * Month-over-month comparison — current vs previous month totals + per-category changes.
 */
export async function getMonthComparison(
  db: D1Database,
  userId: string
): Promise<MonthComparison> {
  const current = getMonthRange(0);
  const previous = getMonthRange(-1);

  // Get totals for both months in parallel
  const [currentTotal, previousTotal, currentByCategory, previousByCategory] =
    await Promise.all([
      db
        .prepare(
          `SELECT COALESCE(SUM(amount), 0) as total
           FROM transactions
           WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?`
        )
        .bind(userId, current.start, current.end)
        .first<{ total: number }>(),
      db
        .prepare(
          `SELECT COALESCE(SUM(amount), 0) as total
           FROM transactions
           WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?`
        )
        .bind(userId, previous.start, previous.end)
        .first<{ total: number }>(),
      db
        .prepare(
          `SELECT category, SUM(amount) as total
           FROM transactions
           WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?
           GROUP BY category`
        )
        .bind(userId, current.start, current.end)
        .all<{ category: string; total: number }>(),
      db
        .prepare(
          `SELECT category, SUM(amount) as total
           FROM transactions
           WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?
           GROUP BY category`
        )
        .bind(userId, previous.start, previous.end)
        .all<{ category: string; total: number }>(),
    ]);

  const currentTotalVal = currentTotal?.total ?? 0;
  const previousTotalVal = previousTotal?.total ?? 0;
  const changeAmount = currentTotalVal - previousTotalVal;
  const changePercentage =
    previousTotalVal > 0
      ? Math.round((changeAmount / previousTotalVal) * 100)
      : 0;

  // Build category change map
  const currentMap = new Map(
    (currentByCategory.results ?? []).map((r) => [r.category, r.total])
  );
  const previousMap = new Map(
    (previousByCategory.results ?? []).map((r) => [r.category, r.total])
  );

  // Merge all categories from both months
  const allCategories = new Set([...currentMap.keys(), ...previousMap.keys()]);
  const categoryChanges: CategoryChange[] = [];

  for (const cat of allCategories) {
    const cur = currentMap.get(cat) ?? 0;
    const prev = previousMap.get(cat) ?? 0;
    const meta = getCategoryMeta(cat);
    categoryChanges.push({
      category: cat as CategoryHint,
      label: meta.label,
      current: cur,
      previous: prev,
      change: cur - prev,
    });
  }

  return {
    current_month: current.label,
    previous_month: previous.label,
    current_total: currentTotalVal,
    previous_total: previousTotalVal,
    change_amount: changeAmount,
    change_percentage: changePercentage,
    category_changes: categoryChanges,
  };
}
