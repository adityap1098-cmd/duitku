/**
 * RecurringCard — displays a confirmed recurring transaction or a candidate.
 * Candidates show Confirm/Dismiss buttons. Confirmed items show status.
 * Dark theme styling consistent with BudgetCard.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../../constants/theme';
import { formatRupiah } from '../../../lib/format';
import { DEFAULT_CATEGORIES } from '@duitku/shared';
import type { RecurringCandidate, RecurringTransaction } from '@duitku/shared';

interface RecurringCandidateCardProps {
  candidate: RecurringCandidate;
  onConfirm: (candidate: RecurringCandidate) => void;
  onDismiss: (candidate: RecurringCandidate) => void;
}

interface RecurringConfirmedCardProps {
  item: RecurringTransaction;
}

type RecurringCardProps = RecurringCandidateCardProps | RecurringConfirmedCardProps;

/**
 * Type guard: is this a candidate card (has onConfirm/onDismiss)?
 */
function isCandidateProps(props: RecurringCardProps): props is RecurringCandidateCardProps {
  return 'candidate' in props;
}

/**
 * Look up category display metadata.
 */
function getCategoryDisplay(categoryId: string) {
  const found = DEFAULT_CATEGORIES.find((c) => c.id === categoryId);
  return found ?? { icon: '📦', label: categoryId };
}

export default function RecurringCard(props: RecurringCardProps) {
  if (isCandidateProps(props)) {
    return <CandidateCard {...props} />;
  }
  return <ConfirmedCard {...props} />;
}

function CandidateCard({ candidate, onConfirm, onDismiss }: RecurringCandidateCardProps) {
  const category = getCategoryDisplay(candidate.category);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{category.icon}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.description} numberOfLines={1}>
            {candidate.description}
          </Text>
          <Text style={styles.subtitle}>
            {category.label} • {candidate.occurrence_count}x muncul • {candidate.months_active} bulan
          </Text>
        </View>
        <Text style={styles.amount}>
          {formatRupiah(candidate.average_amount)}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.dismissButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => onDismiss(candidate)}
        >
          <Text style={styles.dismissButtonText}>Abaikan</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.confirmButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => onConfirm(candidate)}
        >
          <Text style={styles.confirmButtonText}>Konfirmasi</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ConfirmedCard({ item }: RecurringConfirmedCardProps) {
  const category = getCategoryDisplay(item.category);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{category.icon}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.description} numberOfLines={1}>
            {item.description}
          </Text>
          <Text style={styles.subtitle}>
            {category.label} • per bulan
          </Text>
        </View>
        <View style={styles.amountBlock}>
          <Text style={styles.amount}>
            {formatRupiah(item.estimated_amount)}
          </Text>
          <Text style={styles.confirmedBadge}>✓ Aktif</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  icon: {
    fontSize: 20,
  },
  info: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  description: {
    ...Typography.body,
    fontWeight: '500',
    marginBottom: 2,
  },
  subtitle: {
    ...Typography.label,
    color: Colors.textMuted,
  },
  amount: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text,
  },
  amountBlock: {
    alignItems: 'flex-end',
  },
  confirmedBadge: {
    ...Typography.label,
    color: Colors.success,
    fontSize: 11,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dismissButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
  },
  confirmButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  dismissButtonText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  confirmButtonText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.background,
  },
});
