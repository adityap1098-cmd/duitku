/**
 * ExportSection — card component for exporting monthly transaction reports as Excel.
 * Displays month/year pickers and a download button that triggers the share sheet.
 * Matches the SyncStatus card styling used elsewhere on the profile screen.
 */

import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../../contexts/theme-context';
import { useExport } from '../hooks/use-export';
import type { ColorPalette, TypographySet } from '../../../constants/theme';

/** Indonesian month names for the picker. */
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const;

export default function ExportSection() {
  const { Colors, Typography, Spacing, BorderRadius } = useTheme();
  const styles = useMemo(() => createStyles(Colors, Typography, Spacing, BorderRadius), [Colors, Typography, Spacing, BorderRadius]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const { exportMonth, isExporting, error } = useExport();

  // Available years: current year and previous year
  const years = [currentYear, currentYear - 1];

  /** Cycle to the previous month. */
  function handlePrevMonth() {
    if (selectedMonth === 1) {
      // Wrap to December of previous year (if available)
      if (years.includes(selectedYear - 1)) {
        setSelectedMonth(12);
        setSelectedYear(selectedYear - 1);
      }
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  }

  /** Cycle to the next month (capped at current month of current year). */
  function handleNextMonth() {
    const isCurrentYear = selectedYear === currentYear;
    const atCurrentMonth = isCurrentYear && selectedMonth >= currentMonth;

    if (atCurrentMonth) return; // Can't go past current month

    if (selectedMonth === 12) {
      if (selectedYear < currentYear) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      }
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  }

  /** Toggle between available years. */
  function handleToggleYear() {
    const nextYearIndex = (years.indexOf(selectedYear) + 1) % years.length;
    const newYear = years[nextYearIndex];
    setSelectedYear(newYear);

    // If switching to current year and selected month is in the future, cap it
    if (newYear === currentYear && selectedMonth > currentMonth) {
      setSelectedMonth(currentMonth);
    }
  }

  const canGoNext = !(selectedYear === currentYear && selectedMonth >= currentMonth);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📊 Export Laporan</Text>
      </View>

      {/* Year selector */}
      <Pressable style={styles.yearSelector} onPress={handleToggleYear}>
        <Text style={styles.yearText}>{selectedYear}</Text>
        <Text style={styles.yearHint}>Ketuk untuk ganti tahun</Text>
      </Pressable>

      {/* Month selector with prev/next arrows */}
      <View style={styles.monthSelector}>
        <Pressable
          style={styles.arrowButton}
          onPress={handlePrevMonth}
          hitSlop={8}
        >
          <Text style={styles.arrowText}>◀</Text>
        </Pressable>

        <Text style={styles.monthText}>
          {MONTH_NAMES[selectedMonth - 1]}
        </Text>

        <Pressable
          style={[styles.arrowButton, !canGoNext && styles.arrowDisabled]}
          onPress={handleNextMonth}
          disabled={!canGoNext}
          hitSlop={8}
        >
          <Text style={[styles.arrowText, !canGoNext && styles.arrowTextDisabled]}>
            ▶
          </Text>
        </Pressable>
      </View>

      {/* Download button */}
      <Pressable
        style={({ pressed }) => [
          styles.downloadButton,
          pressed && styles.downloadButtonPressed,
          isExporting && styles.downloadButtonDisabled,
        ]}
        onPress={() => exportMonth(selectedYear, selectedMonth)}
        disabled={isExporting}
      >
        {isExporting ? (
          <ActivityIndicator size="small" color={Colors.text} />
        ) : (
          <Text style={styles.downloadButtonText}>Download Excel</Text>
        )}
      </Pressable>

      {/* Error message */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

function createStyles(Colors: ColorPalette, Typography: TypographySet, Spacing: any, BorderRadius: any) {
  return StyleSheet.create({
    container: {
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
    },
    header: {
      marginBottom: Spacing.sm,
    },
    title: {
      ...Typography.h3,
    },
    yearSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Colors.surfaceLight,
      borderRadius: BorderRadius.sm,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.sm,
    },
    yearText: {
      ...Typography.body,
      fontWeight: '600',
      marginRight: Spacing.sm,
    },
    yearHint: {
      ...Typography.label,
    },
    monthSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    arrowButton: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.sm,
      backgroundColor: Colors.surfaceLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    arrowDisabled: {
      opacity: 0.3,
    },
    arrowText: {
      fontSize: 16,
      color: Colors.text,
    },
    arrowTextDisabled: {
      color: Colors.textMuted,
    },
    monthText: {
      ...Typography.h3,
      textAlign: 'center',
      flex: 1,
    },
    downloadButton: {
      backgroundColor: Colors.info,
      borderRadius: BorderRadius.sm,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
    },
    downloadButtonPressed: {
      opacity: 0.85,
    },
    downloadButtonDisabled: {
      opacity: 0.6,
    },
    downloadButtonText: {
      ...Typography.body,
      color: Colors.text,
      fontWeight: '600',
    },
    errorText: {
      ...Typography.caption,
      color: Colors.error,
      marginTop: Spacing.sm,
      textAlign: 'center',
    },
  });
}
