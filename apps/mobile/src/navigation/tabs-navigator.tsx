import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ChatScreen } from "../screens/chat-screen";
import { HomeScreen } from "../screens/home-screen";
import { ReelsScreen } from "../screens/reels-screen";
import { SearchScreen } from "../screens/search-screen";
import { SellScreen } from "../screens/sell-screen";

const Tab = createBottomTabNavigator();

export function TabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#f3f8f5" },
        headerTitleStyle: { color: "#153a2e", fontWeight: "700" },
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#dce8e2",
          height: 62,
          paddingBottom: 6,
          paddingTop: 6
        },
        tabBarActiveTintColor: "#0f8e66",
        tabBarInactiveTintColor: "#5f746b",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" }
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Sell" component={SellScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Reels" component={ReelsScreen} />
    </Tab.Navigator>
  );
}
