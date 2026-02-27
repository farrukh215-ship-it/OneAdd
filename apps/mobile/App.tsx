import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TabsNavigator } from "./src/navigation/tabs-navigator";
import { ListingDetailScreen } from "./src/screens/listing-detail-screen";
import { registerForPushNotificationsAsync } from "./src/services/push-service";
import { useEffect } from "react";

const RootStack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    registerForPushNotificationsAsync().catch(() => undefined);
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <RootStack.Navigator>
        <RootStack.Screen
          name="Tabs"
          component={TabsNavigator}
          options={{ headerShown: false }}
        />
        <RootStack.Screen
          name="ListingDetail"
          component={ListingDetailScreen}
          options={{ title: "Listing Detail" }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
