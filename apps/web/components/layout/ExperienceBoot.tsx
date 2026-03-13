'use client';

import { useEffect, useMemo, useState } from 'react';

const ONBOARDING_KEY = 'tgmg_onboarding_done';

const steps = [
  {
    title: 'Asli Malik, Koi Dealer Nahi',
    body: 'Original sellers, clean browsing, aur direct contact.',
  },
  {
    title: 'Photo Lo, Ad Lagao, Becho',
    body: '3 simple steps: photo, detail, publish.',
  },
  {
    title: 'Apne shehar ki listings dekhein',
    body: 'Location allow karke nearby aur city-specific listings paayen.',
  },
];

export function ExperienceBoot() {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.localStorage.getItem(ONBOARDING_KEY)) {
      setOpen(true);
    }
  }, []);

  const current = useMemo(() => steps[index], [index]);

  const close = () => {
    window.localStorage.setItem(ONBOARDING_KEY, '1');
    setOpen(false);
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      close();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.localStorage.setItem(
          'tgmg_geo',
          JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
        );
        close();
      },
      () => close(),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4">
      <div className="surface w-full max-w-md p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-light text-3xl text-red">
          {index === 2 ? '03' : index === 1 ? '02' : '01'}
        </div>
        <div className="text-2xl font-extrabold text-ink">{current.title}</div>
        <div className="mt-3 text-sm text-ink2">{current.body}</div>
        <div className="mt-5 flex items-center justify-center gap-2">
          {steps.map((_, stepIndex) => (
            <span
              key={stepIndex}
              className={`h-2.5 w-2.5 rounded-full ${stepIndex === index ? 'bg-red' : 'bg-border'}`}
            />
          ))}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {index < steps.length - 1 ? (
            <>
              <button type="button" className="btn-white" onClick={close}>
                Skip
              </button>
              <button type="button" className="btn-red" onClick={() => setIndex((currentIndex) => currentIndex + 1)}>
                Next
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn-white" onClick={close}>
                Baad Mein
              </button>
              <button type="button" className="btn-red" onClick={requestLocation}>
                Lahore Allow Karo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
