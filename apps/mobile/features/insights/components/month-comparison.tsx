/**
 * MonthComparison — current vs previous month spending with per-category changes.
 * Green for decreased spending, red for increased (expense context).
 */

import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/theme-context';
import { formatRupiah } from '../../../lib/format';
import { DEFAULT_CATEGORIES } from '@duitku/shared';
import type { MonthComparison as MonthComparisonType, CategoryChange } from '@duitku/shared';
import type { ColorPalette, TypographySet } from '../../../constants/theme';

interface MonthComparisonProps {
  data: MonthComparisonType | null | undefined;
}

/**
 * Format YYYY-MM to human-readable month label.
 */
function formatMonth(yyyyMm: string): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const parts = yyyyMm.split('-');
  const monthIndex = parseInt(parts[1], 10) - 1;
  return months[monthIndex] ?? yyyyMm;
}

/**
 * Get category icon from DEFAULT_CATEGORIES.
 */
function getCategoryIcon(categoryId: string): string {
  return DEFAULT_CATEGORIES.find((c) => c.id === categoryId)?.icon ?? '📦';
}

/**
 * Format change percentage with sign and arrow.
 * Negative change = spending decreased = good (green).
 * Positive change = spending increased = bad (red).
 */
function formatChange(percentage: number, Colors: ColorPalette): { text: string; color: string } {
  if (percentage === 0) return { text: '→ 0%', color: Colors.textMuted };
  const arrow = percentage > 0 ? '↑' : '↓';
  const color = percentage > 0 ? Colors.error : Colors.success;
  return { text: `${arrow} ${Math.abs(percentage).toFixed(1)}%`, color };
}

export default function MonthComparison({ data }: MonthComparisonProps) {
  const { Colors, Typography, Spacing, BorderRadius } = useTheme();
  const styles = useMemo(() => createStyles(Colors, Typography, Spacing, BorderRadius), [Colors, Typography, Spacing, BorderRadius]);

  if (!data) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📅</Text>
        <Text style={styles.emptyText}>Belum bisa dibandingkan</Text>
        <Text style={styles.emptySubtext}>
          Butuh data minimal 2 bulan untuk perbandingan
        </Text>
      </View>
    );
  }

  const totalChange = formatChange(data.change_percentage, Colors);

  return (
    <View style={styles.container}>
      {/* Summary card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          {/* Current month */}
          <View style={styles.monthBlock}>
            <Text style={styles.monthLabel}>{formatMonth(data.current_month)}</Text>
            <Text style={styles.monthAmount}>{formatRupiah(data.current_total)}</Text>
          </View>

          {/* Divider with change */}
          <View style={styles.changeBlock}>
            <Text style={[styles.changeText, { color: totalChange.color }]}>
              {totalChange.text}
            </Text>
            <Text style={styles.changeAmount}>
              {data.change_amount > 0 ? '+' : ''}{formatRupiah(data.change_amount)}
            </Text>
          </View>

          {/* Previous month */}
          <View style={[styles.monthBlock, styles.monthBlockRight]}>
            <Text style={styles.monthLabel}>{formatMonth(data.previous_month)}</Text>
            <Text style={[styles.monthAmount, styles.previousAmount]}>
              {formatRupiah(data.previous_total)}
            </Text>
          </View>
        </View>
      </View>

      {/* Category changes */}
      {data.category_changes.length > 0 && (
        <View style={styles.categoryList}>
          <Text style={styles.sectionTitle}>Detail per Kategori</Text>
          {data.category_changes.map((item: CategoryChange) => {
            const change = formatChange(
              item.previous > 0
                ? ((item.current - item.previous) / item.previous) * 100
                : item.current > 0 ? 100 : 0,
              Colors
            );
            return (
              <View key={item.category} style={styles.categoryRow}>
                <Text style={styles.categoryIcon}>
                  {getCategoryIcon(item.category)}
                </Text>
                <Text style={styles.categoryLabel} numberOfLines={1}>
                  {item.label}
                </Text>
                <View style={styles.categoryAmounts}>
                  <Text style={styles.categoryAmount}>
                    {formatRupiah(item.current)}
                  </Text>
                  <Text style={[styles.categoryChange, { color: change.color }]}>
                    {change.text}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function createStyles(Colors: ColorPalette, Typography: TypographySet, Spacing: any, BorderRadius: any) {
  return StyleSheet.create({
    container: {
      gap: Spacing.sm,
    },
    summaryCard: {
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    monthBlock: {
      flex: 1,
    },
    monthBlockRight: {
      alignItems: 'flex-end',
    },
    monthLabel: {
      ...Typography.label,
      color: Colors.textMuted,
      marginBottom: Spacing.xs,
    },
    monthAmount: {
      fontSize: 18,
      fontWeight: '700',
      color: Colors.text,
    },
    previousAmount: {
      color: Colors.textSecondary,
    },
    changeBlock: {
      alignItems: 'center',
      paddingHorizontal: Spacing.sm,
    },
    changeText: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 2,
    },
    changeAmount: {
      ...Typography.label,
      color: Colors.textMuted,
    },
    categoryList: {
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
    },
    sectionTitle: {
      ...Typography.caption,
      fontWeight: '600',
      color: Colors.textSecondary,
      marginBottom: Spacing.sm,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.xs,
    },
    categoryIcon: {
      fontSize: 18,
      marginRight: Spacing.sm,
    },
    categoryLabel: {
      ...Typography.caption,
      color: Colors.text,
      flex: 1,
    },
    categoryAmounts: {
      alignItems: 'flex-end',
    },
    categoryAmount: {
      ...Typography.caption,
      fontWeight: '500',
      color: Colors.text,
    },
    categoryChange: {
      ...Typography.label,
      fontSize: 11,
    },
    emptyContainer: {
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.xl,
      alignItems: 'center',
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: Spacing.sm,
    },
    emptyText: {
      ...Typography.body,
      fontWeight: '500',
      marginBottom: Spacing.xs,
    },
    emptySubtext: {
      ...Typography.caption,
      color: Colors.textMuted,
      textAlign: 'center',
    },
  });
}
