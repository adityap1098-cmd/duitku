/**
 * TransactionFilters — horizontal filter bar for the transaction list.
 * Provides type chips (All/Income/Expense), category selector, search, and date range picker.
 */

import { useMemo, useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useTheme } from '../../../contexts/theme-context';
import { DEFAULT_CATEGORIES } from '@duitku/shared';
import type { TransactionFilter, TransactionType, CategoryHint } from '@duitku/shared';
import type { ColorPalette, TypographySet } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

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
  const { Colors, Typography, Spacing, BorderRadius } = useTheme();
  const styles = useMemo(() => createStyles(Colors, Typography, Spacing, BorderRadius), [Colors, Typography, Spacing, BorderRadius]);

  const [search, setSearch] = useState(filter.search || '');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (filter.search || '')) {
        onFilterChange({ ...filter, search: search || undefined, page: 1 });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleTypeChange = (type: TransactionType | undefined) => {
    onFilterChange({ ...filter, type, page: 1 });
  };

  const handleCategoryChange = (category: CategoryHint | undefined) => {
    onFilterChange({ ...filter, category, page: 1 });
  };

  const clearSearch = () => {
    setSearch('');
    onFilterChange({ ...filter, search: undefined, page: 1 });
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari transaksi..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          maxLength={200}
        />
        {search.length > 0 && (
          <Pressable onPress={clearSearch} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Filter Chips Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {/* Type filter chips */}
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

        <View style={styles.divider} />

        {/* Category chips */}
        {DEFAULT_CATEGORIES.map((cat) => {
          const active = filter.category === cat.id;
          return (
            <Pressable
              key={cat.id}
              style={[
                styles.chip,
                active && styles.chipActive,
                active && { borderColor: Colors.accent, backgroundColor: Colors.accentDim }
              ]}
              onPress={() =>
                handleCategoryChange(active ? undefined : cat.id)
              }
            >
              <Text style={styles.chipIcon}>{cat.icon}</Text>
              <Text
                style={[styles.chipText, active && styles.chipTextActive, active && { color: Colors.accent }]}
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

function createStyles(Colors: ColorPalette, Typography: TypographySet, Spacing: any, BorderRadius: any) {
  return StyleSheet.create({
    container: {
      marginBottom: Spacing.md,
      gap: Spacing.sm,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingHorizontal: Spacing.sm,
      height: 44,
    },
    searchIcon: {
      marginRight: Spacing.xs,
    },
    searchInput: {
      flex: 1,
      ...Typography.body,
      color: Colors.text,
      height: '100%',
    },
    clearButton: {
      padding: Spacing.xs,
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
}
