/**
 * Haptics helper — standardizes haptic feedback across the app.
 * As per CLAUDE.md: "Semua gesture WAJIB ada haptic feedback (Haptics.impactAsync)".
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Trigger a light impact haptic.
 * Used for: button taps, chip selections, toggles.
 */
export const lightImpact = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

/**
 * Trigger a medium impact haptic.
 * Used for: primary actions (Save, Confirm), pull-to-refresh success.
 */
export const mediumImpact = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};

/**
 * Trigger a heavy impact haptic.
 * Used for: destructive actions (Delete), long-press multi-select entry.
 */
export const heavyImpact = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
};

/**
 * Trigger a success notification haptic.
 */
export const successHaptic = () => {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
};

/**
 * Trigger an error notification haptic.
 */
export const errorHaptic = () => {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
};

/**
 * Trigger a selection change haptic.
 */
export const selectionHaptic = () => {
  if (Platform.OS !== 'web') {
    Haptics.selectionAsync();
  }
};
