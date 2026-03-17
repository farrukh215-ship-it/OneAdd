'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  getCategoryDefinitionBySlug,
  getMinimumPriceForListing,
  getSubcategoryDefinition,
  type ListingAttributes,
  type ListingFeatureDefinition,
} from '@tgmg/types';
import { useCategories } from '../../hooks/useCategories';
import { api } from '../../lib/api';
import { uploadMediaToR2 } from '../../lib/uploads';

const cities = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad'];

type MediaItem = {
  id: string;
  type: 'image' | 'video';
  previewUrl: string;
  file: File;
  name: string;
};

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

export default function PostPage() {
  const router = useRouter();
  const { data: apiCategories = [] } = useCategories();
  const categories = apiCategories;
  const [isDukaanMode, setIsDukaanMode] = useState(false);

  const [step, setStep] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [subcategorySlug, setSubcategorySlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [attributes, setAttributes] = useState<Record<string, string | boolean>>({});
  const [condition, setCondition] = useState<'NEW' | 'USED'>('USED');
  const [storeType, setStoreType] = useState<'ONLINE' | 'ROAD'>('ROAD');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [coverImageId, setCoverImageId] = useState<string>('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationHints, setLocationHints] = useState<Array<{ label: string; city?: string; lat: number; lng: number }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!window.localStorage.getItem('tgmg_token')) {
      router.replace('/auth?next=/post');
    }
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsDukaanMode(params.get('mode') === 'dukaan' || params.get('mode') === 'store');
    if (params.get('store') === 'online') {
      setStoreType('ONLINE');
    } else if (params.get('store') === 'road') {
      setStoreType('ROAD');
    }
  }, []);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || locationQuery.trim().length < 3) {
      setLocationHints([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationQuery)}.json?autocomplete=true&limit=5&access_token=${token}`,
        );
        const result = await response.json();
        const hints = (result.features || []).map((feature: any) => ({
          label: feature.place_name as string,
          city: feature.context?.find((item: any) => String(item.id || '').startsWith('place'))?.text as string | undefined,
          lat: feature.center?.[1],
          lng: feature.center?.[0],
        }));
        setLocationHints(hints.filter((item: any) => typeof item.lat === 'number' && typeof item.lng === 'number'));
      } catch {
        setLocationHints([]);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [locationQuery]);

  const progress = useMemo(() => `${(step / 4) * 100}%`, [step]);
  const imageItems = media.filter((item) => item.type === 'image');
  const videoItems = media.filter((item) => item.type === 'video');
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const selectedCategoryDefinition = getCategoryDefinitionBySlug(selectedCategory?.slug);
  const selectedSubcategory = getSubcategoryDefinition(selectedCategory?.slug, subcategorySlug);
  const minimumPrice = getMinimumPriceForListing(selectedCategory?.slug, subcategorySlug);

  const onImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const slots = 6 - imageItems.length;
    const selected = files.filter((file) => file.type.startsWith('image/')).slice(0, Math.max(0, slots));
    if (!selected.length) return;

    const newItems = await Promise.all(
      selected.map(async (file) => {
        const previewUrl = URL.createObjectURL(file);
        return {
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          type: 'image' as const,
          previewUrl,
          file,
          name: file.name,
        };
      }),
    );

    setMedia((current) => [...current, ...newItems]);
    if (!coverImageId) setCoverImageId(newItems[0]!.id);
    setMessage(null);
    event.target.value = '';
  };

  const onVideoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setMessage('Sirf video file upload karein');
      return;
    }
    if (videoItems.length >= 1) {
      setMessage('Sirf 1 video allow hai');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = previewUrl;

    video.onloadedmetadata = async () => {
      if (video.duration > 30) {
        setMessage('Video maximum 30 seconds ka hona chahiye');
        URL.revokeObjectURL(previewUrl);
        return;
      }

      setMedia((current) => [
        ...current,
        {
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          type: 'video',
          previewUrl,
          file,
          name: file.name,
        },
      ]);
      setMessage(null);
    };
    event.target.value = '';
  };

  const removeMedia = (id: string) => {
    setMedia((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((item) => item.id !== id);
    });
    if (coverImageId === id) {
      const nextImage = imageItems.find((item) => item.id !== id);
      setCoverImageId(nextImage?.id || '');
    }
  };

  const fetchCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setMessage('Browser location support nahi karta');
      return;
    }

    setIsFetchingLocation(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          setLat(latitude);
          setLng(longitude);
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
          );
          const result = await response.json();
          const addr = result.address || {};
          const cityName = addr.city || addr.town || addr.state_district || addr.state || '';
          const locality = addr.suburb || addr.neighbourhood || addr.road || result.display_name || '';
          if (cityName) setCity(cityName);
          if (locality) setArea(locality);
        } catch {
          setMessage('Location read karne mein masla aaya');
        } finally {
          setIsFetchingLocation(false);
        }
      },
      () => {
        setMessage('Location permission allow karein');
        setIsFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

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

  const canProceed = () => {
    if (step === 1 && !categoryId) return 'Pehle category select karein';
    if (step === 2) {
      if (!subcategorySlug) return 'Sub-category select karein';
      if (title.trim().length < 10) return 'Title minimum 10 characters ka ho';
      if (description.trim().length < 20) return 'Description minimum 20 characters ka ho';
      if (!price || Number(price) < minimumPrice) {
        return `Price minimum PKR ${minimumPrice.toLocaleString()} rakhein`;
      }
      if (selectedSubcategory) {
        for (const feature of selectedSubcategory.features) {
          if (feature.required && normalizedAttributes[feature.key] === undefined) {
            return `${feature.label} fill karein`;
          }
        }
      }
    }
    if (step === 3) {
      if (imageItems.length < 1) return 'Kam az kam 1 image required hai';
      if (!coverImageId) return 'Cover image select karein';
    }
    return null;
  };

  const goNext = () => {
    const error = canProceed();
    if (error) {
      setMessage(error);
      return;
    }
    setMessage(null);
    setStep((current) => Math.min(4, current + 1));
  };

  const submit = async () => {
    if (!city) {
      setMessage('City select karein');
      return;
    }
    if (!imageItems.length) {
      setMessage('Kam az kam 1 image required hai');
      return;
    }

    setIsSubmitting(true);
    setMessage('Media upload ho rahi hai...');
    try {
      const uploadedMedia = await uploadMediaToR2(
        media.map((item) => ({
          id: item.id,
          kind: item.type,
          file: item.file,
        })),
      );

      const mediaMap = new Map(uploadedMedia.map((item) => [item.id, item.url]));
      const coverImage = imageItems.find((item) => item.id === coverImageId);
      const orderedImages = [
        ...(coverImage ? [mediaMap.get(coverImage.id)] : []),
        ...imageItems
          .filter((item) => item.id !== coverImageId)
          .map((item) => mediaMap.get(item.id)),
      ]
        .filter((url): url is string => Boolean(url))
        .slice(0, 6);

      const uploadedVideos = videoItems
        .map((item) => mediaMap.get(item.id))
        .filter((url): url is string => Boolean(url))
        .slice(0, 1);

      if (!orderedImages.length) {
        setMessage('Image upload fail hui. Dobara try karein.');
        setIsSubmitting(false);
        return;
      }

      setMessage('Ad publish ho rahi hai...');
      const response = await api.post('/listings', {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        categoryId,
        subcategorySlug,
        subcategoryName: selectedSubcategory?.name,
        attributes: normalizedAttributes,
        images: orderedImages,
        videos: uploadedVideos,
        condition,
        isStore: isDukaanMode,
        storeType: isDukaanMode ? storeType : undefined,
        city,
        area: area.trim() || undefined,
        lat,
        lng,
      });

      setMessage('Mubarak! Aapki ad publish ho gayi.');
      const nextId = response.data.id ?? response.data.data?.id;
      if (nextId) {
        window.setTimeout(() => router.push(`/listings/${nextId}`), 900);
      } else {
        window.setTimeout(() => router.push('/listings'), 900);
      }
    } catch (error: any) {
      const serverMessage = error?.response?.data?.message;
      const messageText = Array.isArray(serverMessage)
        ? serverMessage[0]
        : serverMessage ?? error?.message;
      if (typeof messageText === 'string' && /upload|network|failed|cors/i.test(messageText)) {
        setMessage('Media upload fail hui. Cloudflare R2 CORS/API config check karke dobara try karein.');
      } else {
        setMessage(typeof messageText === 'string' ? messageText : 'Ad publish nahi hui, dobara try karein.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-wrap px-2 py-4 md:px-5">
      <div className="surface mx-auto max-w-4xl p-4">
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-bold text-ink">Step {step} / 4</span>
            <span className="text-ink2">Progress</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#ECEEF2]">
            <div className="h-full rounded-full bg-red transition-all" style={{ width: progress }} />
          </div>
          {selectedCategory ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-red/20 bg-red-light px-3 py-1 text-xs font-bold text-red">
              {selectedCategory.icon} Selected: {selectedCategory.name}
            </div>
          ) : null}
          {isDukaanMode ? (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-green/20 bg-green-light px-3 py-1 text-xs font-bold text-green">
              Dukaan ad mode active
            </div>
          ) : null}
        </div>

        {step === 1 ? (
          <div>
            <h1 className="section-title">Category select</h1>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setCategoryId(category.id);
                    setSubcategorySlug('');
                    setAttributes({});
                  }}
                  className={`surface p-4 text-left ${categoryId === category.id ? '!border-red !bg-red-light' : ''}`}
                >
                  <div className="text-3xl">{category.icon}</div>
                  <div className="mt-2 text-sm font-bold text-ink">{category.name}</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <h1 className="section-title">Details</h1>
            {selectedCategoryDefinition ? (
              <div>
                <div className="mb-2 text-sm font-bold text-ink">Sub-category</div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedCategoryDefinition.subcategories.map((subcategory) => (
                    <button
                      key={subcategory.slug}
                      type="button"
                      onClick={() => {
                        setSubcategorySlug(subcategory.slug);
                        setAttributes({});
                        if (price && Number(price) < subcategory.minPrice) {
                          setPrice(String(subcategory.minPrice));
                        }
                      }}
                      className={`surface p-4 text-left ${
                        subcategorySlug === subcategory.slug ? '!border-red !bg-red-light' : ''
                      }`}
                    >
                      <div className="text-sm font-bold text-ink">{subcategory.name}</div>
                      <div className="mt-2 text-xs text-ink2">
                        Min price: PKR {subcategory.minPrice.toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="field-input" placeholder="Title" />
              <div className="mt-1 text-right text-xs text-ink3">{title.length}/100</div>
            </div>
            <div>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="field-textarea" placeholder="Description" />
              <div className="mt-1 text-right text-xs text-ink3">{description.length}/1000</div>
            </div>
            <div className="field-input flex items-center gap-2">
              <span className="font-bold text-red">PKR</span>
              <input value={price} onChange={(event) => setPrice(event.target.value.replace(/\D/g, ''))} className="min-w-0 flex-1 border-0 bg-transparent outline-none" placeholder="Price" />
            </div>
            <div className="text-xs font-semibold text-ink2">
              Minimum allowed: PKR {minimumPrice.toLocaleString()}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCondition('NEW')} className={`chip ${condition === 'NEW' ? 'active' : ''}`}>Naya</button>
              <button type="button" onClick={() => setCondition('USED')} className={`chip ${condition === 'USED' ? 'active' : ''}`}>Purana</button>
            </div>
            {selectedSubcategory ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {selectedSubcategory.features.map((feature) => (
                  <div key={feature.key}>
                    <div className="mb-2 text-sm font-semibold text-ink">{feature.label}</div>
                    {feature.type === 'select' ? (
                      <select
                        value={String(attributes[feature.key] ?? '')}
                        onChange={(event) =>
                          setAttributes((current) => ({ ...current, [feature.key]: event.target.value }))
                        }
                        className="field-select"
                      >
                        <option value="">Select karein</option>
                        {feature.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : feature.type === 'boolean' ? (
                      <div className="flex gap-2">
                        {[true, false].map((value) => {
                          const active = attributes[feature.key] === value;
                          return (
                            <button
                              key={String(value)}
                              type="button"
                              onClick={() =>
                                setAttributes((current) => ({ ...current, [feature.key]: value }))
                              }
                              className={`chip ${active ? 'active' : ''}`}
                            >
                              {value ? 'Yes' : 'No'}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <input
                        value={String(attributes[feature.key] ?? '')}
                        onChange={(event) =>
                          setAttributes((current) => ({ ...current, [feature.key]: event.target.value }))
                        }
                        className="field-input"
                        placeholder={feature.placeholder || feature.label}
                        inputMode={feature.type === 'number' ? 'numeric' : 'text'}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <h1 className="section-title">Photos & Video</h1>
            <div className="mt-3 text-sm text-ink2">
              Max 6 images + 1 video (30 sec max). Cover image lazmi select karein.
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="surface flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[16px] border-dashed p-5 text-center text-sm text-ink2">
                <span className="text-3xl">🖼️</span>
                Images upload
                <input type="file" accept="image/*" multiple className="hidden" onChange={onImageChange} />
              </label>
              <label className="surface flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[16px] border-dashed p-5 text-center text-sm text-ink2">
                <span className="text-3xl">🎥</span>
                Video upload
                <input type="file" accept="video/*" className="hidden" onChange={onVideoChange} />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {media.map((item) => (
                <div key={item.id} className={`surface relative overflow-hidden rounded-xl p-1 ${coverImageId === item.id ? '!border-red' : ''}`}>
                  <div className="aspect-square overflow-hidden rounded-lg bg-border">
                    {item.type === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.previewUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <video src={item.previewUrl} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-1">
                    {item.type === 'image' ? (
                      <button type="button" className="text-[10px] font-bold text-red" onClick={() => setCoverImageId(item.id)}>
                        {coverImageId === item.id ? 'Cover ✓' : 'Set Cover'}
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-ink2">Video</span>
                    )}
                    <button type="button" className="text-[10px] font-bold text-ink2" onClick={() => removeMedia(item.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <h1 className="section-title">Location & Review</h1>
            <div className="flex flex-wrap gap-2">
              <select value={city} onChange={(event) => setCity(event.target.value)} className="field-select">
                <option value="">City choose karo</option>
                {cities.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <button type="button" className="btn-white" onClick={fetchCurrentLocation} disabled={isFetchingLocation}>
                {isFetchingLocation ? 'Location aa rahi hai...' : '📍 Current Location'}
              </button>
            </div>

            <input value={area} onChange={(event) => setArea(event.target.value)} className="field-input" placeholder="Area / exact location" />

            <div className="space-y-2">
              <input
                value={locationQuery}
                onChange={(event) => setLocationQuery(event.target.value)}
                className="field-input"
                placeholder="Map search karo (area/street likho)"
              />
              {locationHints.length ? (
                <div className="surface max-h-44 overflow-y-auto p-2">
                  {locationHints.map((hint, index) => (
                    <button
                      key={`${hint.label}-${index}`}
                      type="button"
                      onClick={() => {
                        setArea(hint.label);
                        setCity(hint.city || city || 'Lahore');
                        setLat(hint.lat);
                        setLng(hint.lng);
                        setLocationHints([]);
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink2 hover:bg-[#F8F9FB]"
                    >
                      {hint.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {isDukaanMode ? (
              <div className="flex gap-2">
                <button type="button" className={`chip ${storeType === 'ROAD' ? 'active' : ''}`} onClick={() => setStoreType('ROAD')}>
                  Road Dukaan
                </button>
                <button type="button" className={`chip ${storeType === 'ONLINE' ? 'active' : ''}`} onClick={() => setStoreType('ONLINE')}>
                  Online Dukaan
                </button>
              </div>
            ) : null}

            <div className="rounded-[16px] border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
              ⚠️ Rule: Aap ek category mein max 3 active ads post kar sakte hain.
            </div>

            <div className="surface p-4 text-sm text-ink2">
              <div className="font-bold text-ink">Final Review</div>
              <div className="mt-2">Category: {selectedCategory?.name || 'N/A'}</div>
              <div>Sub-category: {selectedSubcategory?.name || 'N/A'}</div>
              <div>Price: PKR {price || '0'}</div>
              <div>Condition: {condition}</div>
              <div>Images: {imageItems.length} / 6</div>
              <div>Video: {videoItems.length} / 1</div>
              <div>Ad Type: {isDukaanMode ? 'Dukaan' : 'Normal'}</div>
              {isDukaanMode ? <div>Store: {storeType}</div> : null}
            </div>
          </div>
        ) : null}

        {message ? (
          <div className="mt-4 rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink2">{message}</div>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" onClick={() => setStep((current) => Math.max(1, current - 1))} className="btn-white">
            Peeche
          </button>
          {step < 4 ? (
            <button type="button" onClick={goNext} className="btn-red">
              Aage Barhein →
            </button>
          ) : (
            <button type="button" onClick={submit} className="btn-red w-full max-w-[220px]" disabled={isSubmitting}>
              {isSubmitting ? 'Ad lag rahi hai...' : 'Ad Lagao ✓'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
