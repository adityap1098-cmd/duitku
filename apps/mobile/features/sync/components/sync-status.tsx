/**
 * SyncStatus — shows Gmail sync state, last sync time, result counts, and a manual sync button.
 * Supports compact mode (just icon + time) for the home screen.
 */

import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../../constants/theme';
import { useSyncStatus, useTriggerSync } from '../hooks/use-sync';

interface SyncStatusProps {
  /** When true, render only the status icon and relative time (for home screen). */
  compact?: boolean;
}

/** Return a human-readable relative time string from an ISO date. */
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

/** Map sync status to a display icon string. */
function statusIcon(status: string): string {
  switch (status) {
    case 'completed':
      return '✅';
    case 'failed':
      return '❌';
    case 'running':
      return '🔄';
    default:
      return '⏳';
  }
}

export default function SyncStatus({ compact = false }: SyncStatusProps) {
  const { data: statusResponse, isLoading: isLoadingStatus } = useSyncStatus();
  const triggerSync = useTriggerSync();

  const syncLog = statusResponse?.data ?? null;

  // Loading state
  if (isLoadingStatus) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  // Compact mode: icon + relative time only
  if (compact) {
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
        <Text style={styles.compactText}>
          Sync {relativeTime(syncLog.started_at)}
        </Text>
      </View>
    );
  }

  // Full mode: detailed info + sync button
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📧 Gmail Sync</Text>
      </View>

      {!syncLog ? (
        <Text style={styles.emptyText}>Gmail sync belum pernah jalan</Text>
      ) : (
        <View style={styles.details}>
          <View style={styles.statusRow}>
            <Text style={styles.statusIcon}>{statusIcon(syncLog.status)}</Text>
            <Text style={styles.statusText}>
              {syncLog.status === 'completed'
                ? 'Berhasil'
                : syncLog.status === 'failed'
                  ? 'Gagal'
                  : 'Sedang berjalan...'}
            </Text>
            <Text style={styles.timeText}>
              {relativeTime(syncLog.started_at)}
            </Text>
          </View>

          {syncLog.status === 'failed' && syncLog.error_message && (
            <Text style={styles.errorText}>{syncLog.error_message}</Text>
          )}

          {syncLog.status === 'completed' && (
            <View style={styles.countsRow}>
              <View style={styles.countItem}>
                <Text style={styles.countValue}>{syncLog.emails_found}</Text>
                <Text style={styles.countLabel}>Email</Text>
              </View>
              <View style={styles.countItem}>
                <Text style={styles.countValue}>{syncLog.emails_parsed}</Text>
                <Text style={styles.countLabel}>Diparse</Text>
              </View>
              <View style={styles.countItem}>
                <Text style={styles.countValue}>
                  {syncLog.transactions_created}
                </Text>
                <Text style={styles.countLabel}>Transaksi</Text>
              </View>
            </View>
          )}
        </View>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.syncButton,
          pressed && styles.syncButtonPressed,
          triggerSync.isPending && styles.syncButtonDisabled,
        ]}
        onPress={() => triggerSync.mutate()}
        disabled={triggerSync.isPending}
      >
        {triggerSync.isPending ? (
          <ActivityIndicator size="small" color={Colors.text} />
        ) : (
          <Text style={styles.syncButtonText}>Sync Sekarang</Text>
        )}
      </Pressable>

      {triggerSync.isError && (
        <Text style={styles.errorText}>
          Gagal memulai sync. Coba lagi nanti.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  containerCompact: {
    padding: Spacing.sm,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h3,
  },
  emptyText: {
    ...Typography.caption,
    marginBottom: Spacing.md,
  },
  details: {
    marginBottom: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  statusText: {
    ...Typography.body,
    flex: 1,
  },
  timeText: {
    ...Typography.caption,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  countsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  countItem: {
    alignItems: 'center',
  },
  countValue: {
    ...Typography.h3,
    color: Colors.primary,
  },
  countLabel: {
    ...Typography.label,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  compactIcon: {
    fontSize: 14,
    marginRight: Spacing.xs,
  },
  compactText: {
    ...Typography.caption,
  },
  syncButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  syncButtonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
});
