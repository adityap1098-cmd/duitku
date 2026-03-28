/**
 * CategoryPieChart — donut chart of spending by category.
 * Uses react-native-gifted-charts PieChart with a vivid palette
 * designed for contrast against both dark and light backgrounds.
 */

import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useTheme } from '../../../contexts/theme-context';
import { formatRupiah } from '../../../lib/format';
import type { CategoryBreakdown } from '@duitku/shared';
import type { ColorPalette, TypographySet } from '../../../constants/theme';

interface CategoryPieChartProps {
  data: CategoryBreakdown[];
}

/**
 * Vivid color palette that pops on dark backgrounds.
 * 11 colors for 11 categories — wraps if more are ever added.
 */
const CHART_COLORS = [
  '#22C55E', // green (food)
  '#3B82F6', // blue (transport)
  '#F59E0B', // amber (shopping)
  '#EC4899', // pink (subscription)
  '#8B5CF6', // violet (topup)
  '#06B6D4', // cyan (transfer)
  '#EF4444', // red (bills)
  '#F97316', // orange (entertainment)
  '#14B8A6', // teal (health)
  '#A78BFA', // light violet (education)
  '#64748B', // slate (other)
];

export default function CategoryPieChart({ data }: CategoryPieChartProps) {
  const { Colors, Typography, Spacing, BorderRadius } = useTheme();
  const styles = useMemo(() => createStyles(Colors, Typography, Spacing, BorderRadius), [Colors, Typography, Spacing, BorderRadius]);

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyText}>Belum ada data pengeluaran</Text>
        <Text style={styles.emptySubtext}>
          Mulai catat transaksi untuk melihat breakdown kategori
        </Text>
      </View>
    );
  }

  const pieData = data.map((item, index) => ({
    value: item.amount,
    color: CHART_COLORS[index % CHART_COLORS.length],
    text: `${item.percentage}%`,
  }));

  return (
    <View style={styles.container}>
      {/* Donut chart */}
      <View style={styles.chartWrapper}>
        <PieChart
          data={pieData}
          donut
          radius={100}
          innerRadius={60}
          innerCircleColor={Colors.surface}
          centerLabelComponent={() => (
            <View style={styles.centerLabel}>
              <Text style={styles.centerTitle}>Total</Text>
              <Text style={styles.centerAmount} numberOfLines={1} adjustsFontSizeToFit>
                {formatRupiah(data.reduce((sum, d) => sum + d.amount, 0))}
              </Text>
            </View>
          )}
        />
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {data.map((item, index) => (
          <View key={item.category} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] },
              ]}
            />
            <Text style={styles.legendIcon}>{item.icon}</Text>
            <Text style={styles.legendLabel} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={styles.legendAmount}>{formatRupiah(item.amount)}</Text>
            <Text style={styles.legendPercent}>{item.percentage}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(Colors: ColorPalette, Typography: TypographySet, Spacing: any, BorderRadius: any) {
  return StyleSheet.create({
    container: {
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
    },
    chartWrapper: {
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    centerLabel: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerTitle: {
      ...Typography.label,
      color: Colors.textMuted,
    },
    centerAmount: {
      fontSize: 14,
      fontWeight: '700',
      color: Colors.text,
    },
    legend: {
      gap: Spacing.xs,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.xs,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: BorderRadius.full,
      marginRight: Spacing.sm,
    },
    legendIcon: {
      fontSize: 16,
      marginRight: Spacing.xs,
    },
    legendLabel: {
      ...Typography.caption,
      color: Colors.text,
      flex: 1,
    },
    legendAmount: {
      ...Typography.caption,
      fontWeight: '500',
      color: Colors.text,
      marginRight: Spacing.sm,
    },
    legendPercent: {
      ...Typography.label,
      color: Colors.textMuted,
      width: 36,
      textAlign: 'right',
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
