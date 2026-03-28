/**
 * Onboarding screen — 3-page swipeable introduction to DuitKu.
 *
 * Page 1: Welcome — app purpose
 * Page 2: Gmail Sync — auto-sync feature
 * Page 3: Insights — spending analytics
 *
 * On completion, marks onboarding as seen and redirects to login.
 */

import { useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Dimensions,
  StyleSheet,
  type ViewToken,
  type ListRenderItemInfo,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme-context';
import { useSettingsStore } from '../../stores/settings-store';
import type { ColorPalette } from '../../constants/theme';

// --------------- Page Data ---------------

interface OnboardingPage {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const PAGES: OnboardingPage[] = [
  {
    id: 'welcome',
    icon: 'wallet-outline',
    title: 'Selamat datang di DuitKu',
    description: 'Lacak keuanganmu dengan mudah',
  },
  {
    id: 'sync',
    icon: 'mail-outline',
    title: 'Sinkron Otomatis',
    description:
      'Transaksi dari Grab, Gojek, Shopee, dan bank langsung tercatat',
  },
  {
    id: 'insights',
    icon: 'bar-chart-outline',
    title: 'Pantau Pengeluaran',
    description: 'Lihat budget, tren belanja, dan langganan berulang',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --------------- Component ---------------

export default function OnboardingScreen() {
  const { Colors, Spacing, BorderRadius } = useTheme();
  const router = useRouter();
  const setHasSeenOnboarding = useSettingsStore((s) => s.setHasSeenOnboarding);

  const [currentPage, setCurrentPage] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingPage>>(null);

  const styles = useMemo(() => createStyles(Colors), [Colors]);

  // Track visible page via viewability callback
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentPage(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = useCallback(() => {
    if (currentPage < PAGES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentPage + 1, animated: true });
    }
  }, [currentPage]);

  const handleStart = useCallback(() => {
    setHasSeenOnboarding(true);
    router.replace('/(auth)/login');
  }, [setHasSeenOnboarding, router]);

  const isLastPage = currentPage === PAGES.length - 1;

  const renderPage = useCallback(
    ({ item }: ListRenderItemInfo<OnboardingPage>) => (
      <View style={styles.page}>
        <View style={styles.iconContainer}>
          <Ionicons name={item.icon} size={80} color={Colors.primary} />
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    ),
    [styles, Colors.primary],
  );

  const keyExtractor = useCallback((item: OnboardingPage) => item.id, []);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={PAGES}
        renderItem={renderPage}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_data, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Dot indicators */}
      <View style={styles.dotsContainer}>
        {PAGES.map((page, index) => (
          <View
            key={page.id}
            style={[
              styles.dot,
              index === currentPage ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Action button */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={isLastPage ? handleStart : handleNext}
        >
          <Text style={styles.buttonText}>
            {isLastPage ? 'Mulai' : 'Lanjut'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// --------------- Styles ---------------

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    page: {
      width: SCREEN_WIDTH,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    iconContainer: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: Colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 40,
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: Colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    description: {
      fontSize: 16,
      fontWeight: '400',
      color: Colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      paddingHorizontal: 16,
    },
    dotsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 24,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginHorizontal: 6,
    },
    dotActive: {
      backgroundColor: Colors.primary,
      width: 24,
      borderRadius: 5,
    },
    dotInactive: {
      backgroundColor: Colors.surfaceLight,
    },
    buttonContainer: {
      paddingHorizontal: 32,
      paddingBottom: 48,
    },
    button: {
      backgroundColor: Colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    buttonPressed: {
      opacity: 0.85,
    },
    buttonText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
}
