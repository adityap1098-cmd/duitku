/**
 * Notification helper — handles permission requests and local push notifications
 * for budget threshold alerts. Uses expo-notifications for cross-platform support.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { DEFAULT_CATEGORIES } from '@duitku/shared';
import { formatRupiah } from './format';
import type { CategoryHint } from '@duitku/shared';

// --------------- Configuration ---------------

/** Set default notification handler — show alert even when app is in foreground */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// --------------- Permission Helpers ---------------

/**
 * Request notification permissions. Handles Android 13+ (POST_NOTIFICATIONS)
 * and iOS permission dialogs gracefully.
 *
 * @returns true if permission granted, false if denied
 */
export async function initNotifications(): Promise<boolean> {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') return true;

    // Request permission — on iOS this shows the system dialog,
    // on Android 13+ this requests POST_NOTIFICATIONS
    const { status } = await Notifications.requestPermissionsAsync();

    if (status !== 'granted') {
      console.log('[notifications] Permission denied by user');
      return false;
    }

    // Android: set notification channel for budget alerts
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('budget-alerts', {
        name: 'Budget Alerts',
        description: 'Peringatan saat budget mendekati atau melebihi batas',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F59E0B',
      });
    }

    return true;
  } catch (error) {
    console.error('[notifications] Failed to init:', error);
    return false;
  }
}

/**
 * Check current notification permission status.
 */
export async function getNotificationPermissionStatus(): Promise<
  Notifications.PermissionStatus
> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

// --------------- Budget Alert Notifications ---------------

/**
 * Get the Indonesian display label for a category.
 */
function getCategoryLabel(category: CategoryHint): string {
  const found = DEFAULT_CATEGORIES.find((c) => c.id === category);
  return found ? found.label : category;
}

/**
 * Schedule an immediate local push notification for a budget threshold crossing.
 *
 * @param category - The budget category that crossed the threshold
 * @param percentage - The current spending percentage (e.g., 80 or 100)
 * @param spent - Amount spent in Rupiah (integer)
 * @param limit - Budget limit in Rupiah (integer)
 */
export async function scheduleBudgetAlert(
  category: CategoryHint,
  percentage: number,
  spent: number,
  limit: number
): Promise<void> {
  try {
    const permissionStatus = await getNotificationPermissionStatus();
    if (permissionStatus !== 'granted') {
      console.log('[notifications] Cannot send alert — permission not granted');
      return;
    }

    const categoryLabel = getCategoryLabel(category);
    const isExceeded = percentage >= 100;

    const title = isExceeded
      ? `⚠️ Budget ${categoryLabel} terlampaui!`
      : `⚡ Budget ${categoryLabel} sudah ${percentage}%!`;

    const body = `Terpakai ${formatRupiah(spent)} dari ${formatRupiah(limit)}`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: 'budget-alert',
          category,
          percentage,
        },
        ...(Platform.OS === 'android' && {
          channelId: 'budget-alerts',
        }),
      },
      // Trigger immediately
      trigger: null,
    });

    console.log(
      `[notifications] Budget alert sent: ${categoryLabel} at ${percentage}%`
    );
  } catch (error) {
    // Notification failure should never crash the app
    console.error('[notifications] Failed to schedule budget alert:', error);
  }
}
