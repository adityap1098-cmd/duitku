/**
 * Skeleton — shimmer loading placeholders.
 * As per CLAUDE.md spec: "JANGAN pakai loading spinner di tengah layar — selalu skeleton".
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../contexts/theme-context';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton = ({ width, height, borderRadius, style }: SkeletonProps) => {
  const { Colors, BorderRadius } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width: width || '100%',
          height: height || 20,
          borderRadius: borderRadius ?? BorderRadius.sm,
          backgroundColor: Colors.surfaceLight,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const TransactionSkeleton = () => {
  const { Spacing, BorderRadius } = useTheme();
  return (
    <View style={[styles.row, { paddingVertical: 14, gap: Spacing.md }]}>
      <Skeleton width={42} height={42} borderRadius={BorderRadius.md} />
      <View style={{ flex: 1, gap: 4 }}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" height={12} />
      </View>
      <Skeleton width={80} height={18} />
    </View>
  );
};

export const CardSkeleton = ({ height = 100 }: { height?: number }) => {
  const { Spacing, BorderRadius } = useTheme();
  return (
    <View style={{
      padding: Spacing.base,
      borderRadius: BorderRadius.lg,
      backgroundColor: 'rgba(255,255,255,0.03)',
      marginBottom: Spacing.md,
      gap: Spacing.sm
    }}>
      <Skeleton width="30%" height={14} />
      <Skeleton width="70%" height={24} />
      <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs }}>
        <Skeleton width="40%" height={12} />
        <Skeleton width="40%" height={12} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
