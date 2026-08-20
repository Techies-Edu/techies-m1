/**
 * RandomLetterSwap — Animated letter swap text effect for navigation items.
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, StyleProp, TextStyle } from 'react-native';

interface RandomLetterSwapProps {
  label: string;
  isActive?: boolean;
  style?: StyleProp<TextStyle>;
  staggerDuration?: number;
}

export const RandomLetterSwap: React.FC<RandomLetterSwapProps> = ({
  label,
  isActive = false,
  style,
  staggerDuration = 0.025,
}) => {
  const letters = label.split('');
  const animValues = useRef(letters.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (isActive) {
      const animations = animValues.map((val) =>
        Animated.sequence([
          Animated.timing(val, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }),
        ]),
      );

      Animated.stagger(staggerDuration * 1000, animations).start();
    } else {
      animValues.forEach((val) => val.setValue(0));
    }
  }, [isActive, animValues, staggerDuration]);

  return (
    <View style={styles.container}>
      {letters.map((char, i) => {
        const translateY = animValues[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, -3],
        });

        const scale = animValues[i].interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.25, 1],
        });

        return (
          <Animated.Text
            key={`${char}-${i}`}
            style={[
              style,
              {
                transform: [{ translateY }, { scale }],
              },
            ]}
          >
            {char}
          </Animated.Text>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
