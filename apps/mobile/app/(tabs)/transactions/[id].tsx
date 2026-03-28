/**
 * Transaction detail/edit screen — loads transaction by ID, shows pre-filled form, allows update & delete.
 */

import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../../../contexts/theme-context';
import { get } from '../../../lib/api-client';
import TransactionForm from '../../../features/transactions/components/transaction-form';
import {
  useUpdateTransaction,
  useDeleteTransaction,
} from '../../../features/transactions/hooks/use-transaction-mutations';
import { transactionKeys } from '../../../features/transactions/hooks/use-transactions';
import type { Transaction, CreateTransactionInput, ApiResponse } from '@duitku/shared';
import type { ColorPalette, TypographySet } from '../../../constants/theme';

export default function TransactionDetailScreen() {
  const router = useRouter();
  const { Colors, Typography, Spacing, BorderRadius } = useTheme();
  const styles = useMemo(() => createStyles(Colors, Typography, Spacing, BorderRadius), [Colors, Typography, Spacing, BorderRadius]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  // Fetch transaction by ID
  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: transactionKeys.detail(id ?? ''),
    queryFn: () => get<ApiResponse<Transaction>>(`/transactions/${id}`),
    enabled: !!id,
  });

  const transaction = response?.data;

  const handleSubmit = (data: CreateTransactionInput) => {
    if (!id) return;
    updateMutation.mutate(
      { id, input: data },
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
      'Hapus Transaksi',
      'Yakin ingin menghapus transaksi ini?',
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
        <Text style={styles.title}>Edit Transaksi</Text>
        <Pressable onPress={handleDelete} style={styles.deleteButton}>
          <MaterialIcons name="delete-outline" size={24} color={Colors.error} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error || !transaction ? (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Transaksi tidak ditemukan</Text>
          <Pressable
            style={styles.backLink}
            onPress={() => router.back()}
          >
            <Text style={styles.backLinkText}>Kembali</Text>
          </Pressable>
        </View>
      ) : (
        <TransactionForm
          initialValues={transaction}
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
