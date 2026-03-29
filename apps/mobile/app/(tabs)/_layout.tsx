import { useMemo } from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../../contexts/theme-context';
import { lightImpact, mediumImpact } from '../../lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Custom FAB button for the center tab.
 */
function CenterFAB() {
  const { Colors, Spacing, BorderRadius, Shadows } = useTheme();
  const router = useRouter();

  const handlePress = () => {
    mediumImpact();
    router.push('/(tabs)/transactions/add');
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.fabContainer,
        {
          shadowColor: Colors.hero1,
          bottom: Platform.OS === 'ios' ? 20 : 10,
        },
        pressed && { opacity: 0.9, transform: [{ scale: 0.95 }] }
      ]}
    >
      <LinearGradient
        colors={[Colors.hero2, Colors.hero3]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.fab, { borderRadius: BorderRadius.lg }]}
      >
        <MaterialIcons name="add" size={32} color="#FFF" />
      </LinearGradient>
    </Pressable>
  );
}

export default function TabLayout() {
  const { Colors, Typography } = useTheme();

  const tabBarStyle = useMemo(() => ({
    backgroundColor: Colors.tabBarBackground,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingTop: 8,
  }), [Colors]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.tabBarActive,
          tabBarInactiveTintColor: Colors.tabBarInactive,
          tabBarStyle,
          tabBarLabelStyle: {
            fontFamily: Typography.caption.fontFamily,
            fontSize: 11,
            fontWeight: '600',
            marginBottom: Platform.OS === 'ios' ? 0 : 8,
          },
        }}
        screenListeners={{
          state: (e) => {
            // Trigger light haptic on tab change
            lightImpact();
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Beranda',
            tabBarIcon: ({ color, focused }) => (
              <View style={focused && styles.activeTabContainer}>
                <MaterialIcons name="home" size={26} color={color} />
                {focused && <View style={[styles.activeIndicator, { backgroundColor: Colors.tabBarActive }]} />}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: 'Transaksi',
            tabBarIcon: ({ color, focused }) => (
              <View style={focused && styles.activeTabContainer}>
                <MaterialIcons name="receipt-long" size={26} color={color} />
                {focused && <View style={[styles.activeIndicator, { backgroundColor: Colors.tabBarActive }]} />}
              </View>
            ),
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              // Pop to the transactions index when tab is re-pressed
              navigation.navigate('transactions', { screen: 'index' });
            },
          })}
        />

        {/* Placeholder for FAB spacing */}
        <Tabs.Screen
          name="add_placeholder"
          options={{
            title: '',
            tabBarButton: () => <View style={{ width: 70 }} />,
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
            },
          }}
        />

        <Tabs.Screen
          name="budget"
          options={{
            title: 'Anggaran',
            tabBarIcon: ({ color, focused }) => (
              <View style={focused && styles.activeTabContainer}>
                <MaterialIcons name="account-balance-wallet" size={26} color={color} />
                {focused && <View style={[styles.activeIndicator, { backgroundColor: Colors.tabBarActive }]} />}
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="insights"
          options={{
            title: 'Insights',
            tabBarIcon: ({ color, focused }) => (
              <View style={focused && styles.activeTabContainer}>
                <MaterialIcons name="pie-chart" size={26} color={color} />
                {focused && <View style={[styles.activeIndicator, { backgroundColor: Colors.tabBarActive }]} />}
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            href: '/profile',
          }}
        />
      </Tabs>

      <CenterFAB />
    </View>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    alignSelf: 'center',
    width: 56,
    height: 56,
    zIndex: 10,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  fab: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    position: 'absolute',
    bottom: -10,
  }
});
