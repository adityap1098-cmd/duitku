/**
 * Add Transaction screen — renders TransactionForm and submits via mutation.
 */

import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../../../contexts/theme-context';
import TransactionForm from '../../../features/transactions/components/transaction-form';
import { useCreateTransaction } from '../../../features/transactions/hooks/use-transaction-mutations';
import type { CreateTransactionInput } from '@duitku/shared';
import type { ColorPalette, TypographySet } from '../../../constants/theme';

export default function AddTransactionScreen() {
  const router = useRouter();
  const { Colors, Typography, Spacing } = useTheme();
  const styles = useMemo(() => createStyles(Colors, Typography, Spacing), [Colors, Typography, Spacing]);
  const createMutation = useCreateTransaction();

  const handleSubmit = (data: CreateTransactionInput) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        router.back();
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Tambah Transaksi</Text>
        <View style={styles.headerSpacer} />
      </View>

      <TransactionForm
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
      />
    </SafeAreaView>
  );
}

function createStyles(Colors: ColorPalette, Typography: TypographySet, Spacing: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
      paddingHorizontal: Spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: Spacing.md,
      paddingBottom: Spacing.md,
    },
    backButton: {
      padding: Spacing.xs,
      marginRight: Spacing.sm,
    },
    title: {
      ...Typography.h2,
      flex: 1,
    },
    headerSpacer: {
      width: 32,
    },
  });
}
