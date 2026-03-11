'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useCategories } from '../../hooks/useCategories';

const cities = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad'];

export default function PostPage() {
  const router = useRouter();
  const { data: categories = [] } = useCategories();
  const [step, setStep] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'NEW' | 'USED'>('USED');
  const [images, setImages] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');

  useEffect(() => {
    if (!window.localStorage.getItem('tgmg_token')) {
      router.replace('/auth?next=/post');
    }
  }, [router]);

  const progress = useMemo(() => `${(step / 4) * 100}%`, [step]);

  const onImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, 8 - images.length);
    const previews = files.map((file) => URL.createObjectURL(file));
    setImages((current) => [...current, ...previews].slice(0, 8));
  };

  const submit = async () => {
    router.push('/listings/demo-1');
  };

  return (
    <div className="page-wrap px-2 py-4 md:px-5">
      <div className="surface mx-auto max-w-3xl p-4">
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
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="field-input"
                placeholder="Title"
              />
              <div className="mt-1 text-right text-xs text-ink3">{title.length}/100</div>
            </div>
            <div>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="field-textarea"
                placeholder="Description"
              />
              <div className="mt-1 text-right text-xs text-ink3">{description.length}/1000</div>
            </div>
            <div className="field-input flex items-center gap-2">
              <span className="font-bold text-red">PKR</span>
              <input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent outline-none"
                placeholder="Price"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCondition('NEW')} className={`chip ${condition === 'NEW' ? 'active' : ''}`}>Naya</button>
              <button type="button" onClick={() => setCondition('USED')} className={`chip ${condition === 'USED' ? 'active' : ''}`}>Purana</button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <h1 className="section-title">Photos</h1>
            <label className="surface mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[16px] border-dashed p-8 text-center text-sm text-ink2">
              <span className="text-3xl">📷</span>
              Drag & drop ya tap karke upload karo
              <input type="file" accept="image/*" multiple className="hidden" onChange={onImageChange} />
            </label>
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((image) => (
                <div key={image} className="surface relative aspect-square overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((current) => current.filter((item) => item !== image))}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <h1 className="section-title">Location</h1>
            <select value={city} onChange={(event) => setCity(event.target.value)} className="field-select">
              <option value="">City choose karo</option>
              {cities.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input value={area} onChange={(event) => setArea(event.target.value)} className="field-input" placeholder="Area (optional)" />
            <div className="rounded-[16px] border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
              ⚠️ Yaad rahe: Aap is category mein sirf ek ad post kar sakte hain.
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(1, current - 1))}
            className="btn-white"
          >
            Peeche
          </button>
          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((current) => Math.min(4, current + 1))}
              className="btn-red"
            >
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
