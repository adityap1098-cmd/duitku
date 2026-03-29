/**
 * Transactions list screen — filterable list of all transactions.
 * Uses skeletons for loading and haptics for interactions.
 */

import { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/theme-context';
import { useTransactions } from '../../../features/transactions/hooks/use-transactions';
import TransactionCard from '../../../features/transactions/components/transaction-card';
import TransactionFilters from '../../../features/transactions/components/transaction-filters';
import { TransactionSkeleton } from '../../../components/skeleton';
import { lightImpact, mediumImpact } from '../../../lib/haptics';
import type { TransactionFilter, Transaction } from '@duitku/shared';
import type { ColorPalette, TypographySet } from '../../../constants/theme';

/**
 * Get the first and last day of the current month as ISO strings.
 */
function getCurrentMonthRange(): { date_from: string; date_to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date_from: `${year}-${pad(month + 1)}-01`,
    date_to: `${year}-${pad(month + 1)}-${pad(lastDay.getDate())}`
  };
}

export default function TransactionsScreen() {
  const { Colors, Typography, Spacing, BorderRadius } = useTheme();
  const styles = useMemo(() => createStyles(Colors, Typography, Spacing, BorderRadius), [Colors, Typography, Spacing, BorderRadius]);
  const monthRange = useMemo(() => getCurrentMonthRange(), []);

  const [filter, setFilter] = useState<TransactionFilter>({
    page: 1,
    per_page: 20,
    ...monthRange,
  });

  const { data, isLoading, error, refetch } = useTransactions(filter);
  const transactions = data?.data ?? [];

  const handleFilterChange = useCallback((newFilter: TransactionFilter) => {
    lightImpact();
    setFilter(newFilter);
  }, []);

  const handleRefresh = useCallback(async () => {
    mediumImpact();
    await refetch();
  }, [refetch]);

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
        <View style={styles.listContent}>
          <TransactionSkeleton />
          <TransactionSkeleton />
          <TransactionSkeleton />
          <TransactionSkeleton />
          <TransactionSkeleton />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Gagal memuat transaksi</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              mediumImpact();
              refetch();
            }}
          >
            <Text style={styles.retryText}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>Belum ada transaksi</Text>
          <Text style={styles.emptyHint}>
            Sync Gmail atau tambah transaksi manual
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(Colors: ColorPalette, Typography: TypographySet, Spacing: any, BorderRadius: any) {
  return StyleSheet.create({
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
      paddingBottom: 100,
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
      borderWidth: 1,
      borderColor: Colors.border,
    },
    retryText: {
      ...Typography.bodyBold,
      color: Colors.primary,
    },
    listContent: {
      paddingBottom: 100, // space for tab bar and padding
    },
  });
}
