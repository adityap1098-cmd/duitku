/**
 * Insights screen — composes chart components and recurring detection
 * into a scrollable view. Render-only: all data via TanStack Query hooks.
 */

import { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../../constants/theme';

import {
  useCategoryBreakdown,
  useSpendingTrend,
  useMonthComparison,
} from '../../../features/insights/hooks/use-insights';
import {
  useRecurringList,
  useConfirmRecurring,
  useDismissRecurring,
} from '../../../features/recurring/hooks/use-recurring';

import CategoryPieChart from '../../../features/insights/components/category-pie-chart';
import SpendingTrendChart from '../../../features/insights/components/spending-trend-chart';
import MonthComparison from '../../../features/insights/components/month-comparison';
import RecurringCard from '../../../features/recurring/components/recurring-card';

import type { RecurringCandidate } from '@duitku/shared';

export default function InsightsScreen() {
  // Insight hooks
  const categoryQuery = useCategoryBreakdown();
  const trendQuery = useSpendingTrend(6);
  const comparisonQuery = useMonthComparison();

  // Recurring hooks
  const recurringQuery = useRecurringList();
  const confirmMutation = useConfirmRecurring();
  const dismissMutation = useDismissRecurring();

  const isAnyLoading =
    categoryQuery.isLoading ||
    trendQuery.isLoading ||
    comparisonQuery.isLoading ||
    recurringQuery.isLoading;

  const isRefreshing =
    categoryQuery.isRefetching ||
    trendQuery.isRefetching ||
    comparisonQuery.isRefetching ||
    recurringQuery.isRefetching;

  const handleRefresh = useCallback(() => {
    categoryQuery.refetch();
    trendQuery.refetch();
    comparisonQuery.refetch();
    recurringQuery.refetch();
  }, [categoryQuery, trendQuery, comparisonQuery, recurringQuery]);

  const handleConfirm = useCallback(
    (candidate: RecurringCandidate) => {
      confirmMutation.mutate({
        description: candidate.description,
        category: candidate.category,
        estimated_amount: candidate.average_amount,
      });
    },
    [confirmMutation]
  );

  const handleDismiss = useCallback(
    (candidate: RecurringCandidate) => {
      dismissMutation.mutate(candidate.description);
    },
    [dismissMutation]
  );

  // Extract data
  const categories = categoryQuery.data?.data ?? [];
  const trends = trendQuery.data?.data ?? [];
  const comparison = comparisonQuery.data?.data ?? null;
  const confirmed = recurringQuery.data?.data?.confirmed ?? [];
  const candidates = recurringQuery.data?.data?.candidates ?? [];

  // First load — show full-screen spinner
  if (isAnyLoading && !categoryQuery.data && !trendQuery.data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
            progressBackgroundColor={Colors.surface}
          />
        }
      >
        {/* Section 1: Category Breakdown */}
        <SectionBlock
          title="Pengeluaran per Kategori"
          isLoading={categoryQuery.isLoading}
          error={categoryQuery.error}
          onRetry={() => categoryQuery.refetch()}
        >
          <CategoryPieChart data={categories} />
        </SectionBlock>

        {/* Section 2: Spending Trend */}
        <SectionBlock
          title="Tren Pengeluaran"
          isLoading={trendQuery.isLoading}
          error={trendQuery.error}
          onRetry={() => trendQuery.refetch()}
        >
          <SpendingTrendChart data={trends} />
        </SectionBlock>

        {/* Section 3: Month Comparison */}
        <SectionBlock
          title="Perbandingan Bulan"
          isLoading={comparisonQuery.isLoading}
          error={comparisonQuery.error}
          onRetry={() => comparisonQuery.refetch()}
        >
          <MonthComparison data={comparison} />
        </SectionBlock>

        {/* Section 4: Recurring Expenses */}
        <SectionBlock
          title="Pengeluaran Rutin"
          isLoading={recurringQuery.isLoading}
          error={recurringQuery.error}
          onRetry={() => recurringQuery.refetch()}
        >
          {/* Candidate cards with confirm/dismiss */}
          {candidates.length > 0 && (
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>
                Terdeteksi ({candidates.length})
              </Text>
              {candidates.map((candidate) => (
                <RecurringCard
                  key={candidate.description}
                  candidate={candidate}
                  onConfirm={handleConfirm}
                  onDismiss={handleDismiss}
                />
              ))}
            </View>
          )}

          {/* Confirmed recurring */}
          {confirmed.length > 0 && (
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>
                Dikonfirmasi ({confirmed.length})
              </Text>
              {confirmed.map((item) => (
                <RecurringCard key={item.id} item={item} />
              ))}
            </View>
          )}

          {/* Empty state for recurring */}
          {candidates.length === 0 && confirmed.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔄</Text>
              <Text style={styles.emptyText}>Belum ada pengeluaran rutin</Text>
              <Text style={styles.emptySubtext}>
                Pengeluaran berulang akan terdeteksi otomatis dari riwayat transaksi
              </Text>
            </View>
          )}
        </SectionBlock>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * SectionBlock — reusable section wrapper with h3 header,
 * loading spinner, error/retry, and content slot.
 */
function SectionBlock({
  title,
  isLoading,
  error,
  onRetry,
  children,
}: {
  title: string;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {isLoading ? (
        <View style={styles.sectionLoading}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Gagal memuat data</Text>
          <Pressable style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : (
        children
      )}
    </View>
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
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
  },
  sectionLoading: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  subsection: {
    marginBottom: Spacing.sm,
  },
  subsectionTitle: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  errorContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  retryButton: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.primary,
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
