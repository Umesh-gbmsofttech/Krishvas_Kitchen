import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, ViewStyle } from 'react-native';
import { COLORS } from '../config/appConfig';

export const AnimatedHeading = ({
  text,
  compact = false,
  style,
}: {
  text: string;
  compact?: boolean;
  style?: ViewStyle;
}) => {
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.95, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.wrap, compact && styles.compactWrap, style, { opacity }]}>
      <Text style={[styles.text, compact && styles.compactText]} numberOfLines={1}>
        {text}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    backgroundColor: '#FBD9C9',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginVertical: 8,
  },
  compactWrap: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginVertical: 0,
  },
  text: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  compactText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

