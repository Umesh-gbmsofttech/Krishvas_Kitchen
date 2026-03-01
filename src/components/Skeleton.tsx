import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

type SkeletonProps = {
  style?: StyleProp<ViewStyle>;
};

export const Skeleton = ({ style }: SkeletonProps) => {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.95, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.base, { opacity }, style]} />;
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#E6E8EC',
  },
});
