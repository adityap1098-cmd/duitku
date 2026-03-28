import { useMemo } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/theme-context';
import { useAuthStore } from '../../../stores/auth-store';
import SyncStatus from '../../../features/sync/components/sync-status';
import type { ColorPalette, TypographySet } from '../../../constants/theme';

export default function HomeScreen() {
  const { Colors, Typography, Spacing, BorderRadius } = useTheme();
  const { user, logout } = useAuthStore();
  const styles = useMemo(() => createStyles(Colors, Typography, Spacing, BorderRadius), [Colors, Typography, Spacing, BorderRadius]);

  return (
    <SafeAreaView style={styles.container}>
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

        {user?.email && (
          <Text style={styles.email}>{user.email}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Total Saldo</Text>
        <Text style={styles.amount}>Rp 0</Text>
      </View>

      <View style={styles.syncIndicator}>
        <SyncStatus compact />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transaksi Terakhir</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Belum ada transaksi</Text>
          <Text style={styles.emptyHint}>
            Sync Gmail untuk import otomatis
          </Text>
        </View>
      </View>

      {/* Temporary logout button for testing */}
      <Pressable
        style={({ pressed }) => [
          styles.logoutButton,
          pressed && styles.logoutButtonPressed,
        ]}
        onPress={logout}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
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
      paddingBottom: Spacing.lg,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.xs,
    },
    greetingSection: {
      flex: 1,
    },
    greeting: {
      ...Typography.caption,
      marginBottom: Spacing.xs,
    },
    userName: {
      ...Typography.h1,
      color: Colors.primary,
    },
    email: {
      ...Typography.caption,
      color: Colors.textMuted,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: BorderRadius.full,
      marginLeft: Spacing.md,
    },
    avatarPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: BorderRadius.full,
      backgroundColor: Colors.primaryDark,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: Spacing.md,
    },
    avatarInitial: {
      ...Typography.h2,
      color: Colors.text,
    },
    card: {
      backgroundColor: Colors.surface,
      borderRadius: 16,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    cardLabel: {
      ...Typography.caption,
      marginBottom: Spacing.xs,
    },
    amount: {
      ...Typography.amount,
      color: Colors.primary,
    },
    section: {
      flex: 1,
    },
    syncIndicator: {
      marginBottom: Spacing.md,
    },
    sectionTitle: {
      ...Typography.h3,
      marginBottom: Spacing.md,
    },
    emptyState: {
      backgroundColor: Colors.surface,
      borderRadius: 12,
      padding: Spacing.xl,
      alignItems: 'center',
    },
    emptyText: {
      ...Typography.body,
      marginBottom: Spacing.xs,
    },
    emptyHint: {
      ...Typography.caption,
      textAlign: 'center',
    },
    logoutButton: {
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: Colors.error + '40',
    },
    logoutButtonPressed: {
      backgroundColor: Colors.surfaceLight,
    },
    logoutText: {
      ...Typography.body,
      color: Colors.error,
      fontWeight: '500',
    },
  });
}
