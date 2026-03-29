/**
 * SyncStatus — Gmail sync with month range picker.
 * Supports compact mode (icon + time) for home screen,
 * and full mode with month range selector for sync tab.
 */

import { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../../../contexts/theme-context';
import { useSyncStatus, useTriggerSync } from '../hooks/use-sync';
import { Skeleton } from '../../../components/skeleton';
import { mediumImpact } from '../../../lib/haptics';
import type { ColorPalette, TypographySet } from '../../../constants/theme';

interface SyncStatusProps {
  compact?: boolean;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

/** Generate list of months from N months ago to now */
function getMonthOptions(count: number): { label: string; value: string; year: number; month: number }[] {
  const now = new Date();
  const options: { label: string; value: string; year: number; month: number }[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const pad = (n: number) => String(n).padStart(2, '0');
    options.push({
      label: `${MONTH_NAMES[m]} ${y}`,
      value: `${y}-${pad(m + 1)}`,
      year: y,
      month: m,
    });
  }
  return options;
}

/** Get first day of month as YYYY-MM-DD */
function monthStart(value: string): string {
  return `${value}-01`;
}

/** Get last day of month as YYYY-MM-DD */
function monthEnd(value: string): string {
  const [y, m] = value.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return `${value}-${String(lastDay).padStart(2, '0')}`;
}

/** Status icon */
function statusIcon(status: string): string {
  switch (status) {
    case 'completed': return '✅';
    case 'failed': return '❌';
    case 'running': return '🔄';
    default: return '⏳';
  }
}

/** Relative time */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Baru saja';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

export default function SyncStatus({ compact = false }: SyncStatusProps) {
  const { Colors, Typography, Spacing, BorderRadius } = useTheme();
  const styles = useMemo(() => createStyles(Colors, Typography, Spacing, BorderRadius), [Colors, Typography, Spacing, BorderRadius]);
  const { data: statusResponse, isLoading: isLoadingStatus } = useSyncStatus();
  const triggerSync = useTriggerSync();

  const syncLog = statusResponse?.data ?? null;

  // Month range state
  const months = useMemo(() => getMonthOptions(12), []);
  const [startIdx, setStartIdx] = useState(months.length - 1); // default: current month
  const [endIdx, setEndIdx] = useState(months.length - 1);

  const handleMonthTap = useCallback((idx: number) => {
    mediumImpact();
    // If no range started, or tapping before start, set as new start
    if (idx <= startIdx || startIdx === endIdx) {
      setStartIdx(idx);
      setEndIdx(idx);
    } else {
      // Extend range to this month
      setEndIdx(idx);
    }
  }, [startIdx, endIdx]);

  const handleSync = useCallback(() => {
    mediumImpact();
    const after = monthStart(months[startIdx].value);
    const before = monthEnd(months[endIdx].value);
    triggerSync.mutate({ after, before });
  }, [startIdx, endIdx, months, triggerSync]);

  const handleSyncAll = useCallback(() => {
    mediumImpact();
    triggerSync.mutate({});
  }, [triggerSync]);

  // Compact mode
  if (compact) {
    if (isLoadingStatus) {
      return <Skeleton width={150} height={24} borderRadius={8} style={{ backgroundColor: Colors.surfaceLight }} />;
    }
    if (!syncLog) {
      return (
        <View style={styles.compactRow}>
          <Text style={styles.compactIcon}>📧</Text>
          <Text style={styles.compactText}>Gmail belum di-sync</Text>
        </View>
      );
    }
    return (
      <View style={styles.compactRow}>
        <Text style={styles.compactIcon}>{statusIcon(syncLog.status)}</Text>
        <Text style={styles.compactText}>Sync {relativeTime(syncLog.started_at)}</Text>
      </View>
    );
  }

  // Full mode with month range
  const rangeLabel = startIdx === endIdx
    ? months[startIdx].label
    : `${months[startIdx].label} — ${months[endIdx].label}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📧 Gmail Sync</Text>
      </View>

      {/* Last sync status */}
      {syncLog && (
        <View style={styles.statusRow}>
          <Text style={styles.statusIcon}>{statusIcon(syncLog.status)}</Text>
          <Text style={styles.statusText}>
            {syncLog.status === 'completed'
              ? `${syncLog.transactions_created} transaksi baru`
              : syncLog.status === 'failed' ? 'Gagal' : 'Berjalan...'}
          </Text>
          <Text style={styles.timeText}>{relativeTime(syncLog.started_at)}</Text>
        </View>
      )}

      {/* Month range picker */}
      <Text style={styles.sectionLabel}>PILIH PERIODE</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
        {months.map((m, idx) => {
          const isInRange = idx >= startIdx && idx <= endIdx;
          const isEdge = idx === startIdx || idx === endIdx;
          return (
            <Pressable
              key={m.value}
              onPress={() => handleMonthTap(idx)}
              style={[
                styles.monthPill,
                isInRange && styles.monthPillActive,
                isEdge && styles.monthPillEdge,
              ]}
            >
              <Text style={[
                styles.monthPillText,
                isInRange && styles.monthPillTextActive,
              ]}>
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.rangeText}>📅 {rangeLabel}</Text>

      {/* Sync buttons */}
      <View style={styles.buttonRow}>
        <Pressable
          style={({ pressed }) => [
            styles.syncButton,
            pressed && styles.syncButtonPressed,
            triggerSync.isPending && styles.syncButtonDisabled,
          ]}
          onPress={handleSync}
          disabled={triggerSync.isPending}
        >
          <Text style={styles.syncButtonText}>
            {triggerSync.isPending ? 'Syncing...' : `Sync ${rangeLabel}`}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.syncAllButton,
            pressed && styles.syncButtonPressed,
            triggerSync.isPending && styles.syncButtonDisabled,
          ]}
          onPress={handleSyncAll}
          disabled={triggerSync.isPending}
        >
          <Text style={styles.syncAllText}>Sync Semua</Text>
        </Pressable>
      </View>

      {triggerSync.isError && (
        <Text style={styles.errorText}>Gagal memulai sync. Coba lagi.</Text>
      )}
    </View>
  );
}

function createStyles(Colors: ColorPalette, Typography: TypographySet, Spacing: any, BorderRadius: any) {
  return StyleSheet.create({
    container: {
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.base,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    header: {
      marginBottom: Spacing.sm,
    },
    title: {
      ...Typography.h3,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.md,
      paddingBottom: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    statusIcon: {
      fontSize: 14,
      marginRight: Spacing.sm,
    },
    statusText: {
      ...Typography.body,
      flex: 1,
    },
    timeText: {
      ...Typography.caption,
    },
    sectionLabel: {
      ...Typography.label,
      marginBottom: Spacing.sm,
    },
    monthScroll: {
      marginBottom: Spacing.md,
    },
    monthPill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: BorderRadius.full,
      backgroundColor: Colors.surfaceLight,
      marginRight: Spacing.sm,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    monthPillActive: {
      backgroundColor: Colors.accentDim,
      borderColor: Colors.accent + '40',
    },
    monthPillEdge: {
      backgroundColor: Colors.accent + '25',
      borderColor: Colors.accent,
    },
    monthPillText: {
      ...Typography.caption,
      fontWeight: '600',
      color: Colors.textSecondary,
    },
    monthPillTextActive: {
      color: Colors.accent,
    },
    rangeText: {
      ...Typography.caption,
      color: Colors.textMuted,
      marginBottom: Spacing.md,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    syncButton: {
      flex: 1,
      backgroundColor: Colors.accent,
      borderRadius: BorderRadius.md,
      paddingVertical: 14,
      alignItems: 'center',
    },
    syncButtonPressed: {
      opacity: 0.8,
    },
    syncButtonDisabled: {
      opacity: 0.5,
    },
    syncButtonText: {
      ...Typography.bodyBold,
      color: Colors.background,
    },
    syncAllButton: {
      backgroundColor: Colors.surfaceLight,
      borderRadius: BorderRadius.md,
      paddingVertical: 14,
      paddingHorizontal: Spacing.base,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: Colors.border,
    },
    syncAllText: {
      ...Typography.bodyBold,
      color: Colors.textSecondary,
    },
    errorText: {
      ...Typography.caption,
      color: Colors.error,
      marginTop: Spacing.sm,
    },
    compactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.sm,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    compactIcon: {
      fontSize: 14,
      marginRight: Spacing.xs,
    },
    compactText: {
      ...Typography.caption,
    },
  });
}
