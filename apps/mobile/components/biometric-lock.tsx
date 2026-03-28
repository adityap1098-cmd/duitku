/**
 * BiometricLock — full-screen lock overlay shown when the app returns
 * from background with biometric lock enabled.
 *
 * Automatically triggers biometric authentication on mount.
 * User can also tap the button to retry.
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authenticateBiometric } from '../lib/biometric';
import { useTheme } from '../contexts/theme-context';
import { Spacing, BorderRadius } from '../constants/theme';

// --------------- Props ---------------

interface BiometricLockProps {
  /** Called when the user successfully authenticates */
  onUnlock: () => void;
}

// --------------- Component ---------------

export function BiometricLock({ onUnlock }: BiometricLockProps) {
  const { Colors, isDark } = useTheme();

  const handleAuthenticate = useCallback(async () => {
    const success = await authenticateBiometric();
    if (success) {
      onUnlock();
    }
  }, [onUnlock]);

  // Trigger authentication immediately on mount
  useEffect(() => {
    handleAuthenticate();
  }, [handleAuthenticate]);

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: Colors.surface },
          ]}
        >
          <Ionicons
            name="lock-closed"
            size={48}
            color={Colors.primary}
          />
        </View>

        <Text style={[styles.title, { color: Colors.text }]}>
          DuitKu Terkunci
        </Text>

        <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>
          Gunakan biometrik untuk membuka
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: Colors.primary }]}
          onPress={handleAuthenticate}
          activeOpacity={0.7}
        >
          <Ionicons
            name="finger-print"
            size={24}
            color="#FFFFFF"
            style={styles.buttonIcon}
          />
          <Text style={styles.buttonText}>Buka Kunci</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --------------- Styles ---------------

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  buttonIcon: {
    marginRight: Spacing.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
