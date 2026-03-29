/**
 * Notification helper — handles permission requests and local push notifications
 * for budget threshold alerts. Uses expo-notifications for cross-platform support.
 * 
 * IMPORTANT: expo-notifications is NOT available in Expo Go on Android SDK 53+.
 * All functions gracefully degrade to no-ops when unavailable.
 */

import { Platform } from 'react-native';
import { DEFAULT_CATEGORIES } from '@duitku/shared';
import { formatRupiah } from './format';
import type { CategoryHint } from '@duitku/shared';

// Lazy-load expo-notifications to prevent crash in Expo Go
let Notifications: typeof import('expo-notifications') | null = null;
let notificationsAvailable = false;

try {
  Notifications = require('expo-notifications');
  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  notificationsAvailable = true;
} catch {
  console.warn('[notifications] Not available in this environment (Expo Go)');
}

// Re-export PermissionStatus so callers don't need to import expo-notifications
type PermissionStatus = 'granted' | 'denied' | 'undetermined';

// --------------- Permission Helpers ---------------

export async function initNotifications(): Promise<boolean> {
  if (!notificationsAvailable || !Notifications) return false;
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();

    if (status !== 'granted') {
      console.log('[notifications] Permission denied by user');
      return false;
    }

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

export async function getNotificationPermissionStatus(): Promise<PermissionStatus> {
  if (!notificationsAvailable || !Notifications) return 'undetermined';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status as PermissionStatus;
  } catch {
    return 'undetermined';
  }
}

// --------------- Budget Alert Notifications ---------------

function getCategoryLabel(category: CategoryHint): string {
  const found = DEFAULT_CATEGORIES.find((c) => c.id === category);
  return found ? found.label : category;
}

export async function scheduleBudgetAlert(
  category: CategoryHint,
  percentage: number,
  spent: number,
  limit: number
): Promise<void> {
  if (!notificationsAvailable || !Notifications) return;
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
      trigger: null,
    });

    console.log(
      `[notifications] Budget alert sent: ${categoryLabel} at ${percentage}%`
    );
  } catch (error) {
    console.error('[notifications] Failed to schedule budget alert:', error);
  }
}
