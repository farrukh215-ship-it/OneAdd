import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef } from "react";
import { Animated, Easing } from "react-native";

type Options = {
  distance?: number;
  duration?: number;
  delay?: number;
};

export function useScreenEnterAnimation(options?: Options) {
  const distance = options?.distance ?? 12;
  const duration = options?.duration ?? 320;
  const delay = options?.delay ?? 0;

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useFocusEffect(
    useCallback(() => {
      opacity.setValue(0);
      translateY.setValue(distance);

      const animation = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        })
      ]);

      animation.start();
      return () => {
        animation.stop();
      };
    }, [delay, distance, duration, opacity, translateY])
  );

  return {
    opacity,
    transform: [{ translateY }]
  };
}

