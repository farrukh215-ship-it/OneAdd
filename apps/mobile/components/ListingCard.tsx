import type { Listing } from '@tgmg/types';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { distanceFromCity } from '../lib/distance';
import { getListingLocationLabel, getListingStatusMeta } from '../lib/listing-ui';

const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - 36) / 2;

function getStatusStyles(meta: ReturnType<typeof getListingStatusMeta>) {
  if (meta.textClassName === 'text-white') {
    return { badge: styles.statusGreen, text: styles.statusWhiteText };
  }

  if (meta.textClassName === 'text-red') {
    return { badge: styles.statusSoft, text: styles.statusRedText };
  }

  return { badge: styles.statusSoft, text: styles.statusMutedText };
}

export function ListingCard({
  listing,
  onPress,
  referenceCity = 'Lahore',
}: {
  listing: Listing;
  onPress: () => void;
  referenceCity?: string;
}) {
  const location = getListingLocationLabel(listing);
  const statusMeta = getListingStatusMeta(listing);
  const statusStyles = getStatusStyles(statusMeta);
  const distance =
    typeof listing.distanceKm === 'number'
      ? Math.round(listing.distanceKm)
      : distanceFromCity(
          referenceCity,
          listing.city,
          typeof listing.lat === 'number' && typeof listing.lng === 'number'
            ? { lat: listing.lat, lng: listing.lng }
            : undefined,
        );

  return (
    <Pressable onPress={onPress} style={[styles.card, { width: cardWidth }]}>
      {({ pressed }) => (
        <View style={{ opacity: pressed ? 0.92 : 1 }}>
          <View style={styles.mediaFrame}>
            {listing.images[0] ? (
              <Image
                source={{ uri: listing.images[0] }}
                resizeMode="cover"
                style={styles.media}
              />
            ) : (
              <View style={styles.emptyMedia}>
                <Text style={styles.emptyText}>No Image</Text>
              </View>
            )}
            <View style={styles.ownerBadge}>
              <Text style={styles.ownerBadgeText}>Asli Malik</Text>
            </View>
            <View style={[styles.statusBadge, statusStyles.badge]}>
              <Text style={[styles.statusText, statusStyles.text]}>{statusMeta.label}</Text>
            </View>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>Save</Text>
            </View>
          </View>
          <View style={styles.content}>
            <Text style={styles.price}>PKR {listing.price.toLocaleString()}</Text>
            <Text style={styles.title} numberOfLines={2}>
              {listing.title}
            </Text>
            <Text style={styles.location}>
              {location || listing.city}
              {distance !== null ? ` | ${distance} km door` : ''}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  mediaFrame: {
    aspectRatio: 1,
    backgroundColor: '#E4E6EB',
    position: 'relative',
  },
  media: {
    height: '100%',
    width: '100%',
  },
  emptyMedia: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emptyText: {
    color: '#BEC3C9',
    fontSize: 12,
    fontWeight: '600',
  },
  ownerBadge: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 999,
    bottom: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: 'absolute',
  },
  ownerBadgeText: {
    color: '#1C1E21',
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    borderRadius: 999,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: 'absolute',
    top: 10,
  },
  statusSoft: {
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  statusGreen: {
    backgroundColor: '#2E7D32',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusWhiteText: {
    color: '#FFFFFF',
  },
  statusRedText: {
    color: '#E53935',
  },
  statusMutedText: {
    color: '#65676B',
  },
  saveBadge: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: 'absolute',
    right: 10,
    top: 10,
  },
  saveBadgeText: {
    color: '#1C1E21',
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    padding: 12,
  },
  price: {
    color: '#1C1E21',
    fontSize: 16,
    fontWeight: '800',
  },
  title: {
    color: '#65676B',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 6,
  },
  location: {
    color: '#65676B',
    fontSize: 11,
    marginTop: 10,
  },
});
