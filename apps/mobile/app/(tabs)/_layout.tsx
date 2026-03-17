import { Tabs, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabGlyph({ glyph, color }: { glyph: string; color: string }) {
  return (
    <View style={styles.tabGlyphWrap}>
      <Text style={[styles.tabGlyph, { color }]}>{glyph}</Text>
    </View>
  );
}

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
          height: 68 + insets.bottom,
          paddingBottom: Math.max(8, insets.bottom),
          paddingTop: 8,
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
          tabBarIcon: ({ color }) => <TabGlyph glyph={'\u{1F3E0}'} color={color} />,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: 'Browse',
          tabBarIcon: ({ color }) => <TabGlyph glyph={'\u{1F50D}'} color={color} />,
        }}
      />
      <Tabs.Screen
        name="post-entry"
        options={{
          title: '',
          tabBarButton: () => (
            <View style={styles.postWrap}>
              <Pressable onPress={() => router.push('/post/category')} style={styles.postButton}>
                <Text style={styles.postText}>+</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color }) => <TabGlyph glyph={'\u2764\uFE0F'} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabGlyph glyph={'\u{1F464}'} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabGlyphWrap: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
    width: 24,
  },
  tabGlyph: {
    fontSize: 18,
  },
  postWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  postButton: {
    alignItems: 'center',
    backgroundColor: '#E53935',
    borderRadius: 18,
    height: 48,
    justifyContent: 'center',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    width: 48,
  },
  postText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 24,
  },
});
