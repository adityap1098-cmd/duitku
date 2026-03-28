/**
 * Budget list screen — shows all budgets with spending progress, FAB to add.
 * Replaces the placeholder with a real data-driven screen.
 */

import { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { formatRupiah } from '../../../lib/format';
import { useBudgetStatus } from '../../../features/budget/hooks/use-budgets';
import BudgetCard from '../../../features/budget/components/budget-card';
import type { BudgetWithSpending } from '@duitku/shared';

export default function BudgetScreen() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useBudgetStatus();

  const budgetStatus = data?.data;
  const budgets = budgetStatus?.budgets ?? [];

  // Compute totals from budget data
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

  const renderItem = useCallback(
    ({ item }: { item: BudgetWithSpending }) => (
      <BudgetCard budget={item} />
    ),
    []
  );

  const keyExtractor = useCallback(
    (item: BudgetWithSpending) => item.id,
    []
  );

  const renderHeader = useCallback(
    () =>
      budgets.length > 0 ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Total Bulan Ini</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Terpakai</Text>
              <Text style={styles.summaryAmount}>
                {formatRupiah(totalSpent)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Budget</Text>
              <Text style={styles.summaryAmount}>
                {formatRupiah(totalBudget)}
              </Text>
            </View>
          </View>
        </View>
      ) : null,
    [budgets.length, totalBudget, totalSpent]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Budget</Text>
      </View>

      {isLoading && budgets.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Gagal memuat budget</Text>
          <Pressable style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : budgets.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>💰</Text>
          <Text style={styles.emptyText}>Belum ada budget</Text>
          <Text style={styles.emptyHint}>
            Tekan tombol + untuk membuat budget bulanan
          </Text>
        </View>
      ) : (
        <FlatList
          data={budgets}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}

      {/* Floating Action Button */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
        ]}
        onPress={() => router.push('/(tabs)/budget/add')}
      >
        <MaterialIcons name="add" size={28} color={Colors.text} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
  },
  header: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    ...Typography.h1,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  summaryTitle: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    ...Typography.label,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  summaryAmount: {
    ...Typography.h3,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
    marginBottom: Spacing.xs,
  },
  emptyHint: {
    ...Typography.caption,
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    marginBottom: Spacing.md,
  },
  retryButton: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryText: {
    ...Typography.body,
    color: Colors.primary,
  },
  listContent: {
    paddingBottom: 80,
  },
  fab: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.card,
  },
  fabPressed: {
    backgroundColor: Colors.primaryDark,
  },
});
