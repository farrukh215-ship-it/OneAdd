import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View } from "react-native";
import { ChatScreen } from "../screens/chat-screen";
import { HomeScreen } from "../screens/home-screen";
import { ReelsScreen } from "../screens/reels-screen";
import { SearchScreen } from "../screens/search-screen";
import { SellScreen } from "../screens/sell-screen";

const Tab = createBottomTabNavigator();

const iconMap: Record<string, string> = {
  Home: "\ud83c\udfe0",
  Dhundo: "\ud83d\udd0d",
  Becho: "\ud83c\udff7\ufe0f",
  Chat: "\ud83d\udcac",
  Reels: "\ud83c\udfac"
};

export function TabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: "#FDF6ED" },
        headerTitleStyle: { color: "#5C3D2E", fontWeight: "700" },
        headerTintColor: "#5C3D2E",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E8D5B7",
          height: 62,
          paddingBottom: 6,
          paddingTop: 6
        },
        tabBarActiveTintColor: "#C8603A",
        tabBarInactiveTintColor: "#9B8070",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarIcon: ({ color, focused }) => (
          <View
            style={{
              transform: [{ scale: focused ? 1.08 : 1 }],
              opacity: focused ? 1 : 0.9
            }}
          >
            <Text style={{ color, fontSize: 16 }}>{iconMap[route.name] ?? "\u2022"}</Text>
          </View>
        )
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Dhundo" component={SearchScreen} />
      <Tab.Screen name="Becho" component={SellScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Reels" component={ReelsScreen} />
    </Tab.Navigator>
  );
}
