import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  getCategoryDefinitionBySlug,
  getMinimumPriceForListing,
  getSubcategoryDefinition,
  type ListingAttributes,
  type ListingFeatureDefinition,
} from '@tgmg/types';
import { ProgressHeader } from '../../components/ProgressHeader';

function normalizeFeatureValue(
  feature: ListingFeatureDefinition,
  value: string | boolean | undefined,
): string | number | boolean | undefined {
  if (feature.type === 'boolean') {
    return typeof value === 'boolean' ? value : undefined;
  }

  const text = String(value ?? '').trim();
  if (!text) return undefined;

  if (feature.type === 'number') {
    const numeric = Number(text);
    if (!Number.isFinite(numeric)) return undefined;
    return numeric;
  }

  return text;
}

export default function PostDetailsScreen() {
  const router = useRouter();
  const { categoryId, categoryName, categorySlug } = useLocalSearchParams<{
    categoryId: string;
    categoryName?: string;
    categorySlug?: string;
  }>();
  const [subcategorySlug, setSubcategorySlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'NEW' | 'USED'>('USED');
  const [attributes, setAttributes] = useState<Record<string, string | boolean>>({});
  const entrance = useRef(new Animated.Value(0)).current;

  const categoryDefinition = getCategoryDefinitionBySlug(categorySlug);
  const selectedSubcategory = getSubcategoryDefinition(categorySlug, subcategorySlug);
  const minimumPrice = getMinimumPriceForListing(categorySlug, subcategorySlug);

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const normalizedAttributes = useMemo<ListingAttributes>(() => {
    if (!selectedSubcategory) return {};
    return selectedSubcategory.features.reduce<ListingAttributes>((acc, feature) => {
      const value = normalizeFeatureValue(feature, attributes[feature.key]);
      if (value !== undefined) {
        acc[feature.key] = value;
      }
      return acc;
    }, {});
  }, [attributes, selectedSubcategory]);

  const valid = useMemo(() => {
    if (!subcategorySlug) return false;
    if (title.trim().length < 10) return false;
    if (description.trim().length < 20) return false;
    if (Number(price) < minimumPrice) return false;
    if (selectedSubcategory) {
      return selectedSubcategory.features.every((feature) => {
        if (!feature.required) return true;
        return normalizedAttributes[feature.key] !== undefined;
      });
    }
    return true;
  }, [description, minimumPrice, normalizedAttributes, price, selectedSubcategory, subcategorySlug, title]);

  return (
    <View style={styles.screen}>
      <ProgressHeader step={2} title="Ad Ki Tafseel" />
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View
          style={{
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          }}
        >
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Selected: {categoryName || 'Category'}</Text>
          </View>

          {categoryDefinition ? (
            <View style={styles.section}>
              <Text style={styles.label}>Sub-category</Text>
              <View style={styles.subcategoryGrid}>
                {categoryDefinition.subcategories.map((item, index) => {
                  const active = subcategorySlug === item.slug;
                  return (
                    <Animated.View
                      key={item.slug}
                      style={{
                        opacity: entrance,
                        transform: [
                          {
                            translateY: entrance.interpolate({
                              inputRange: [0, 1],
                              outputRange: [12 + index * 2, 0],
                            }),
                          },
                        ],
                      }}
                    >
                      <Pressable
                        onPress={() => {
                          setSubcategorySlug(item.slug);
                          setAttributes({});
                          if (price && Number(price) < item.minPrice) {
                            setPrice(String(item.minPrice));
                          }
                        }}
                        style={[styles.subcategoryCard, active && styles.subcategoryCardActive]}
                      >
                        <Text style={[styles.subcategoryTitle, active && styles.subcategoryTitleActive]}>
                          {item.name}
                        </Text>
                        <Text style={styles.subcategoryMeta}>
                          Min PKR {item.minPrice.toLocaleString()}
                        </Text>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              placeholder="Product ka title likhein"
            />
            <Text style={styles.counter}>{title.length}/100</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={[styles.input, styles.textarea]}
              placeholder="Product ki poori tafseel dein"
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{description.length}/1000</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Price</Text>
            <View style={styles.priceRow}>
              <Text style={styles.pricePrefix}>PKR</Text>
              <TextInput
                value={price}
                onChangeText={(value) => setPrice(value.replace(/\D/g, ''))}
                style={styles.priceInput}
                placeholder="Price daalein"
                keyboardType="numeric"
              />
            </View>
            <Text style={styles.minimumPrice}>Minimum allowed: PKR {minimumPrice.toLocaleString()}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Condition</Text>
            <View style={styles.segmentRow}>
              {[
                { value: 'NEW', label: 'Naya' },
                { value: 'USED', label: 'Purana' },
              ].map((item) => {
                const active = condition === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setCondition(item.value as 'NEW' | 'USED')}
                    style={[styles.segmentButton, active && styles.segmentButtonActive]}
                  >
                    <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {selectedSubcategory ? (
            <View style={styles.section}>
              <Text style={styles.label}>Auto Features</Text>
              {selectedSubcategory.features.map((feature) => (
                <View key={feature.key} style={styles.featureBlock}>
                  <Text style={styles.featureLabel}>{feature.label}</Text>
                  {feature.type === 'select' ? (
                    <View style={styles.optionRow}>
                      {feature.options?.map((option) => {
                        const active = attributes[feature.key] === option;
                        return (
                          <Pressable
                            key={option}
                            onPress={() =>
                              setAttributes((current) => ({ ...current, [feature.key]: option }))
                            }
                            style={[styles.optionChip, active && styles.optionChipActive]}
                          >
                            <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                              {option}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : feature.type === 'boolean' ? (
                    <View style={styles.booleanRow}>
                      <Text style={styles.booleanLabel}>
                        {attributes[feature.key] === true ? 'Yes' : attributes[feature.key] === false ? 'No' : 'Select'}
                      </Text>
                      <Switch
                        value={attributes[feature.key] === true}
                        onValueChange={(value) =>
                          setAttributes((current) => ({ ...current, [feature.key]: value }))
                        }
                      />
                    </View>
                  ) : (
                    <TextInput
                      value={String(attributes[feature.key] ?? '')}
                      onChangeText={(value) =>
                        setAttributes((current) => ({ ...current, [feature.key]: value }))
                      }
                      style={styles.input}
                      placeholder={feature.placeholder || feature.label}
                      keyboardType={feature.type === 'number' ? 'numeric' : 'default'}
                    />
                  )}
                </View>
              ))}
            </View>
          ) : null}

          <Pressable
            disabled={!valid}
            onPress={() =>
              router.push({
                pathname: '/post/photos',
                params: {
                  categoryId,
                  categoryName,
                  categorySlug,
                  subcategorySlug,
                  subcategoryName: selectedSubcategory?.name,
                  title,
                  description,
                  price,
                  condition,
                  attributes: JSON.stringify(normalizedAttributes),
                },
              })
            }
            style={[styles.submitButton, !valid && styles.submitButtonDisabled]}
          >
            <Text style={styles.submitText}>Aage Barhein</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#E53935',
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    marginTop: 16,
  },
  label: {
    marginBottom: 8,
    color: '#1C1E21',
    fontSize: 14,
    fontWeight: '700',
  },
  subcategoryGrid: {
    gap: 12,
  },
  subcategoryCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E6EB',
    borderWidth: 1,
    padding: 14,
  },
  subcategoryCardActive: {
    borderColor: '#E53935',
    backgroundColor: '#FFF1F0',
  },
  subcategoryTitle: {
    color: '#1C1E21',
    fontSize: 14,
    fontWeight: '800',
  },
  subcategoryTitleActive: {
    color: '#E53935',
  },
  subcategoryMeta: {
    marginTop: 6,
    color: '#65676B',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E6EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#1C1E21',
    fontSize: 15,
  },
  textarea: {
    minHeight: 120,
  },
  counter: {
    marginTop: 6,
    textAlign: 'right',
    color: '#8E95A3',
    fontSize: 12,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E6EB',
    backgroundColor: '#FFFFFF',
  },
  pricePrefix: {
    paddingHorizontal: 16,
    color: '#E53935',
    fontSize: 14,
    fontWeight: '800',
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#1C1E21',
    fontSize: 15,
  },
  minimumPrice: {
    marginTop: 6,
    color: '#65676B',
    fontSize: 12,
    fontWeight: '700',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E6EB',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
  },
  segmentButtonActive: {
    borderColor: '#E53935',
    backgroundColor: '#E53935',
  },
  segmentLabel: {
    textAlign: 'center',
    color: '#65676B',
    fontSize: 14,
    fontWeight: '700',
  },
  segmentLabelActive: {
    color: '#FFFFFF',
  },
  featureBlock: {
    marginBottom: 14,
  },
  featureLabel: {
    marginBottom: 8,
    color: '#1C1E21',
    fontSize: 13,
    fontWeight: '700',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E4E6EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionChipActive: {
    borderColor: '#E53935',
    backgroundColor: '#FFF1F0',
  },
  optionChipText: {
    color: '#65676B',
    fontSize: 12,
    fontWeight: '700',
  },
  optionChipTextActive: {
    color: '#E53935',
  },
  booleanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E6EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  booleanLabel: {
    color: '#1C1E21',
    fontSize: 14,
    fontWeight: '700',
  },
  submitButton: {
    marginTop: 24,
    borderRadius: 18,
    backgroundColor: '#E53935',
    paddingVertical: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#D7DADF',
  },
  submitText: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
