import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/theme-context';
import { useAuthStore } from '../../../stores/auth-store';
import { useSettingsStore, type ThemePreference } from '../../../stores/settings-store';
import { checkBiometricAvailability } from '../../../lib/biometric';
import SyncStatus from '../../../features/sync/components/sync-status';
import ExportSection from '../../../features/export/components/export-section';
import type { ColorPalette, TypographySet } from '../../../constants/theme';

const THEME_OPTIONS: { label: string; value: ThemePreference; icon: string }[] = [
  { label: 'Gelap', value: 'dark', icon: '🌙' },
  { label: 'Terang', value: 'light', icon: '☀️' },
  { label: 'Sistem', value: 'system', icon: '📱' },
];

export default function ProfileScreen() {
  const { Colors, Typography, Spacing, BorderRadius } = useTheme();
  const styles = useMemo(() => createStyles(Colors, Typography, Spacing, BorderRadius), [Colors, Typography, Spacing, BorderRadius]);
  const { user, logout } = useAuthStore();

  // Settings store
  const biometricEnabled = useSettingsStore((s) => s.biometricEnabled);
  const setBiometricEnabled = useSettingsStore((s) => s.setBiometricEnabled);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  // Biometric availability
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('none');

  useEffect(() => {
    checkBiometricAvailability().then((result) => {
      setBiometricAvailable(result.available);
      setBiometricType(result.biometricType);
    });
  }, []);

  const handleBiometricToggle = (value: boolean) => {
    setBiometricEnabled(value);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Apakah Anda yakin ingin keluar dari akun?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => logout()
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name ?? 'Belum login'}</Text>
          <Text style={styles.userEmail}>
            {user?.email ?? 'Login dengan Google untuk mulai'}
          </Text>
        </View>

        {/* Gmail Sync Section */}
        <View style={styles.syncSection}>
          <SyncStatus />
        </View>

        {/* Export Section */}
        <View style={styles.exportSection}>
          <ExportSection />
        </View>

        {/* Pengaturan Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>Pengaturan</Text>

          {/* Theme Picker */}
          <View style={styles.settingCard}>
            <Text style={styles.settingLabel}>Tema</Text>
            <View style={styles.themeOptions}>
              {THEME_OPTIONS.map((opt) => {
                const isActive = theme === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.themeChip,
                      isActive && styles.themeChipActive,
                    ]}
                    onPress={() => setTheme(opt.value)}
                  >
                    <Text style={styles.themeIcon}>{opt.icon}</Text>
                    <Text
                      style={[
                        styles.themeLabel,
                        isActive && styles.themeLabelActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Biometric Toggle */}
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Kunci Biometrik</Text>
                <Text style={styles.settingHint}>
                  {biometricAvailable
                    ? `Gunakan ${biometricType} untuk membuka app`
                    : 'Perangkat tidak mendukung biometrik'}
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                disabled={!biometricAvailable}
                trackColor={{
                  false: Colors.surfaceLight,
                  true: Colors.primary + '80',
                }}
                thumbColor={biometricEnabled ? Colors.primary : Colors.textMuted}
              />
            </View>
          </View>
        </View>

        <View style={styles.menuSection}>
          <View style={styles.menuItem}>
            <Text style={styles.menuLabel}>Versi App</Text>
            <Text style={styles.menuValue}>0.1.0</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed
          ]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Keluar Akun</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(Colors: ColorPalette, Typography: TypographySet, Spacing: any, BorderRadius: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
      paddingHorizontal: Spacing.md,
    },
    header: {
      paddingTop: Spacing.md,
      paddingBottom: Spacing.lg,
    },
    title: {
      ...Typography.h1,
    },
    avatarContainer: {
      alignItems: 'center',
      paddingVertical: Spacing.xl,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: Colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    avatarText: {
      ...Typography.h1,
      color: Colors.textMuted,
    },
    userName: {
      ...Typography.h3,
      marginBottom: Spacing.xs,
    },
    userEmail: {
      ...Typography.caption,
    },
    syncSection: {
      marginBottom: Spacing.lg,
    },
    exportSection: {
      marginBottom: Spacing.lg,
    },
    settingsSection: {
      marginBottom: Spacing.lg,
    },
    settingsSectionTitle: {
      ...Typography.h3,
      marginBottom: Spacing.sm,
    },
    settingCard: {
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    settingInfo: {
      flex: 1,
      marginRight: Spacing.md,
    },
    settingLabel: {
      ...Typography.body,
      fontWeight: '500',
      marginBottom: Spacing.xs,
    },
    settingHint: {
      ...Typography.label,
      color: Colors.textMuted,
    },
    themeOptions: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    themeChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.surfaceLight,
      gap: Spacing.xs,
    },
    themeChipActive: {
      borderColor: Colors.primary,
      backgroundColor: Colors.primary + '20',
    },
    themeIcon: {
      fontSize: 16,
    },
    themeLabel: {
      ...Typography.label,
      color: Colors.textSecondary,
    },
    themeLabelActive: {
      color: Colors.primary,
      fontWeight: '600',
    },
    menuSection: {
      backgroundColor: Colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: Spacing.lg,
    },
    menuItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.md,
      borderBottomColor: Colors.border,
      borderBottomWidth: 1,
    },
    menuLabel: {
      ...Typography.body,
    },
    menuValue: {
      ...Typography.caption,
    },
    logoutButton: {
      backgroundColor: Colors.redDim,
      borderRadius: BorderRadius.md,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: Spacing.xxl,
      borderWidth: 1,
      borderColor: Colors.red + '30',
    },
    logoutButtonPressed: {
      backgroundColor: Colors.redDim + '80',
    },
    logoutText: {
      ...Typography.bodyBold,
      color: Colors.red,
    },
  });
}
