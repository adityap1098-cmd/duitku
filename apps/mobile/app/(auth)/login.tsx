import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

export default function LoginScreen() {
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
          <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              pressed && styles.googleButtonPressed,
            ]}
            onPress={() => {
              // TODO: Implement Google OAuth flow in T05
            }}
          >
            <Text style={styles.googleButtonText}>
              Login dengan Google
            </Text>
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
