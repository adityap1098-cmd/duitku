/**
 * BudgetForm — create/edit form for budgets.
 * Fields: category picker (single-select chips), amount input (integer, Rupiah).
 * When creating, filters out categories that already have budgets.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useTheme } from '../../../contexts/theme-context';
import { DEFAULT_CATEGORIES } from '@duitku/shared';
import type {
  Budget,
  CreateBudgetInput,
  CategoryHint,
} from '@duitku/shared';
import type { ColorPalette, TypographySet } from '../../../constants/theme';

interface BudgetFormProps {
  /** Pre-fill values for edit mode */
  initialValues?: Budget;
  /** Categories that already have budgets (to filter out in create mode) */
  existingCategories?: CategoryHint[];
  /** Called with validated input on submit */
  onSubmit: (data: CreateBudgetInput) => void;
  /** Whether the form is submitting */
  isSubmitting?: boolean;
}

export default function BudgetForm({
  initialValues,
  existingCategories = [],
  onSubmit,
  isSubmitting = false,
}: BudgetFormProps) {
  const { Colors, Typography, Spacing, BorderRadius } = useTheme();
  const styles = useMemo(() => createStyles(Colors, Typography, Spacing, BorderRadius), [Colors, Typography, Spacing, BorderRadius]);
  const isEditMode = !!initialValues;

  // In create mode, filter out categories that already have budgets
  const availableCategories = isEditMode
    ? DEFAULT_CATEGORIES
    : DEFAULT_CATEGORIES.filter(
        (cat) => !existingCategories.includes(cat.id)
      );

  const [category, setCategory] = useState<CategoryHint>(
    initialValues?.category ?? (availableCategories[0]?.id ?? 'other')
  );
  const [amountText, setAmountText] = useState(
    initialValues?.amount != null ? String(initialValues.amount) : ''
  );

  const handleSubmit = useCallback(() => {
    // Validate amount: must be non-empty, positive integer, no decimals
    const trimmedAmount = amountText.trim();
    if (!trimmedAmount) {
      Alert.alert('Error', 'Jumlah budget harus diisi');
      return;
    }
    if (!/^\d+$/.test(trimmedAmount)) {
      Alert.alert('Error', 'Jumlah harus angka bulat positif (tanpa desimal)');
      return;
    }
    const amount = parseInt(trimmedAmount, 10);
    if (amount <= 0) {
      Alert.alert('Error', 'Jumlah budget harus lebih dari 0');
      return;
    }

    const input: CreateBudgetInput = {
      category,
      amount,
      period: 'monthly',
    };

    onSubmit(input);
  }, [category, amountText, onSubmit]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Category picker */}
      <Text style={styles.label}>Kategori</Text>
      {availableCategories.length === 0 ? (
        <View style={styles.noCategoriesBox}>
          <Text style={styles.noCategoriesText}>
            Semua kategori sudah punya budget
          </Text>
        </View>
      ) : (
        <View style={styles.categoryGrid}>
          {availableCategories.map((cat) => (
            <Pressable
              key={cat.id}
              style={[
                styles.categoryChip,
                category === cat.id && styles.categoryChipActive,
                isEditMode && styles.categoryChipDisabled,
              ]}
              onPress={() => {
                if (!isEditMode) setCategory(cat.id);
              }}
              disabled={isEditMode}
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text
                style={[
                  styles.categoryText,
                  category === cat.id && styles.categoryTextActive,
                ]}
                numberOfLines={1}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Amount */}
      <Text style={styles.label}>Budget Bulanan (Rp)</Text>
      <TextInput
        style={styles.input}
        value={amountText}
        onChangeText={setAmountText}
        placeholder="Contoh: 500000"
        placeholderTextColor={Colors.textMuted}
        keyboardType="numeric"
        returnKeyType="done"
      />
      <Text style={styles.hint}>
        Masukkan jumlah dalam Rupiah (angka bulat)
      </Text>

      {/* Submit button */}
      <Pressable
        style={({ pressed }) => [
          styles.submitButton,
          pressed && styles.submitPressed,
          (isSubmitting || availableCategories.length === 0) &&
            styles.submitDisabled,
        ]}
        onPress={handleSubmit}
        disabled={isSubmitting || availableCategories.length === 0}
      >
        <Text style={styles.submitText}>
          {isSubmitting
            ? 'Menyimpan...'
            : isEditMode
              ? 'Simpan Perubahan'
              : 'Buat Budget'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(Colors: ColorPalette, Typography: TypographySet, Spacing: any, BorderRadius: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingBottom: Spacing.xxl,
    },
    label: {
      ...Typography.caption,
      fontWeight: '600',
      color: Colors.textSecondary,
      marginBottom: Spacing.xs,
      marginTop: Spacing.md,
    },
    input: {
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
      ...Typography.body,
      color: Colors.text,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    hint: {
      ...Typography.label,
      color: Colors.textMuted,
      marginTop: Spacing.xs,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.full,
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.border,
      gap: 4,
    },
    categoryChipActive: {
      borderColor: Colors.primary,
      backgroundColor: Colors.primary + '20',
    },
    categoryChipDisabled: {
      opacity: 0.7,
    },
    categoryIcon: {
      fontSize: 16,
    },
    categoryText: {
      ...Typography.label,
      color: Colors.textSecondary,
    },
    categoryTextActive: {
      color: Colors.primary,
    },
    noCategoriesBox: {
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      alignItems: 'center',
    },
    noCategoriesText: {
      ...Typography.caption,
      color: Colors.textMuted,
    },
    submitButton: {
      backgroundColor: Colors.primary,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      marginTop: Spacing.lg,
    },
    submitPressed: {
      backgroundColor: Colors.primaryDark,
    },
    submitDisabled: {
      opacity: 0.6,
    },
    submitText: {
      ...Typography.body,
      fontWeight: '600',
      color: Colors.text,
    },
  });
}
