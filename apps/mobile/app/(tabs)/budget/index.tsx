import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../../../constants/theme';

export default function BudgetScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Budget</Text>
      </View>

      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>💰</Text>
        <Text style={styles.emptyText}>Belum ada budget</Text>
        <Text style={styles.emptyHint}>
          Buat budget bulanan untuk kontrol pengeluaran
        </Text>
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
  title: {
    ...Typography.h1,
  },
  emptyState: {
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
});
