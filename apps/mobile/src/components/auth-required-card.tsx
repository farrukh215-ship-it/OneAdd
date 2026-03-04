import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  subtitle: string;
  navigation: any;
};

export function AuthRequiredCard({ title, subtitle, navigation }: Props) {
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run = Animated.timing(enter, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    });
    run.start();
    return () => run.stop();
  }, [enter]);

  function openAuth(tab: "signin" | "signup") {
    navigation.getParent()?.navigate("Login", { tab });
  }

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.card,
          {
            opacity: enter,
            transform: [
              {
                translateY: enter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0]
                })
              }
            ]
          }
        ]}
      >
        <Text style={styles.kicker}>TGMG SECURE ACCESS</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.actions}>
          <Pressable style={[styles.button, styles.secondary]} onPress={() => openAuth("signin")}>
            <Text style={styles.secondaryText}>Login</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.primary]} onPress={() => openAuth("signup")}>
            <Text style={styles.primaryText}>Create Account</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#FDF6ED",
    padding: 14
  },
  card: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8D5B7",
    backgroundColor: "#FFFFFF",
    padding: 16,
    shadowColor: "#5C3D2E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5
  },
  kicker: {
    color: "#9B8070",
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: "800"
  },
  title: {
    marginTop: 6,
    fontSize: 23,
    lineHeight: 28,
    color: "#5C3D2E",
    fontWeight: "800"
  },
  subtitle: {
    marginTop: 8,
    color: "#7A5544",
    fontSize: 14,
    lineHeight: 20
  },
  actions: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1
  },
  primary: {
    backgroundColor: "#C8603A",
    borderColor: "#C8603A"
  },
  secondary: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E8D5B7"
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "800"
  },
  secondaryText: {
    color: "#5C3D2E",
    fontWeight: "700"
  }
});
