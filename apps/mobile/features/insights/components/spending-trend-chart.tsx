/**
 * SpendingTrendChart — 6-month line chart of total monthly spending.
 * Uses react-native-gifted-charts LineChart with dark theme styling.
 */

import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Colors, Typography, Spacing, BorderRadius } from '../../../constants/theme';
import { formatRupiah } from '../../../lib/format';
import type { SpendingTrend } from '@duitku/shared';

interface SpendingTrendChartProps {
  data: SpendingTrend[];
}

/**
 * Convert YYYY-MM to short month label (e.g., 'Jan', 'Feb').
 */
function monthLabel(yyyyMm: string): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];
  const monthIndex = parseInt(yyyyMm.split('-')[1], 10) - 1;
  return months[monthIndex] ?? yyyyMm;
}

export default function SpendingTrendChart({ data }: SpendingTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📈</Text>
        <Text style={styles.emptyText}>Belum ada data trend</Text>
        <Text style={styles.emptySubtext}>
          Butuh minimal 1 bulan data untuk menampilkan trend
        </Text>
      </View>
    );
  }

  const lineData = data.map((item) => ({
    value: item.amount,
    label: monthLabel(item.month),
    dataPointText: '',
  }));

  // Find max for Y-axis spacing
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const stepValue = Math.ceil(maxAmount / 4 / 100000) * 100000 || 100000;

  return (
    <View style={styles.container}>
      <LineChart
        data={lineData}
        color={Colors.primary}
        thickness={3}
        curved
        areaChart
        startFillColor={Colors.primary}
        startOpacity={0.3}
        endOpacity={0.05}
        hideDataPoints={false}
        dataPointsColor={Colors.primary}
        dataPointsRadius={5}
        xAxisColor={Colors.border}
        yAxisColor={Colors.border}
        xAxisLabelTextStyle={styles.axisLabel}
        yAxisTextStyle={styles.axisLabel}
        backgroundColor="transparent"
        rulesColor={Colors.border}
        rulesType="dashed"
        spacing={60}
        initialSpacing={20}
        endSpacing={20}
        noOfSections={4}
        stepValue={stepValue}
        maxValue={stepValue * 4}
        formatYLabel={(label: string) => {
          const num = parseInt(label, 10);
          if (num >= 1000000) return `${(num / 1000000).toFixed(1)}jt`;
          if (num >= 1000) return `${(num / 1000).toFixed(0)}rb`;
          return label;
        }}
        pointerConfig={{
          pointerStripColor: Colors.primary,
          pointerStripWidth: 1,
          pointerColor: Colors.primary,
          radius: 6,
          pointerLabelWidth: 120,
          pointerLabelHeight: 40,
          pointerLabelComponent: (items: Array<{ value: number }>) => (
            <View style={styles.tooltipContainer}>
              <Text style={styles.tooltipText}>
                {formatRupiah(items[0]?.value ?? 0)}
              </Text>
            </View>
          ),
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    paddingRight: Spacing.xs,
    overflow: 'hidden',
  },
  axisLabel: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  tooltipContainer: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  tooltipText: {
    ...Typography.label,
    color: Colors.text,
    fontWeight: '600',
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
