import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../../../constants/theme';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Selamat datang 👋</Text>
        <Text style={styles.title}>DuitKu</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Total Saldo</Text>
        <Text style={styles.amount}>Rp 0</Text>
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
  greeting: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.h1,
    color: Colors.primary,
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
});
