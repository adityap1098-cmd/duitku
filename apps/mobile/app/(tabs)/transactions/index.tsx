/**
 * Transactions list screen — filterable list with FAB to add new transaction.
 */

import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { useTransactions } from '../../../features/transactions/hooks/use-transactions';
import TransactionCard from '../../../features/transactions/components/transaction-card';
import TransactionFilters from '../../../features/transactions/components/transaction-filters';
import type { TransactionFilter, Transaction } from '@duitku/shared';

/**
 * Get the first and last day of the current month as ISO strings.
 */
function getCurrentMonthRange(): { date_from: string; date_to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { date_from: fmt(firstDay), date_to: fmt(lastDay) };
}

export default function TransactionsScreen() {
  const router = useRouter();
  const monthRange = getCurrentMonthRange();

  const [filter, setFilter] = useState<TransactionFilter>({
    page: 1,
    per_page: 20,
    ...monthRange,
  });

  const { data, isLoading, error, refetch } = useTransactions(filter);
  const transactions = data?.data ?? [];

  const handleFilterChange = useCallback((newFilter: TransactionFilter) => {
    setFilter(newFilter);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionCard transaction={item} />
    ),
    []
  );

  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transaksi</Text>
      </View>

      <TransactionFilters filter={filter} onFilterChange={handleFilterChange} />

      {isLoading && transactions.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Gagal memuat transaksi</Text>
          <Pressable style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>Belum ada transaksi</Text>
          <Text style={styles.emptyHint}>
            Tekan tombol + untuk menambah transaksi
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
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
        onPress={() => router.push('/(tabs)/transactions/add')}
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
    paddingBottom: 80, // space for FAB
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
