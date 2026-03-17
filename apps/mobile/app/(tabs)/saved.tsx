import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { Listing } from '@tgmg/types';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { WideCard } from '../../components/WideCard';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';

export default function SavedScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { data: savedListings = [], isLoading } = useQuery({
    queryKey: ['saved-listings'],
    enabled: Boolean(currentUser),
    queryFn: async () => {
      const response = await api.get<Listing[] | { data?: Listing[] }>('/listings/saved');
      return Array.isArray(response.data) ? response.data : response.data?.data ?? [];
    },
  });

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Saved Ads</Text>
      {!currentUser ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account required</Text>
          <Text style={styles.cardText}>Saved ads dekhne ke liye pehle sign in ya sign up karein.</Text>
          <Pressable onPress={() => router.push('/auth/phone')} style={styles.button}>
            <Text style={styles.buttonText}>Sign In / Sign Up</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <View style={styles.card}>
          <Text style={styles.cardText}>Saved ads load ho rahe hain...</Text>
        </View>
      ) : !savedListings.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Abhi kuch save nahi kiya</Text>
          <Text style={styles.cardText}>Browse se listings save karo, yahan foran mil jayengi.</Text>
          <Pressable onPress={() => router.push('/(tabs)/browse')} style={styles.button}>
            <Text style={styles.buttonText}>Browse Karo</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={savedListings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <WideCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F0F2F5',
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  title: {
    color: '#1C1E21',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  cardTitle: {
    color: '#1C1E21',
    fontSize: 18,
    fontWeight: '800',
  },
  cardText: {
    color: '#65676B',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  button: {
    backgroundColor: '#E53935',
    borderRadius: 16,
    marginTop: 16,
    paddingVertical: 14,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  list: {
    paddingBottom: 110,
  },
});
