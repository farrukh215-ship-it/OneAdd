'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useCategories } from '../../hooks/useCategories';
import { fallbackCategories } from '../../lib/fallback-data';

const cities = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad'];

type MediaItem = {
  id: string;
  type: 'image' | 'video';
  url: string;
  name: string;
};

export default function PostPage() {
  const router = useRouter();
  const { data: apiCategories = [] } = useCategories();
  const categories = apiCategories.length ? apiCategories : fallbackCategories;

  const [step, setStep] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'NEW' | 'USED'>('USED');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [coverImageId, setCoverImageId] = useState<string>('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  useEffect(() => {
    if (!window.localStorage.getItem('tgmg_token')) {
      router.replace('/auth?next=/post');
    }
  }, [router]);

  const progress = useMemo(() => `${(step / 4) * 100}%`, [step]);
  const imageCount = media.filter((item) => item.type === 'image').length;
  const hasVideo = media.some((item) => item.type === 'video');

  const onImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const slots = 6 - imageCount;
    const selected = files.filter((file) => file.type.startsWith('image/')).slice(0, Math.max(0, slots));
    if (!selected.length) return;

    const newItems = selected.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      type: 'image' as const,
      url: URL.createObjectURL(file),
      name: file.name,
    }));
    setMedia((current) => [...current, ...newItems]);
    if (!coverImageId) setCoverImageId(newItems[0]!.id);
    setMessage(null);
    event.target.value = '';
  };

  const onVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setMessage('Sirf video file upload karein');
      return;
    }
    if (hasVideo) {
      setMessage('Sirf 1 video allow hai');
      return;
    }

    const tempUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = tempUrl;

    video.onloadedmetadata = () => {
      if (video.duration > 30) {
        setMessage('Video maximum 30 seconds ka hona chahiye');
        URL.revokeObjectURL(tempUrl);
        return;
      }

      setMedia((current) => [
        ...current,
        {
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          type: 'video',
          url: tempUrl,
          name: file.name,
        },
      ]);
      setMessage(null);
    };
    event.target.value = '';
  };

  const removeMedia = (id: string) => {
    setMedia((current) => current.filter((item) => item.id !== id));
    if (coverImageId === id) {
      const nextImage = media.find((item) => item.id !== id && item.type === 'image');
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
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
          );
          const result = await response.json();
          const addr = result.address || {};
          const cityName =
            addr.city || addr.town || addr.state_district || addr.state || '';
          const locality =
            addr.suburb || addr.neighbourhood || addr.road || result.display_name || '';

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

  const canProceed = () => {
    if (step === 1 && !categoryId) return 'Pehle category select karein';
    if (step === 2) {
      if (title.trim().length < 10) return 'Title minimum 10 characters ka ho';
      if (description.trim().length < 20) return 'Description minimum 20 characters ka ho';
      if (!price || Number(price) < 100) return 'Price minimum 100 rakhein';
    }
    if (step === 3) {
      if (imageCount < 1) return 'Kam az kam 1 image required hai';
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
    setMessage('Ad submit integration in progress, demo redirect ho raha hai');
    router.push('/listings/demo-1');
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
        </div>

        {step === 1 ? (
          <div>
            <h1 className="section-title">Category select</h1>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
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
            <div className="flex gap-2">
              <button type="button" onClick={() => setCondition('NEW')} className={`chip ${condition === 'NEW' ? 'active' : ''}`}>Naya</button>
              <button type="button" onClick={() => setCondition('USED')} className={`chip ${condition === 'USED' ? 'active' : ''}`}>Purana</button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <h1 className="section-title">Photos & Video</h1>
            <div className="mt-3 text-sm text-ink2">
              Max 6 images + 1 video (30 sec max). Cover image لازمی select karein.
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

            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {media.map((item) => (
                <div key={item.id} className={`surface relative overflow-hidden rounded-xl p-1 ${coverImageId === item.id ? '!border-red' : ''}`}>
                  <div className="aspect-square overflow-hidden rounded-lg bg-border">
                    {item.type === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <video src={item.url} className="h-full w-full object-cover" />
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
            <h1 className="section-title">Location</h1>
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
            <div className="rounded-[16px] border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
              ⚠️ Rule: Aap ek category mein max 3 active ads post kar sakte hain.
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
            <button type="button" onClick={submit} className="btn-red w-full max-w-[220px]">
              Ad Lagao ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
