import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { ChatScreen } from "../screens/chat-screen";
import { HomeScreen } from "../screens/home-screen";
import { MyAdsScreen } from "../screens/my-ads-screen";
import { ReelsScreen } from "../screens/reels-screen";
import { SearchScreen } from "../screens/search-screen";
import { SellScreen } from "../screens/sell-screen";
import {
  clearAuthToken,
  getAuthToken,
  getMe,
  subscribeAuthToken
} from "../services/api";
import { uiTheme } from "../theme/tokens";

const Tab = createBottomTabNavigator();

const iconMap: Record<string, string> = {
  Home: "\ud83c\udfe0",
  Dhundo: "\ud83d\udd0d",
  Becho: "\ud83c\udff7\ufe0f",
  Chat: "\ud83d\udcac",
  Reels: "\ud83c\udfac",
  MereAds: "\ud83d\udccb"
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
          backgroundColor: uiTheme.colors.primary,
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
          backgroundColor: uiTheme.colors.surfaceSoft,
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
  const [loggedInName, setLoggedInName] = useState("");
  const tabPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return subscribeAuthToken((token) => {
      setIsAuthenticated(Boolean(token));
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoggedInName("");
      return;
    }

    let alive = true;
    void getMe()
      .then((profile) => {
        if (!alive) return;
        const firstName = profile.fullName?.trim().split(/\s+/)[0] ?? "";
        setLoggedInName(firstName);
      })
      .catch(() => {
        if (!alive) return;
        setLoggedInName("");
      });

    return () => {
      alive = false;
    };
  }, [isAuthenticated]);

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
        headerStyle: { backgroundColor: uiTheme.colors.surfaceAlt },
        headerTitleStyle: { color: uiTheme.colors.textStrong, fontWeight: "700" },
        headerTintColor: uiTheme.colors.textStrong,
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {isAuthenticated && loggedInName ? (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: uiTheme.colors.border,
                  backgroundColor: uiTheme.colors.surface,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 6
                }}
              >
                  <Text style={{ color: uiTheme.colors.textStrong, fontSize: 11, fontWeight: "700" }}>
                    Logged in: {loggedInName}
                  </Text>
              </View>
            ) : null}
            <Pressable
              style={{
                borderWidth: 1,
                borderColor: uiTheme.colors.border,
                backgroundColor: uiTheme.colors.surface,
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
              <Text style={{ color: uiTheme.colors.textStrong, fontSize: 12, fontWeight: "700" }}>
                {isAuthenticated ? "Sign Out" : "Login"}
              </Text>
            </Pressable>
          </View>
        ),
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopColor: uiTheme.colors.border,
          borderTopWidth: 0,
          height: 62,
          paddingBottom: 6,
          paddingTop: 6,
          shadowColor: uiTheme.colors.textStrong,
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.1,
          shadowRadius: 18,
          elevation: 10
        },
        tabBarBackground: () => <TabBarGlassBackdrop pulse={tabPulse} />,
        tabBarActiveTintColor: uiTheme.colors.primary,
        tabBarInactiveTintColor: uiTheme.colors.textMuted,
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
      <Tab.Screen
        name="MereAds"
        component={MyAdsScreen}
        options={{ title: "Mere Ads", tabBarLabel: "Mere Ads" }}
      />
    </Tab.Navigator>
  );
}
