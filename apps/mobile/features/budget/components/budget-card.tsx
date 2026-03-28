/**
 * BudgetCard — renders a single budget with color-coded progress bar.
 * Shows category emoji + label, spending vs limit, percentage text.
 * Green (<80%), yellow (80-99%), red (>=100%).
 * Pressable to navigate to budget edit screen.
 */

import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/theme-context';
import { formatRupiah } from '../../../lib/format';
import { DEFAULT_CATEGORIES } from '@duitku/shared';
import type { BudgetWithSpending } from '@duitku/shared';
import type { ColorPalette, TypographySet } from '../../../constants/theme';

interface BudgetCardProps {
  budget: BudgetWithSpending;
}

/**
 * Look up category display metadata (icon + label).
 */
function getCategoryDisplay(categoryId: string) {
  const found = DEFAULT_CATEGORIES.find((c) => c.id === categoryId);
  return found ?? { icon: '📦', label: categoryId };
}

/**
 * Get progress bar color based on percentage.
 * Green (<80%), yellow (80-99%), red (>=100%).
 */
function getProgressColor(percentage: number, Colors: ColorPalette): string {
  if (percentage >= 100) return Colors.error;
  if (percentage >= 80) return Colors.warning;
  return Colors.success;
}

export default function BudgetCard({ budget }: BudgetCardProps) {
  const router = useRouter();
  const { Colors, Typography, Spacing, BorderRadius } = useTheme();
  const styles = useMemo(() => createStyles(Colors, Typography, Spacing, BorderRadius), [Colors, Typography, Spacing, BorderRadius]);
  const category = getCategoryDisplay(budget.category);
  const progressColor = getProgressColor(budget.percentage, Colors);
  // Clamp progress width to 100% for visual display
  const progressWidth = Math.min(budget.percentage, 100);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      onPress={() =>
        router.push({
          pathname: '/(tabs)/budget/[id]',
          params: { id: budget.id },
        })
      }
    >
      {/* Header: icon + category + percentage */}
      <View style={styles.headerRow}>
        <View style={styles.categorySection}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{category.icon}</Text>
          </View>
          <Text style={styles.categoryLabel} numberOfLines={1}>
            {category.label}
          </Text>
        </View>
        <Text style={[styles.percentageText, { color: progressColor }]}>
          {budget.percentage}%
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progressWidth}%`,
              backgroundColor: progressColor,
            },
          ]}
        />
      </View>

      {/* Footer: spent / limit */}
      <View style={styles.footerRow}>
        <Text style={styles.spentText}>
          {formatRupiah(budget.spent)}
        </Text>
        <Text style={styles.limitText}>
          dari {formatRupiah(budget.amount)}
        </Text>
      </View>
    </Pressable>
  );
}

function createStyles(Colors: ColorPalette, Typography: TypographySet, Spacing: any, BorderRadius: any) {
  return StyleSheet.create({
    container: {
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
    },
    pressed: {
      backgroundColor: Colors.surfaceLight,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    categorySection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: BorderRadius.sm,
      backgroundColor: Colors.surfaceLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.sm,
    },
    icon: {
      fontSize: 18,
    },
    categoryLabel: {
      ...Typography.body,
      fontWeight: '500',
      flex: 1,
    },
    percentageText: {
      fontSize: 16,
      fontWeight: '700',
      marginLeft: Spacing.sm,
    },
    progressTrack: {
      height: 8,
      borderRadius: BorderRadius.full,
      backgroundColor: Colors.surfaceLight,
      overflow: 'hidden',
      marginBottom: Spacing.sm,
    },
    progressFill: {
      height: '100%',
      borderRadius: BorderRadius.full,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    spentText: {
      ...Typography.caption,
      fontWeight: '500',
      color: Colors.text,
    },
    limitText: {
      ...Typography.caption,
      color: Colors.textMuted,
    },
  });
}
