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
        headerStyle: { backgroundColor: "#f7f9ff" },
        tabBarStyle: { backgroundColor: "#ffffff" }
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
