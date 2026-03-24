import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
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
  getVehicleCcOptions,
  getVehicleMakeOptions,
  getVehicleModelOptions,
  type ListingAttributes,
  type ListingFeatureDefinition,
  type WorkshopPartner,
} from '@tgmg/types';
import { ProgressHeader } from '../../components/ProgressHeader';
import { api } from '../../lib/api';

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

function sanitizeNumericInput(value: string) {
  return value.replace(/[^\d.]/g, '');
}

const cities = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad'];

export default function PostDetailsScreen() {
  const router = useRouter();
  const { categoryId, categoryName, categorySlug } = useLocalSearchParams<{
    categoryId: string;
    categoryName?: string;
    categorySlug?: string;
  }>();
  const requiresVehicleInspection = categorySlug === 'cars' || categorySlug === 'motorcycles';
  const [subcategorySlug, setSubcategorySlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'NEW' | 'USED'>('USED');
  const [attributes, setAttributes] = useState<Record<string, string | boolean>>({});
  const [city, setCity] = useState('Lahore');
  const [workshops, setWorkshops] = useState<WorkshopPartner[]>([]);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState('');
  const [inspectionPdfUri, setInspectionPdfUri] = useState('');
  const [inspectionPdfName, setInspectionPdfName] = useState('');
  const [openSelectKey, setOpenSelectKey] = useState<string | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;

  const categoryDefinition = getCategoryDefinitionBySlug(categorySlug);
  const selectedSubcategory = getSubcategoryDefinition(categorySlug, subcategorySlug);
  const minimumPrice = getMinimumPriceForListing(categorySlug, subcategorySlug);
  const selectedMake = typeof attributes.make === 'string' ? attributes.make : '';
  const vehicleMakeOptions = getVehicleMakeOptions(categorySlug);
  const vehicleModelOptions = getVehicleModelOptions(categorySlug, selectedMake);
  const vehicleCcOptions = getVehicleCcOptions(categorySlug);

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  useEffect(() => {
    if (!requiresVehicleInspection || !city) {
      setWorkshops([]);
      return;
    }
    void api
      .get<WorkshopPartner[]>('/inspections/workshops', { params: { city } })
      .then((response) => setWorkshops(response.data))
      .catch(() => setWorkshops([]));
  }, [city, requiresVehicleInspection]);

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
    if (requiresVehicleInspection) {
      if (!city) return false;
      if (!selectedWorkshopId) return false;
      if (!inspectionPdfUri) return false;
    }
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
  }, [
    city,
    description,
    inspectionPdfUri,
    minimumPrice,
    normalizedAttributes,
    price,
    requiresVehicleInspection,
    selectedSubcategory,
    selectedWorkshopId,
    subcategorySlug,
    title,
  ]);

  const pickInspectionPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const file = result.assets?.[0];
    if (!file?.uri) return;
    setInspectionPdfUri(file.uri);
    setInspectionPdfName(file.name || 'inspection-form.pdf');
  };

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

          {requiresVehicleInspection ? (
            <View style={styles.workshopPanel}>
              <View style={styles.workshopPanelHeader}>
                <View>
                  <Text style={styles.workshopTitle}>Workshop Verification First</Text>
                  <Text style={styles.workshopText}>
                    Vehicle ad tabhi aage jayegi jab city, workshop, aur readable PDF pehle select hoga.
                  </Text>
                </View>
                <View style={styles.workshopBadge}>
                  <Text style={styles.workshopBadgeText}>Cars + Bikes</Text>
                </View>
              </View>

              <Text style={styles.label}>City</Text>
              <View style={styles.optionRow}>
                {cities.map((item) => {
                  const active = city === item;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => setCity(item)}
                      style={[styles.optionChip, active && styles.optionChipActive]}
                    >
                      <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>{item}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Workshop</Text>
              <View style={styles.optionRow}>
                {workshops.map((workshop) => {
                  const active = selectedWorkshopId === workshop.id;
                  return (
                    <Pressable
                      key={workshop.id}
                      onPress={() => setSelectedWorkshopId(workshop.id)}
                      style={[styles.optionChip, active && styles.optionChipActive]}
                    >
                      <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                        {workshop.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Inspection PDF</Text>
              <Pressable onPress={pickInspectionPdf} style={styles.selectButton}>
                <Text style={inspectionPdfName ? styles.selectValue : styles.selectPlaceholder}>
                  {inspectionPdfName || 'Readable PDF upload karein'}
                </Text>
              </Pressable>
            </View>
          ) : null}

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
                    <View>
                      <Pressable
                        onPress={() =>
                          setOpenSelectKey((current) => (current === feature.key ? null : feature.key))
                        }
                        style={styles.selectButton}
                      >
                        <Text
                          style={
                            attributes[feature.key] ? styles.selectValue : styles.selectPlaceholder
                          }
                        >
                          {String(attributes[feature.key] ?? '') || `${feature.label} select karein`}
                        </Text>
                      </Pressable>
                      {openSelectKey === feature.key ? (
                        <View style={styles.dropdownCard}>
                          {(feature.key === 'make'
                            ? vehicleMakeOptions
                            : feature.key === 'model'
                              ? vehicleModelOptions
                              : feature.key === 'cc'
                                ? vehicleCcOptions
                                : feature.options ?? []
                          ).map((option) => {
                            const active = attributes[feature.key] === option;
                            return (
                              <Pressable
                                key={option}
                                onPress={() => {
                                  setAttributes((current) => {
                                    if (feature.key === 'make') {
                                      return { ...current, make: option, model: '' };
                                    }
                                    return { ...current, [feature.key]: option };
                                  });
                                  setOpenSelectKey(null);
                                }}
                                style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                              >
                                <Text
                                  style={[
                                    styles.dropdownOptionText,
                                    active && styles.dropdownOptionTextActive,
                                  ]}
                                >
                                  {option}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      ) : null}
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
                        setAttributes((current) => ({
                          ...current,
                          [feature.key]:
                            feature.type === 'number' ? sanitizeNumericInput(value) : value,
                        }))
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
                  city,
                  selectedWorkshopId,
                  inspectionPdfUri,
                  inspectionPdfName,
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
  workshopPanel: {
    marginTop: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D7E5DA',
    backgroundColor: '#F7FBF8',
    padding: 16,
  },
  workshopPanelHeader: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  workshopTitle: {
    color: '#1C1E21',
    fontSize: 16,
    fontWeight: '800',
  },
  workshopText: {
    marginTop: 4,
    color: '#5B6776',
    fontSize: 13,
    lineHeight: 19,
  },
  workshopBadge: {
    borderRadius: 999,
    backgroundColor: '#E7F7EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  workshopBadgeText: {
    color: '#1E7A38',
    fontSize: 11,
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
  selectButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E6EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectPlaceholder: {
    color: '#A0A8B5',
    fontSize: 15,
    fontWeight: '600',
  },
  selectValue: {
    color: '#1C1E21',
    fontSize: 15,
    fontWeight: '700',
  },
  dropdownCard: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E6EB',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dropdownOption: {
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownOptionActive: {
    backgroundColor: '#FFF1F0',
  },
  dropdownOptionText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownOptionTextActive: {
    color: '#E53935',
    fontWeight: '800',
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
