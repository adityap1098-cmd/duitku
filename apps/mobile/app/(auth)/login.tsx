import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuthStore } from '../../stores/auth-store';

export default function LoginScreen() {
  const { loginWithGoogle, isAuthenticating, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    clearError();
    try {
      await loginWithGoogle();
      // Navigation happens automatically via auth guard in _layout.tsx
    } catch {
      // Error is already set in the store
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.brandSection}>
          <Text style={styles.logo}>💸</Text>
          <Text style={styles.appName}>DuitKu</Text>
          <Text style={styles.tagline}>
            Lacak keuanganmu, otomatis dari Gmail
          </Text>
        </View>

        <View style={styles.actionSection}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              pressed && styles.googleButtonPressed,
              isAuthenticating && styles.googleButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color={Colors.background} />
                <Text style={styles.googleButtonText}>
                  Menghubungkan...
                </Text>
              </View>
            ) : (
              <Text style={styles.googleButtonText}>
                Login dengan Google
              </Text>
            )}
          </Pressable>

          <Text style={styles.disclaimer}>
            Kami hanya membaca email transaksi.{'\n'}
            Data pribadimu aman.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
  },
  brandSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  appName: {
    ...Typography.h1,
    fontSize: 36,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  tagline: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  actionSection: {
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: Colors.error + '20', // 20% opacity
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    width: '100%',
    marginBottom: Spacing.md,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    textAlign: 'center',
  },
  googleButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  googleButtonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  googleButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.background,
  },
  disclaimer: {
    ...Typography.label,
    textAlign: 'center',
    color: Colors.textMuted,
  },
});
