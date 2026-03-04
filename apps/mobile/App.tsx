import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TabsNavigator } from "./src/navigation/tabs-navigator";
import { FirebaseAuthScreen } from "./src/screens/firebase-auth-screen";
import { ListingDetailScreen } from "./src/screens/listing-detail-screen";
import { RecentlyViewedScreen } from "./src/screens/recently-viewed-screen";
import { useEffect, useState } from "react";
import { getAuthToken, hydrateAuthToken } from "./src/services/api";

const RootStack = createNativeStackNavigator();

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

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <RootStack.Navigator
        screenOptions={{
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: "#FDF6ED" },
          headerTitleStyle: { color: "#5C3D2E", fontWeight: "700" },
          headerTintColor: "#5C3D2E",
          contentStyle: { backgroundColor: "#FDF6ED" }
        }}
      >
        {!authChecked ? null : !isAuthenticated ? (
          <RootStack.Screen name="Login" options={{ title: "TGMG mein Khush Aamdeed" }}>
            {() => (
              <FirebaseAuthScreen onAuthenticated={() => setIsAuthenticated(true)} />
            )}
          </RootStack.Screen>
        ) : null}
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

