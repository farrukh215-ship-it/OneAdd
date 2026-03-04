import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { ChatScreen } from "../screens/chat-screen";
import { HomeScreen } from "../screens/home-screen";
import { ReelsScreen } from "../screens/reels-screen";
import { SavedScreen } from "../screens/saved-screen";
import { SearchScreen } from "../screens/search-screen";
import { SellScreen } from "../screens/sell-screen";
import { clearAuthToken, getAuthToken, subscribeAuthToken } from "../services/api";

const Tab = createBottomTabNavigator();

const iconMap: Record<string, string> = {
  Home: "\ud83c\udfe0",
  Dhundo: "\ud83d\udd0d",
  Becho: "\ud83c\udff7\ufe0f",
  Chat: "\ud83d\udcac",
  Reels: "\ud83c\udfac",
  Saved: "\ud83d\udd16"
};

function AnimatedTabIcon({
  icon,
  color,
  focused
}: {
  icon: string;
  color: string;
  focused: boolean;
}) {
  const scale = useRef(new Animated.Value(focused ? 1.08 : 1)).current;
  const translateY = useRef(new Animated.Value(focused ? -2 : 0)).current;
  const glowOpacity = useRef(new Animated.Value(focused ? 0.16 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.1 : 1,
        speed: 18,
        bounciness: 8,
        useNativeDriver: true
      }),
      Animated.spring(translateY, {
        toValue: focused ? -2 : 0,
        speed: 16,
        bounciness: 6,
        useNativeDriver: true
      }),
      Animated.timing(glowOpacity, {
        toValue: focused ? 0.16 : 0,
        duration: 180,
        useNativeDriver: true
      })
    ]).start();
  }, [focused, glowOpacity, scale, translateY]);

  return (
    <Animated.View
      style={{
        transform: [{ scale }, { translateY }],
        opacity: focused ? 1 : 0.9
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: -10,
          right: -10,
          top: -6,
          bottom: -6,
          borderRadius: 999,
          backgroundColor: "#C8603A",
          opacity: glowOpacity
        }}
      />
      <Text style={{ color, fontSize: 16 }}>{icon}</Text>
    </Animated.View>
  );
}

function TabBarGlassBackdrop({ pulse }: { pulse: Animated.Value }) {
  return (
    <View
      style={{
        flex: 1,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        overflow: "hidden",
        backgroundColor: "rgba(255,255,255,0.92)"
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: -18,
          height: 46,
          backgroundColor: "#F5EAD8",
          opacity: pulse.interpolate({
            inputRange: [0, 1],
            outputRange: [0.2, 0.52]
          }),
          transform: [
            {
              scaleX: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.08]
              })
            }
          ]
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 1,
          backgroundColor: "rgba(232,213,183,0.92)"
        }}
      />
    </View>
  );
}

export function TabsNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getAuthToken()));
  const tabPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return subscribeAuthToken((token) => {
      setIsAuthenticated(Boolean(token));
    });
  }, []);

  function triggerTabPulse() {
    tabPulse.setValue(1);
    Animated.timing(tabPulse, {
      toValue: 0,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    }).start();
  }

  return (
    <Tab.Navigator
      screenListeners={{
        tabPress: () => {
          triggerTabPulse();
        }
      }}
      screenOptions={({ route, navigation }) => ({
        headerStyle: { backgroundColor: "#FDF6ED" },
        headerTitleStyle: { color: "#5C3D2E", fontWeight: "700" },
        headerTintColor: "#5C3D2E",
        headerRight: () => (
          <Pressable
            style={{
              borderWidth: 1,
              borderColor: "#E8D5B7",
              backgroundColor: "#FFFFFF",
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 6
            }}
            onPress={() => {
              if (isAuthenticated) {
                void clearAuthToken();
                return;
              }
              navigation.getParent()?.navigate("Login", { tab: "signin" });
            }}
          >
            <Text style={{ color: "#5C3D2E", fontSize: 12, fontWeight: "700" }}>
              {isAuthenticated ? "Sign Out" : "Login"}
            </Text>
          </Pressable>
        ),
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopColor: "#E8D5B7",
          borderTopWidth: 0,
          height: 62,
          paddingBottom: 6,
          paddingTop: 6,
          shadowColor: "#5C3D2E",
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.1,
          shadowRadius: 18,
          elevation: 10
        },
        tabBarBackground: () => <TabBarGlassBackdrop pulse={tabPulse} />,
        tabBarActiveTintColor: "#C8603A",
        tabBarInactiveTintColor: "#9B8070",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarIcon: ({ color, focused }) => (
          <AnimatedTabIcon icon={iconMap[route.name] ?? "\u2022"} color={color} focused={focused} />
        )
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Dhundo" component={SearchScreen} />
      <Tab.Screen name="Becho" component={SellScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Reels" component={ReelsScreen} />
      <Tab.Screen name="Saved" component={SavedScreen} />
    </Tab.Navigator>
  );
}
