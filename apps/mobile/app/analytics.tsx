import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useListingDashboard } from '../hooks/useListingDashboard';

function AnalyticsBars({
  points,
}: {
  points: Array<{ label: string; views: number; contacts: number; saves: number; listings: number }>;
}) {
  const maxValue = Math.max(1, ...points.map((point) => Math.max(point.views, point.contacts, point.saves)));

  return (
    <View className="rounded-3xl bg-white p-5 shadow-sm">
      <View className="flex-row items-center justify-between">
        <Text className="text-[18px] font-extrabold text-ink">Analytics History</Text>
        <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-ink3">7 Days</Text>
      </View>
      <View className="mt-6 flex-row items-end justify-between gap-3">
        {points.map((point) => (
          <View key={point.label} className="flex-1 items-center">
            <View className="h-36 w-full items-center justify-end gap-1">
              <View
                className="w-2 rounded-t-full bg-[#0EA5E9]"
                style={{ height: `${Math.max((point.views / maxValue) * 100, point.views ? 12 : 4)}%` }}
              />
              <View
                className="w-3 rounded-t-full bg-red"
                style={{ height: `${Math.max((point.contacts / maxValue) * 100, point.contacts ? 12 : 4)}%` }}
              />
              <View
                className="w-2 rounded-t-full bg-[#22C55E]"
                style={{ height: `${Math.max((point.saves / maxValue) * 100, point.saves ? 12 : 4)}%` }}
              />
            </View>
            <Text className="mt-2 text-[10px] font-semibold text-ink3">{point.label}</Text>
          </View>
        ))}
      </View>
      <View className="mt-5 flex-row flex-wrap gap-4">
        <View className="flex-row items-center gap-2">
          <View className="h-2.5 w-2.5 rounded-full bg-[#0EA5E9]" />
          <Text className="text-[11px] text-ink2">Views</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="h-2.5 w-2.5 rounded-full bg-red" />
          <Text className="text-[11px] text-ink2">Contacts</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
          <Text className="text-[11px] text-ink2">Saves</Text>
        </View>
      </View>
    </View>
  );
}

function AnalyticsFunnel({
  funnel,
}: {
  funnel: { views: number; contacts: number; saves: number; sold: number };
}) {
  const max = Math.max(1, funnel.views);
  const rows = [
    { label: 'Views', value: funnel.views, color: '#0EA5E9' },
    { label: 'Contacts', value: funnel.contacts, color: '#E53935' },
    { label: 'Saves', value: funnel.saves, color: '#22C55E' },
    { label: 'Sold', value: funnel.sold, color: '#111827' },
  ];

  return (
    <View className="rounded-3xl bg-white p-5 shadow-sm">
      <View className="flex-row items-center justify-between">
        <Text className="text-[18px] font-extrabold text-ink">Contact Funnel</Text>
        <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-ink3">Conversion</Text>
      </View>
      <View className="mt-5 gap-4">
        {rows.map((row) => (
          <View key={row.label}>
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="text-[12px] font-semibold text-ink2">{row.label}</Text>
              <Text className="text-[12px] font-bold text-ink">{row.value}</Text>
            </View>
            <View className="h-3 overflow-hidden rounded-full bg-[#EEF1F4]">
              <View
                className="h-full rounded-full"
                style={{ width: `${Math.max((row.value / max) * 100, row.value ? 8 : 0)}%`, backgroundColor: row.color }}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { data: dashboard } = useListingDashboard();

  if (!dashboard) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <Text className="text-base font-semibold text-ink2">Analytics load ho rahi hai...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-[22px] font-extrabold text-ink">Seller Analytics</Text>
          <Text className="mt-1 text-xs text-ink2">Views, contacts aur conversion ki real history.</Text>
        </View>
        <Pressable onPress={() => router.back()} className="rounded-full bg-white px-4 py-2 shadow-sm">
          <Text className="text-sm font-semibold text-red">Close</Text>
        </Pressable>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-3">
        {[
          { label: 'Total Views', value: dashboard.totalViews },
          { label: 'Contacts', value: dashboard.totalContacts },
          { label: 'Saves', value: dashboard.funnel.saves },
          { label: 'Sold', value: dashboard.soldListings },
          { label: 'Contact Rate', value: `${dashboard.contactRate}%` },
          { label: 'Sell Through', value: `${dashboard.sellThroughRate}%` },
        ].map((item) => (
          <View key={item.label} className="min-w-[47%] flex-1 rounded-2xl bg-white p-4 shadow-sm">
            <Text className="text-xs font-semibold text-ink2">{item.label}</Text>
            <Text className="mt-2 text-[22px] font-extrabold text-ink">{item.value}</Text>
          </View>
        ))}
      </View>

      <View className="mt-4">
        <AnalyticsBars points={dashboard.points} />
      </View>

      <View className="mt-4">
        <AnalyticsFunnel funnel={dashboard.funnel} />
      </View>
    </ScrollView>
  );
}
