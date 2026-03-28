/**
 * TransactionCard — renders a single transaction row.
 * Shows category icon, description, formatted amount (colored by type), and date.
 * Pressable to navigate to the transaction detail/edit screen.
 */

import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/theme-context';
import { formatRupiah } from '../../../lib/format';
import { DEFAULT_CATEGORIES } from '@duitku/shared';
import type { Transaction } from '@duitku/shared';
import type { ColorPalette, TypographySet } from '../../../constants/theme';

interface TransactionCardProps {
  transaction: Transaction;
}

/**
 * Look up the category display metadata (icon + label).
 */
function getCategoryDisplay(categoryId: string) {
  const found = DEFAULT_CATEGORIES.find((c) => c.id === categoryId);
  return found ?? { icon: '📦', label: categoryId };
}

/**
 * Format an ISO date string to a short display format.
 * e.g. "2026-03-28" → "28 Mar 2026"
 */
function formatDate(iso: string): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];
  const [year, month, day] = iso.split('T')[0].split('-');
  const monthIdx = parseInt(month, 10) - 1;
  return `${parseInt(day, 10)} ${months[monthIdx] ?? month} ${year}`;
}

export default function TransactionCard({ transaction }: TransactionCardProps) {
  const router = useRouter();
  const { Colors, Typography, Spacing, BorderRadius } = useTheme();
  const styles = useMemo(() => createStyles(Colors, Typography, Spacing, BorderRadius), [Colors, Typography, Spacing, BorderRadius]);
  const category = getCategoryDisplay(transaction.category);
  const isIncome = transaction.type === 'income';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      onPress={() =>
        router.push({
          pathname: '/(tabs)/transactions/[id]',
          params: { id: transaction.id },
        })
      }
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{category.icon}</Text>
      </View>

      <View style={styles.details}>
        <Text style={styles.categoryLabel} numberOfLines={1}>
          {category.label}
        </Text>
        {transaction.description ? (
          <Text style={styles.description} numberOfLines={1}>
            {transaction.description}
          </Text>
        ) : null}
      </View>

      <View style={styles.amountSection}>
        <Text
          style={[
            styles.amount,
            { color: isIncome ? Colors.income : Colors.expense },
          ]}
        >
          {isIncome ? '+' : '-'} {formatRupiah(transaction.amount)}
        </Text>
        <Text style={styles.date}>{formatDate(transaction.date)}</Text>
      </View>
    </Pressable>
  );
}

function createStyles(Colors: ColorPalette, Typography: TypographySet, Spacing: any, BorderRadius: any) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
    },
    pressed: {
      backgroundColor: Colors.surfaceLight,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.sm,
      backgroundColor: Colors.surfaceLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    icon: {
      fontSize: 22,
    },
    details: {
      flex: 1,
      marginRight: Spacing.sm,
    },
    categoryLabel: {
      ...Typography.body,
      fontWeight: '500',
      marginBottom: 2,
    },
    description: {
      ...Typography.caption,
      color: Colors.textMuted,
    },
    amountSection: {
      alignItems: 'flex-end',
    },
    amount: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
    },
    date: {
      ...Typography.label,
    },
  });
}
