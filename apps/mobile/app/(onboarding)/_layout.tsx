/**
 * Onboarding route group layout.
 * Simple Stack with no header — only used for the first-launch onboarding flow.
 * This route group is separate from (tabs) so it never appears in the tab bar.
 */

import { Stack } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';

export default function OnboardingLayout() {
  const { Colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'fade',
      }}
    />
  );
}
