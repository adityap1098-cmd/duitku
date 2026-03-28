/**
 * Add Budget screen — renders BudgetForm and submits via mutation.
 * Filters out categories that already have budgets.
 */

import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../../../contexts/theme-context';
import BudgetForm from '../../../features/budget/components/budget-form';
import { useBudgets } from '../../../features/budget/hooks/use-budgets';
import { useCreateBudget } from '../../../features/budget/hooks/use-budget-mutations';
import type { CreateBudgetInput, CategoryHint } from '@duitku/shared';
import type { ColorPalette, TypographySet } from '../../../constants/theme';

export default function AddBudgetScreen() {
  const router = useRouter();
  const { Colors, Typography, Spacing } = useTheme();
  const styles = useMemo(() => createStyles(Colors, Typography, Spacing), [Colors, Typography, Spacing]);
  const createMutation = useCreateBudget();
  const { data } = useBudgets();

  // Extract categories that already have budgets
  const existingCategories: CategoryHint[] =
    data?.data?.map((b) => b.category) ?? [];

  const handleSubmit = (input: CreateBudgetInput) => {
    createMutation.mutate(input, {
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
        <Text style={styles.title}>Buat Budget</Text>
        <View style={styles.headerSpacer} />
      </View>

      <BudgetForm
        existingCategories={existingCategories}
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
