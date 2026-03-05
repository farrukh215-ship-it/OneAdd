import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TabsNavigator } from "./src/navigation/tabs-navigator";
import { FirebaseAuthScreen } from "./src/screens/firebase-auth-screen";
import { ListingDetailScreen } from "./src/screens/listing-detail-screen";
import { RecentlyViewedScreen } from "./src/screens/recently-viewed-screen";
import { useEffect, useState } from "react";
import { getAuthToken, hydrateAuthToken, subscribeAuthToken } from "./src/services/api";
import { uiTheme } from "./src/theme/tokens";

const RootStack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef<any>();

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;
    void hydrateAuthToken()
      .then(() => {
        if (!mounted) return;
        setIsAuthenticated(Boolean(getAuthToken()));
      })
      .finally(() => {
        if (mounted) {
          setAuthChecked(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return subscribeAuthToken((token) => {
      setIsAuthenticated(Boolean(token));
    });
  }, []);

  useEffect(() => {
    if (!authChecked || !navigationRef.isReady()) {
      return;
    }

    const current = navigationRef.getCurrentRoute()?.name;
    if (!isAuthenticated && current !== "Login") {
      navigationRef.navigate("Login", { tab: "signin" });
    }
    if (isAuthenticated && current === "Login") {
      navigationRef.navigate("Tabs", { screen: "Home" });
    }
  }, [authChecked, isAuthenticated]);

  if (!authChecked) {
    return null;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="dark" />
      <RootStack.Navigator
        initialRouteName={isAuthenticated ? "Tabs" : "Login"}
        screenOptions={{
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: uiTheme.colors.surfaceAlt },
          headerTitleStyle: { color: uiTheme.colors.textStrong, fontWeight: "700" },
          headerTintColor: uiTheme.colors.textStrong,
          contentStyle: { backgroundColor: uiTheme.colors.surfaceAlt }
        }}
      >
        <RootStack.Screen name="Login" options={{ title: "TGMG mein Khush Aamdeed" }}>
          {({ route }: any) => (
            <FirebaseAuthScreen
              onAuthenticated={() => setIsAuthenticated(true)}
              initialTab={route?.params?.tab === "signup" ? "signup" : "signin"}
            />
          )}
        </RootStack.Screen>
        <RootStack.Screen
          name="Tabs"
          component={TabsNavigator}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <RootStack.Screen
          name="ListingDetail"
          component={ListingDetailScreen}
          options={{ title: "Listing Detail" }}
        />
        <RootStack.Screen
          name="RecentlyViewed"
          component={RecentlyViewedScreen}
          options={{ title: "Recently Viewed" }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

