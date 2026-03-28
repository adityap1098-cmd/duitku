/**
 * Edit Budget screen — loads budget by ID, shows pre-filled form, allows update & delete.
 */

import { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../../../contexts/theme-context';
import { get } from '../../../lib/api-client';
import BudgetForm from '../../../features/budget/components/budget-form';
import {
  useUpdateBudget,
  useDeleteBudget,
} from '../../../features/budget/hooks/use-budget-mutations';
import { budgetKeys } from '../../../features/budget/hooks/use-budgets';
import type { Budget, CreateBudgetInput, ApiResponse } from '@duitku/shared';
import type { ColorPalette, TypographySet } from '../../../constants/theme';

export default function EditBudgetScreen() {
  const router = useRouter();
  const { Colors, Typography, Spacing, BorderRadius } = useTheme();
  const styles = useMemo(() => createStyles(Colors, Typography, Spacing, BorderRadius), [Colors, Typography, Spacing, BorderRadius]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();

  // Fetch budget by ID
  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: budgetKeys.detail(id ?? ''),
    queryFn: () => get<ApiResponse<Budget>>(`/budgets/${id}`),
    enabled: !!id,
  });

  const budget = response?.data;

  const handleSubmit = (data: CreateBudgetInput) => {
    if (!id) return;
    updateMutation.mutate(
      { id, input: { amount: data.amount } },
      {
        onSuccess: () => {
          router.back();
        },
      }
    );
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      'Hapus Budget',
      'Yakin ingin menghapus budget ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(id, {
              onSuccess: () => {
                router.back();
              },
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Edit Budget</Text>
        <Pressable onPress={handleDelete} style={styles.deleteButton}>
          <MaterialIcons name="delete-outline" size={24} color={Colors.error} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error || !budget ? (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Budget tidak ditemukan</Text>
          <Pressable style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>Kembali</Text>
          </Pressable>
        </View>
      ) : (
        <BudgetForm
          initialValues={budget}
          onSubmit={handleSubmit}
          isSubmitting={updateMutation.isPending}
        />
      )}
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
    deleteButton: {
      padding: Spacing.xs,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: Spacing.xxl,
    },
    errorIcon: {
      fontSize: 48,
      marginBottom: Spacing.md,
    },
    errorText: {
      ...Typography.body,
      color: Colors.error,
      marginBottom: Spacing.md,
    },
    backLink: {
      backgroundColor: Colors.surface,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
    },
    backLinkText: {
      ...Typography.body,
      color: Colors.primary,
    },
  });
}
