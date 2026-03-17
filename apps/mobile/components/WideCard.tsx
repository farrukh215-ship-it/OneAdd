import type { Listing } from '@tgmg/types';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { getListingLocationLabel, getListingStatusMeta } from '../lib/listing-ui';

function getStatusStyles(meta: ReturnType<typeof getListingStatusMeta>) {
  if (meta.textClassName === 'text-white') {
    return { badge: styles.greenBadge, text: styles.whiteBadgeText };
  }

  if (meta.textClassName === 'text-red') {
    return { badge: styles.grayBadge, text: styles.redBadgeText };
  }

  return { badge: styles.grayBadge, text: styles.mutedBadgeText };
}

export function WideCard({
  listing,
  onPress,
}: {
  listing: Listing;
  onPress?: () => void;
}) {
  const statusMeta = getListingStatusMeta(listing);
  const statusStyles = getStatusStyles(statusMeta);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.imageWrap}>
        {listing.images[0] ? (
          <Image source={{ uri: listing.images[0] }} resizeMode="cover" style={styles.image} />
        ) : (
          <Text style={styles.emptyImageText}>No Image</Text>
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.price}>PKR {listing.price.toLocaleString()}</Text>
        <Text style={styles.title} numberOfLines={1}>
          {listing.title}
        </Text>
        <View style={styles.badges}>
          <View style={[styles.badge, statusStyles.badge]}>
            <Text style={[styles.badgeText, statusStyles.text]}>{statusMeta.label}</Text>
          </View>
          <View style={[styles.badge, styles.grayBadge]}>
            <Text style={[styles.badgeText, styles.mutedBadgeText]}>
              {listing.condition === 'NEW' ? 'New' : 'Used'}
            </Text>
          </View>
        </View>
        <Text style={styles.location}>{getListingLocationLabel(listing)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  imageWrap: {
    alignItems: 'center',
    backgroundColor: '#E4E6EB',
    borderRadius: 16,
    height: 96,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 96,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  emptyImageText: {
    color: '#BEC3C9',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingLeft: 12,
  },
  price: {
    color: '#1C1E21',
    fontSize: 18,
    fontWeight: '800',
  },
  title: {
    color: '#65676B',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  grayBadge: {
    backgroundColor: '#F5F6F7',
  },
  greenBadge: {
    backgroundColor: '#2E7D32',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  whiteBadgeText: {
    color: '#FFFFFF',
  },
  redBadgeText: {
    color: '#E53935',
  },
  mutedBadgeText: {
    color: '#65676B',
  },
  location: {
    color: '#65676B',
    fontSize: 11,
    marginTop: 10,
  },
});
