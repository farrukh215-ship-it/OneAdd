import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useListingDashboard } from '../../hooks/useListingDashboard';
import { useMyListings } from '../../hooks/useMyListings';
import { useNotifications } from '../../hooks/useNotifications';
import { api } from '../../lib/api';
import { getListingStatusMeta } from '../../lib/listing-ui';

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentUser, logout } = useAuth();
  const { data: dashboard } = useListingDashboard();
  const { notifications, unreadCount } = useNotifications();
  const { data: myListings } = useMyListings();

  const updateListingStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ACTIVE' | 'PENDING' | 'INACTIVE' | 'SOLD' }) => {
      const response = await api.patch(`/listings/${id}`, { status });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      void queryClient.invalidateQueries({ queryKey: ['listing-dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mera Profile</Text>

      <View style={styles.profileCard}>
        <Text style={styles.profileName}>{currentUser?.name || 'Guest User'}</Text>
        <Text style={styles.profileMeta}>{currentUser?.phone || '+92**********'}</Text>
        <Text style={styles.profileMeta}>
          {[currentUser?.city, currentUser?.area].filter(Boolean).join(', ') || 'Shehar abhi set nahi'}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable onPress={() => router.push('/notifications')} style={styles.softAction}>
          <Text style={styles.softActionText}>Notifications {unreadCount ? `(${unreadCount})` : ''}</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/saved')} style={styles.softAction}>
          <Text style={styles.softActionText}>Saved Ads</Text>
        </Pressable>
      </View>

      <View style={styles.actionsStack}>
        <Pressable onPress={() => router.push('/post/category')} style={styles.primaryAction}>
          <Text style={styles.primaryActionText}>+ Ad Post Karo</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/auth/phone')} style={styles.secondaryAction}>
          <Text style={styles.secondaryActionText}>{currentUser ? 'Switch Account' : 'Login / Sign Up'}</Text>
        </Pressable>
        {currentUser ? (
          <Pressable onPress={logout} style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>Logout</Text>
          </Pressable>
        ) : null}
      </View>

      {currentUser && dashboard ? (
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Seller Dashboard</Text>
          <View style={styles.statsGrid}>
            {[
              { label: 'Views', value: dashboard.totalViews },
              { label: 'Contacts', value: dashboard.totalContacts },
              { label: 'Active', value: dashboard.activeListings },
              { label: 'Sold', value: dashboard.soldListings },
            ].map((item) => (
              <View key={item.label} style={styles.statCard}>
                <Text style={styles.statLabel}>{item.label}</Text>
                <Text style={styles.statValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {currentUser && notifications?.length ? (
        <View style={styles.notificationsCard}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          {notifications.slice(0, 4).map((item) => (
            <View key={item.id} style={styles.notificationItem}>
              <Text style={styles.notificationTitle}>{item.title}</Text>
              <Text style={styles.notificationBody}>{item.body}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {currentUser ? (
        <View style={styles.listingsSection}>
          <Text style={styles.sectionTitle}>Meri Listings</Text>
          {(myListings?.data ?? []).slice(0, 8).map((listing) => {
            const statusMeta = getListingStatusMeta(listing);
            return (
              <View key={listing.id} style={styles.listingCard}>
                <View style={styles.listingHeader}>
                  <View style={styles.listingTitleWrap}>
                    <Text style={styles.listingTitle}>{listing.title}</Text>
                    <Text style={styles.listingPrice}>PKR {listing.price.toLocaleString()}</Text>
                  </View>
                  <View style={[styles.statusPill, statusMeta.textClassName === 'text-white' ? styles.statusPillGreen : styles.statusPillSoft]}>
                    <Text style={[styles.statusPillText, statusMeta.textClassName === 'text-white' ? styles.statusPillTextWhite : statusMeta.textClassName === 'text-red' ? styles.statusPillTextRed : styles.statusPillTextMuted]}>
                      {statusMeta.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.listingActions}>
                  <Pressable onPress={() => router.push(`/listing/${listing.id}`)} style={styles.listingAction}>
                    <Text style={styles.listingActionText}>Open</Text>
                  </Pressable>
                  <Pressable onPress={() => router.push(`/listing/edit/${listing.id}`)} style={styles.listingAction}>
                    <Text style={styles.listingActionText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      updateListingStatus.mutate({
                        id: listing.id,
                        status: listing.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE',
                      })
                    }
                    style={styles.listingAction}
                  >
                    <Text style={styles.listingActionText}>{listing.status === 'INACTIVE' ? 'Activate' : 'Deactivate'}</Text>
                  </Pressable>
                  <Pressable onPress={() => updateListingStatus.mutate({ id: listing.id, status: 'SOLD' })} style={styles.listingActionRed}>
                    <Text style={styles.listingActionRedText}>Sold</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F0F2F5',
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  title: {
    color: '#1C1E21',
    fontSize: 24,
    fontWeight: '800',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 14,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  profileName: {
    color: '#1C1E21',
    fontSize: 18,
    fontWeight: '800',
  },
  profileMeta: {
    color: '#65676B',
    fontSize: 14,
    marginTop: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  softAction: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flex: 1,
    paddingVertical: 14,
  },
  softActionText: {
    color: '#E53935',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionsStack: {
    gap: 10,
    marginTop: 14,
  },
  primaryAction: {
    backgroundColor: '#E53935',
    borderRadius: 16,
    paddingVertical: 15,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  secondaryAction: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 15,
  },
  secondaryActionText: {
    color: '#1C1E21',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  statsSection: {
    marginTop: 18,
  },
  sectionTitle: {
    color: '#1C1E21',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexBasis: '48%',
    flexGrow: 1,
    padding: 16,
  },
  statLabel: {
    color: '#65676B',
    fontSize: 12,
    fontWeight: '700',
  },
  statValue: {
    color: '#1C1E21',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  notificationsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 18,
    padding: 18,
  },
  notificationItem: {
    marginTop: 10,
  },
  notificationTitle: {
    color: '#1C1E21',
    fontSize: 14,
    fontWeight: '700',
  },
  notificationBody: {
    color: '#65676B',
    fontSize: 12,
    marginTop: 4,
  },
  listingsSection: {
    marginTop: 18,
  },
  listingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 10,
    padding: 16,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listingTitleWrap: {
    flex: 1,
    paddingRight: 10,
  },
  listingTitle: {
    color: '#1C1E21',
    fontSize: 14,
    fontWeight: '700',
  },
  listingPrice: {
    color: '#65676B',
    fontSize: 12,
    marginTop: 6,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillSoft: {
    backgroundColor: '#F5F6F7',
  },
  statusPillGreen: {
    backgroundColor: '#2E7D32',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusPillTextWhite: {
    color: '#FFFFFF',
  },
  statusPillTextRed: {
    color: '#E53935',
  },
  statusPillTextMuted: {
    color: '#65676B',
  },
  listingActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  listingAction: {
    backgroundColor: '#F5F6F7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  listingActionText: {
    color: '#65676B',
    fontSize: 11,
    fontWeight: '700',
  },
  listingActionRed: {
    backgroundColor: '#FDECEC',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  listingActionRedText: {
    color: '#E53935',
    fontSize: 11,
    fontWeight: '700',
  },
});
