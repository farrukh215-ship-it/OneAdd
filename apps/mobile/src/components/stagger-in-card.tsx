import { PropsWithChildren, useEffect, useRef } from "react";
import { Animated, Easing, StyleProp, ViewStyle } from "react-native";

type StaggerInCardProps = PropsWithChildren<{
  index: number;
  delayStep?: number;
  delayBase?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}>;

export function StaggerInCard({
  index,
  delayStep = 42,
  delayBase = 0,
  distance = 14,
  style,
  children
}: StaggerInCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(distance);

    const run = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        delay: delayBase + index * delayStep,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        delay: delayBase + index * delayStep,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]);

    run.start();
    return () => run.stop();
  }, [delayBase, delayStep, distance, index, opacity, translateY]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }]
        }
      ]}
    >
      {children}
    </Animated.View>
  );
}

