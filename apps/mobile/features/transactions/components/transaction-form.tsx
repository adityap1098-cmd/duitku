/**
 * TransactionForm — add/edit form for transactions.
 * Fields: type toggle, amount, category picker, description, date, notes.
 * Validates amount as positive integer before submission.
 */

import { useState, useCallback } from 'react';
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
import { Colors, Typography, Spacing, BorderRadius } from '../../../constants/theme';
import { DEFAULT_CATEGORIES } from '@duitku/shared';
import type {
  Transaction,
  TransactionType,
  CreateTransactionInput,
  CategoryHint,
} from '@duitku/shared';

interface TransactionFormProps {
  /** Pre-fill values for edit mode */
  initialValues?: Transaction;
  /** Called with validated input on submit */
  onSubmit: (data: CreateTransactionInput) => void;
  /** Whether the form is submitting */
  isSubmitting?: boolean;
}

/**
 * Get today's date in YYYY-MM-DD format.
 */
function getTodayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Validate a date string matches YYYY-MM-DD format.
 */
function isValidDate(str: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str));
}

export default function TransactionForm({
  initialValues,
  onSubmit,
  isSubmitting = false,
}: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(
    initialValues?.type ?? 'expense'
  );
  const [amountText, setAmountText] = useState(
    initialValues?.amount != null ? String(initialValues.amount) : ''
  );
  const [category, setCategory] = useState<CategoryHint>(
    initialValues?.category ?? 'other'
  );
  const [description, setDescription] = useState(
    initialValues?.description ?? ''
  );
  const [date, setDate] = useState(
    initialValues?.date?.split('T')[0] ?? getTodayISO()
  );
  const [notes, setNotes] = useState(initialValues?.notes ?? '');

  const handleSubmit = useCallback(() => {
    // Validate amount: must be non-empty, positive integer, no decimals
    const trimmedAmount = amountText.trim();
    if (!trimmedAmount) {
      Alert.alert('Error', 'Jumlah harus diisi');
      return;
    }
    if (!/^\d+$/.test(trimmedAmount)) {
      Alert.alert('Error', 'Jumlah harus angka bulat positif (tanpa desimal)');
      return;
    }
    const amount = parseInt(trimmedAmount, 10);
    if (amount <= 0) {
      Alert.alert('Error', 'Jumlah harus lebih dari 0');
      return;
    }

    // Validate date
    if (!isValidDate(date)) {
      Alert.alert('Error', 'Format tanggal harus YYYY-MM-DD');
      return;
    }

    const input: CreateTransactionInput = {
      type,
      amount,
      category,
      description: description.trim() || undefined,
      date,
      notes: notes.trim() || undefined,
    };

    onSubmit(input);
  }, [type, amountText, category, description, date, notes, onSubmit]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Type toggle */}
      <Text style={styles.label}>Tipe</Text>
      <View style={styles.typeToggle}>
        <Pressable
          style={[
            styles.typeButton,
            type === 'expense' && styles.typeButtonActiveExpense,
          ]}
          onPress={() => setType('expense')}
        >
          <Text
            style={[
              styles.typeText,
              type === 'expense' && styles.typeTextActive,
            ]}
          >
            Pengeluaran
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.typeButton,
            type === 'income' && styles.typeButtonActiveIncome,
          ]}
          onPress={() => setType('income')}
        >
          <Text
            style={[
              styles.typeText,
              type === 'income' && styles.typeTextActive,
            ]}
          >
            Pemasukan
          </Text>
        </Pressable>
      </View>

      {/* Amount */}
      <Text style={styles.label}>Jumlah (Rp)</Text>
      <TextInput
        style={styles.input}
        value={amountText}
        onChangeText={setAmountText}
        placeholder="Contoh: 150000"
        placeholderTextColor={Colors.textMuted}
        keyboardType="numeric"
        returnKeyType="next"
      />

      {/* Category picker */}
      <Text style={styles.label}>Kategori</Text>
      <View style={styles.categoryGrid}>
        {DEFAULT_CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            style={[
              styles.categoryChip,
              category === cat.id && styles.categoryChipActive,
            ]}
            onPress={() => setCategory(cat.id)}
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

      {/* Description */}
      <Text style={styles.label}>Deskripsi</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
        placeholder="Opsional"
        placeholderTextColor={Colors.textMuted}
        returnKeyType="next"
      />

      {/* Date */}
      <Text style={styles.label}>Tanggal</Text>
      <TextInput
        style={styles.input}
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={Colors.textMuted}
        returnKeyType="next"
      />

      {/* Notes */}
      <Text style={styles.label}>Catatan</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Opsional"
        placeholderTextColor={Colors.textMuted}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      {/* Submit button */}
      <Pressable
        style={({ pressed }) => [
          styles.submitButton,
          pressed && styles.submitPressed,
          isSubmitting && styles.submitDisabled,
        ]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.submitText}>
          {isSubmitting
            ? 'Menyimpan...'
            : initialValues
              ? 'Simpan Perubahan'
              : 'Tambah Transaksi'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  notesInput: {
    minHeight: 80,
  },
  typeToggle: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  typeButtonActiveExpense: {
    borderColor: Colors.expense,
    backgroundColor: Colors.expense + '20',
  },
  typeButtonActiveIncome: {
    borderColor: Colors.income,
    backgroundColor: Colors.income + '20',
  },
  typeText: {
    ...Typography.body,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  typeTextActive: {
    color: Colors.text,
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
