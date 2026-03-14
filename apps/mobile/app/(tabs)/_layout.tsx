import { Tabs, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E53935',
        tabBarInactiveTintColor: '#65676B',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E4E6EB',
          height: 60 + insets.bottom,
          paddingBottom: Math.max(6, insets.bottom),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: 'Browse',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🔎</Text>,
        }}
      />
      <Tabs.Screen
        name="post-entry"
        options={{
          title: '',
          tabBarButton: () => (
            <View className="flex-1 items-center justify-center">
              <Pressable
                onPress={() => router.push('/post/category')}
                className="h-12 w-12 items-center justify-center rounded-2xl bg-red"
              >
                <Text className="text-2xl font-bold text-white">+</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>❤</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
