import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../contexts/theme-context';
import { useAuthStore } from '../../../stores/auth-store';
import { useTransactions, useTransactionSummary } from '../../../features/transactions/hooks/use-transactions';
import TransactionCard from '../../../features/transactions/components/transaction-card';
import SyncStatus from '../../../features/sync/components/sync-status';
import { formatRupiah } from '../../../lib/format';
import { useQueryClient } from '@tanstack/react-query';
import type { ColorPalette, TypographySet } from '../../../constants/theme';

/** Get current month date range (YYYY-MM-DD) */
function getCurrentMonthRange(): { date_from: string; date_to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date_from: `${year}-${pad(month + 1)}-01`,
    date_to: `${year}-${pad(month + 1)}-${pad(lastDay.getDate())}`,
  };
}

export default function HomeScreen() {
  const { Colors, Typography, Spacing, BorderRadius } = useTheme();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const styles = useMemo(() => createStyles(Colors, Typography, Spacing, BorderRadius), [Colors, Typography, Spacing, BorderRadius]);

  // Current month filter for summary
  const monthRange = useMemo(() => getCurrentMonthRange(), []);

  // Fetch summary (current month) and recent transactions
  const { data: summaryRes, isLoading: summaryLoading, refetch: refetchSummary } = useTransactionSummary(monthRange);
  const { data: recentRes, isLoading: recentLoading, refetch: refetchRecent } = useTransactions({ per_page: 5 });

  const summary = summaryRes?.data;

  // Pull-to-refresh
  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchSummary(), refetchRecent()]);
    setRefreshing(false);
  }, [refetchSummary, refetchRecent]);
  const recentTransactions = recentRes?.data ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.greetingSection}>
              <Text style={styles.greeting}>Selamat datang 👋</Text>
              <Text style={styles.userName}>
                {user?.name ?? 'DuitKu'}
              </Text>
            </View>

            {user?.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Hero Card — Gradient */}
        <LinearGradient
          colors={[Colors.hero1, Colors.hero2, Colors.hero3]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Decorative circle */}
          <View style={styles.heroDecor} />

          <Text style={styles.heroLabel}>PENGELUARAN BULAN INI</Text>
          {summaryLoading ? (
            <ActivityIndicator size="small" color="#fff" style={{ marginVertical: 8 }} />
          ) : (
            <Text style={styles.heroAmount}>
              {summary ? formatRupiah(summary.total_expense) : 'Rp 0'}
            </Text>
          )}

          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Pemasukan</Text>
              <Text style={[styles.heroStatValue, { color: '#A5F3C4' }]}>
                {summary ? `+${formatRupiah(summary.total_income)}` : '+Rp 0'}
              </Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Transaksi</Text>
              <Text style={styles.heroStatValue}>
                {summary?.count ?? 0}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Sync Status */}
        <View style={styles.syncSection}>
          <SyncStatus compact />
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaksi Terakhir</Text>

          {recentLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />
          ) : recentTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📧</Text>
              <Text style={styles.emptyText}>Belum ada transaksi</Text>
              <Text style={styles.emptyHint}>
                Sync Gmail untuk import otomatis
              </Text>
            </View>
          ) : (
            recentTransactions.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(Colors: ColorPalette, Typography: TypographySet, Spacing: any, BorderRadius: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    header: {
      paddingHorizontal: Spacing.base,
      paddingTop: Spacing.base,
      paddingBottom: Spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    greetingSection: {
      flex: 1,
    },
    greeting: {
      ...Typography.caption,
      marginBottom: Spacing.xs,
    },
    userName: {
      ...Typography.h2,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.full,
      marginLeft: Spacing.md,
    },
    avatarPlaceholder: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.full,
      backgroundColor: Colors.surfaceLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: Spacing.md,
    },
    avatarInitial: {
      ...Typography.h3,
      color: Colors.accent,
    },

    // ─── Hero Card ──────────────────────
    heroCard: {
      marginHorizontal: Spacing.base,
      borderRadius: BorderRadius.xxl,
      padding: Spacing.lg,
      marginBottom: Spacing.xl,
      overflow: 'hidden',
    },
    heroDecor: {
      position: 'absolute',
      top: -20,
      right: -20,
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    heroLabel: {
      ...Typography.label,
      color: 'rgba(255,255,255,0.7)',
      marginBottom: Spacing.sm,
    },
    heroAmount: {
      ...Typography.amountLg,
      color: '#FFFFFF',
      marginBottom: Spacing.base,
    },
    heroRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    heroStat: {
      flex: 1,
    },
    heroStatDivider: {
      width: 1,
      height: 30,
      backgroundColor: 'rgba(255,255,255,0.2)',
      marginHorizontal: Spacing.md,
    },
    heroStatLabel: {
      ...Typography.xs,
      color: 'rgba(255,255,255,0.6)',
      marginBottom: 2,
    },
    heroStatValue: {
      ...Typography.bodyBold,
      color: '#FFFFFF',
    },

    // ─── Sync ───────────────────────────
    syncSection: {
      paddingHorizontal: Spacing.base,
      marginBottom: Spacing.md,
    },

    // ─── Section ────────────────────────
    section: {
      paddingHorizontal: Spacing.base,
      paddingBottom: Spacing.xxl,
    },
    sectionTitle: {
      ...Typography.h3,
      marginBottom: Spacing.md,
    },

    // ─── Empty State ────────────────────
    emptyState: {
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.xl,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: Colors.border,
    },
    emptyIcon: {
      fontSize: 32,
      marginBottom: Spacing.sm,
    },
    emptyText: {
      ...Typography.body,
      marginBottom: Spacing.xs,
    },
    emptyHint: {
      ...Typography.caption,
      textAlign: 'center',
    },
  });
}
