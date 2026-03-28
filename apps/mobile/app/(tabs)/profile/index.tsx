import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../../../constants/theme';
import { useAuthStore } from '../../../stores/auth-store';
import SyncStatus from '../../../features/sync/components/sync-status';
import ExportSection from '../../../features/export/components/export-section';

export default function ProfileScreen() {
  const { user } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name ?? 'Belum login'}</Text>
          <Text style={styles.userEmail}>
            {user?.email ?? 'Login dengan Google untuk mulai'}
          </Text>
        </View>

        {/* Gmail Sync Section */}
        <View style={styles.syncSection}>
          <SyncStatus />
        </View>

        {/* Export Section */}
        <View style={styles.exportSection}>
          <ExportSection />
        </View>

        <View style={styles.menuSection}>
          <View style={styles.menuItem}>
            <Text style={styles.menuLabel}>Versi App</Text>
            <Text style={styles.menuValue}>0.1.0</Text>
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: Spacing.lg,
  },
  title: {
    ...Typography.h1,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    ...Typography.h1,
    color: Colors.textMuted,
  },
  userName: {
    ...Typography.h3,
    marginBottom: Spacing.xs,
  },
  userEmail: {
    ...Typography.caption,
  },
  syncSection: {
    marginBottom: Spacing.lg,
  },
  exportSection: {
    marginBottom: Spacing.lg,
  },
  menuSection: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
  },
  menuLabel: {
    ...Typography.body,
  },
  menuValue: {
    ...Typography.caption,
  },
});
