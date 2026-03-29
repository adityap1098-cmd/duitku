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
import { tapLog } from '../../../lib/logger';
import { DEFAULT_CATEGORIES } from '@duitku/shared';
import { getAmountColor } from '../../../constants/theme';
import type { Transaction } from '@duitku/shared';
import type { ColorPalette, TypographySet } from '../../../constants/theme';
import { lightImpact } from '../../../lib/haptics';

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

/** Get platform color from theme */
function getPlatformColor(platform: string, Colors: ColorPalette) {
  switch (platform.toLowerCase()) {
    case 'grab': return Colors.grab;
    case 'gojek': return Colors.gojek;
    case 'shopee': return Colors.shopee;
    case 'tokopedia': return Colors.tokopedia;
    case 'ovo': return Colors.ovo;
    case 'dana': return Colors.dana;
    default: return Colors.accent;
  }
}

export default function TransactionCard({ transaction }: TransactionCardProps) {
  const router = useRouter();
  const { Colors, Typography, Spacing, BorderRadius } = useTheme();
  const styles = useMemo(() => createStyles(Colors, Typography, Spacing, BorderRadius), [Colors, Typography, Spacing, BorderRadius]);
  const category = getCategoryDisplay(transaction.category);
  const isIncome = transaction.type === 'income';

  const amountColor = getAmountColor(
    Colors,
    transaction.amount,
    transaction.type as 'expense' | 'income',
  );

  const handlePress = () => {
    tapLog(`TransactionCard → [id]`, { id: transaction.id, amount: transaction.amount, category: transaction.category });
    lightImpact();
    router.push({
      pathname: '/(tabs)/transactions/[id]',
      params: { id: transaction.id },
    });
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      onPress={handlePress}
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
            { color: amountColor },
          ]}
        >
          {formatRupiah(transaction.amount, transaction.type)}
        </Text>
        <View style={styles.badgeRow}>
          {transaction.platform ? (
            <View style={[
              styles.badge,
              { backgroundColor: getPlatformColor(transaction.platform, Colors) + '20' }
            ]}>
              <Text style={[
                styles.badgeText,
                { color: getPlatformColor(transaction.platform, Colors), textTransform: 'capitalize' }
              ]}>
                {transaction.platform}
              </Text>
            </View>
          ) : transaction.source === 'gmail_sync' ? (
            <View style={[styles.badge, { backgroundColor: Colors.accentDim }]}>
              <Text style={[styles.badgeText, { color: Colors.accent }]}>Synced</Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: Colors.blueDim }]}>
              <Text style={[styles.badgeText, { color: Colors.blue }]}>Manual</Text>
            </View>
          )}
          <Text style={styles.date}>{formatDate(transaction.date)}</Text>
        </View>
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
      borderWidth: 1,
      borderColor: Colors.border,
    },
    pressed: {
      backgroundColor: Colors.surfaceLight,
    },
    iconContainer: {
      width: 42,
      height: 42,
      borderRadius: BorderRadius.md,
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
      ...Typography.amount,
      marginBottom: 4,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    badgeText: {
      ...Typography.badge,
    },
    date: {
      ...Typography.xs,
    },
  });
}
