/**
 * TransactionFilters — horizontal filter bar for the transaction list.
 * Provides type chips (All/Income/Expense), category selector, and date range defaults.
 */

import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../../constants/theme';
import { DEFAULT_CATEGORIES } from '@duitku/shared';
import type { TransactionFilter, TransactionType, CategoryHint } from '@duitku/shared';

interface TransactionFiltersProps {
  filter: TransactionFilter;
  onFilterChange: (filter: TransactionFilter) => void;
}

type TypeOption = { label: string; value: TransactionType | undefined };

const TYPE_OPTIONS: TypeOption[] = [
  { label: 'Semua', value: undefined },
  { label: 'Pengeluaran', value: 'expense' },
  { label: 'Pemasukan', value: 'income' },
];

export default function TransactionFilters({
  filter,
  onFilterChange,
}: TransactionFiltersProps) {
  const handleTypeChange = (type: TransactionType | undefined) => {
    onFilterChange({ ...filter, type, page: 1 });
  };

  const handleCategoryChange = (category: CategoryHint | undefined) => {
    onFilterChange({ ...filter, category, page: 1 });
  };

  return (
    <View style={styles.container}>
      {/* Type filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {TYPE_OPTIONS.map((opt) => {
          const active = filter.type === opt.value;
          return (
            <Pressable
              key={opt.label}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => handleTypeChange(opt.value)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}

        {/* Category chips */}
        <View style={styles.divider} />
        {DEFAULT_CATEGORIES.map((cat) => {
          const active = filter.category === cat.id;
          return (
            <Pressable
              key={cat.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() =>
                handleCategoryChange(active ? undefined : cat.id)
              }
            >
              <Text style={styles.chipIcon}>{cat.icon}</Text>
              <Text
                style={[styles.chipText, active && styles.chipTextActive]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  chip: {
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
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '20',
  },
  chipIcon: {
    fontSize: 14,
  },
  chipText: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xs,
  },
});
