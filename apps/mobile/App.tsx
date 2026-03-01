import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TabsNavigator } from "./src/navigation/tabs-navigator";
import { FirebaseAuthScreen } from "./src/screens/firebase-auth-screen";
import { ListingDetailScreen } from "./src/screens/listing-detail-screen";
import { useState } from "react";

const RootStack = createNativeStackNavigator();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <RootStack.Navigator
        screenOptions={{
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: "#f4f8f5" },
          headerTitleStyle: { color: "#153a2e", fontWeight: "700" },
          contentStyle: { backgroundColor: "#eef4f1" }
        }}
      >
        {!isAuthenticated ? (
          <RootStack.Screen name="Login" options={{ title: "ZaroratBazar Sign in" }}>
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
          options={{ title: "ZaroratBazar Listing" }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
