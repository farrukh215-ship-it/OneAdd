import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
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
  const { data: notifications } = useNotifications();
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

  const toMobileHref = (href: string) => href.replace('/listings/', '/listing/');

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
      <Text className="text-[18px] font-extrabold text-ink">Mera Profile</Text>
      <Pressable onPress={() => router.push('/notifications')} className="mt-3 self-start rounded-full bg-red/10 px-4 py-2">
        <Text className="text-xs font-semibold text-red">Notifications Inbox</Text>
      </Pressable>

      <View className="mt-4 rounded-xl bg-white p-4 shadow-sm">
        <Text className="text-base font-bold text-ink">{currentUser?.name || 'Guest User'}</Text>
        <Text className="mt-1 text-sm text-ink2">{currentUser?.phone || '+92**********'}</Text>
        <Text className="mt-1 text-sm text-ink2">
          {[currentUser?.city, currentUser?.area].filter(Boolean).join(', ') || 'Shehar abhi set nahi'}
        </Text>
      </View>

      {currentUser && dashboard ? (
        <View className="mt-4">
          <Text className="text-[16px] font-extrabold text-ink">Seller Dashboard</Text>
          <View className="mt-3 flex-row flex-wrap gap-3">
            {[
              { label: 'Views', value: dashboard.totalViews },
              { label: 'Contacts', value: dashboard.totalContacts },
              { label: 'Active', value: dashboard.activeListings },
              { label: 'Sold', value: dashboard.soldListings },
            ].map((item) => (
              <View key={item.label} className="min-w-[47%] flex-1 rounded-xl bg-white p-4 shadow-sm">
                <Text className="text-xs font-semibold text-ink2">{item.label}</Text>
                <Text className="mt-2 text-xl font-extrabold text-ink">{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {currentUser && notifications?.length ? (
        <View className="mt-4 rounded-xl bg-white p-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-[16px] font-extrabold text-ink">Notifications</Text>
            <Text className="text-xs font-semibold text-red">{notifications.length}</Text>
          </View>
          <View className="mt-3 gap-3">
            {notifications.slice(0, 4).map((item) => (
              <Pressable key={item.id} onPress={() => router.push(toMobileHref(item.href) as never)}>
                <Text className="text-sm font-semibold text-ink">{item.title}</Text>
                <Text className="mt-1 text-xs text-ink2">{item.body}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View className="mt-4 gap-3">
        <Pressable onPress={() => router.push('/post/category')} className="rounded-xl bg-red px-4 py-3">
          <Text className="text-center font-bold text-white">+ Ad Post Karo</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/saved')} className="rounded-xl bg-white px-4 py-3">
          <Text className="text-center font-bold text-ink">Saved Ads</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/auth/phone')} className="rounded-xl bg-white px-4 py-3">
          <Text className="text-center font-bold text-ink">
            {currentUser ? 'Switch Account' : 'Login / Sign Up'}
          </Text>
        </Pressable>
        {currentUser ? (
          <Pressable onPress={logout} className="rounded-xl border border-border bg-white px-4 py-3">
            <Text className="text-center font-bold text-ink2">Logout</Text>
          </Pressable>
        ) : null}
      </View>

      {currentUser ? (
        <View className="mt-5">
          <Text className="text-[16px] font-extrabold text-ink">Meri Listings</Text>
          <View className="mt-3 gap-3">
            {(myListings?.data ?? []).slice(0, 8).map((listing) => {
              const statusMeta = getListingStatusMeta(listing);
              return (
                <View key={listing.id} className="rounded-xl bg-white p-4 shadow-sm">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-sm font-bold text-ink">{listing.title}</Text>
                      <Text className="mt-1 text-xs text-ink2">PKR {listing.price.toLocaleString()}</Text>
                    </View>
                    <View className={`rounded-full px-2 py-1 ${statusMeta.badgeClassName}`}>
                      <Text className={`text-[10px] font-bold ${statusMeta.textClassName}`}>{statusMeta.label}</Text>
                    </View>
                  </View>
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    <Pressable
                      onPress={() => router.push(`/listing/${listing.id}`)}
                      className="rounded-full bg-[#F5F6F7] px-3 py-2"
                    >
                      <Text className="text-[11px] font-semibold text-ink2">Open</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => router.push(`/listing/edit/${listing.id}`)}
                      className="rounded-full bg-[#F5F6F7] px-3 py-2"
                    >
                      <Text className="text-[11px] font-semibold text-ink2">Edit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        updateListingStatus.mutate({
                          id: listing.id,
                          status: listing.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE',
                        })
                      }
                      className="rounded-full bg-[#F5F6F7] px-3 py-2"
                    >
                      <Text className="text-[11px] font-semibold text-ink2">
                        {listing.status === 'INACTIVE' ? 'Activate' : 'Deactivate'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => updateListingStatus.mutate({ id: listing.id, status: 'PENDING' })}
                      className="rounded-full bg-[#F5F6F7] px-3 py-2"
                    >
                      <Text className="text-[11px] font-semibold text-ink2">Pending</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => updateListingStatus.mutate({ id: listing.id, status: 'SOLD' })}
                      className="rounded-full bg-red/10 px-3 py-2"
                    >
                      <Text className="text-[11px] font-semibold text-red">Sold</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
