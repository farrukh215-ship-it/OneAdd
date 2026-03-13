'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, GalleryIcon } from './DetailIcons';
import { toDisplayMediaUrl } from '../../../lib/media';

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-[22px] border border-dashed border-border bg-[#F7F8FA] px-6 text-center text-ink2">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-ink shadow-sm">
        <GalleryIcon />
      </div>
      <div>
        <div className="text-sm font-semibold text-ink">Image preview unavailable</div>
        <div className="mt-1 text-xs text-ink2">{title}</div>
      </div>
    </div>
  );
}

type MediaItem = {
  id: string;
  rawUrl: string;
  proxyUrl: string;
  prefersRaw: boolean;
};

export function ListingMediaCarousel({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, true>>({});
  const [useRawSource, setUseRawSource] = useState<Record<string, true>>({});

  const mediaItems = useMemo<MediaItem[]>(
    () =>
      images
        .filter(Boolean)
        .map((rawUrl) => {
          const proxyUrl = toDisplayMediaUrl(rawUrl);
          return {
            id: rawUrl,
            rawUrl,
            proxyUrl,
            prefersRaw: /^https?:\/\//i.test(rawUrl),
          };
        }),
    [images],
  );

  const safeItems = useMemo(
    () => mediaItems.filter((item) => !failedImages[item.id]),
    [failedImages, mediaItems],
  );

  useEffect(() => {
    if (!safeItems.length) {
      setActiveIndex(0);
      return;
    }
    if (activeIndex > safeItems.length - 1) {
      setActiveIndex(0);
    }
  }, [activeIndex, safeItems.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!safeItems.length) return;
      if (event.key === 'ArrowLeft') {
        setActiveIndex((current) => (current === 0 ? safeItems.length - 1 : current - 1));
      }
      if (event.key === 'ArrowRight') {
        setActiveIndex((current) => (current === safeItems.length - 1 ? 0 : current + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [safeItems.length]);

  const goPrev = () =>
    setActiveIndex((current) => (current === 0 ? safeItems.length - 1 : current - 1));
  const goNext = () =>
    setActiveIndex((current) => (current === safeItems.length - 1 ? 0 : current + 1));

  const activeItem = safeItems[activeIndex];
  const activeImage = activeItem
    ? useRawSource[activeItem.id] || activeItem.prefersRaw
      ? activeItem.rawUrl
      : activeItem.proxyUrl
    : '';
  const showControls = safeItems.length > 1;

  const handleImageError = (item: MediaItem) => {
    if (!useRawSource[item.id] && !item.prefersRaw && item.rawUrl && item.rawUrl !== item.proxyUrl) {
      setUseRawSource((current) => ({ ...current, [item.id]: true }));
      return;
    }
    setFailedImages((current) => ({ ...current, [item.id]: true }));
  };

  return (
    <div className="surface-premium overflow-hidden p-3 md:p-4">
      <div
        className="relative aspect-[5/4] overflow-hidden rounded-[22px] border border-black/5 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(242,244,247,1)_72%)] md:aspect-[4/3] md:max-h-[560px]"
        onTouchStart={(event) => setTouchStart(event.changedTouches[0]?.clientX ?? null)}
        onTouchEnd={(event) => {
          const end = event.changedTouches[0]?.clientX;
          if (touchStart === null || typeof end !== 'number') return;
          const delta = touchStart - end;
          if (Math.abs(delta) < 40 || !showControls) return;
          if (delta > 0) goNext();
          else goPrev();
          setTouchStart(null);
        }}
      >
        {activeItem && activeImage ? (
          <img
            key={activeImage}
            src={activeImage}
            alt={title}
            className="h-full w-full object-contain p-4 md:p-6"
            loading="eager"
            onError={() => handleImageError(activeItem)}
          />
        ) : (
          <Placeholder title={title} />
        )}

        <div className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1 text-[11px] font-bold text-ink shadow-sm">
          Gallery
        </div>

        <div className="absolute right-3 top-3 rounded-full bg-[#111827]/88 px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
          {safeItems.length ? `${activeIndex + 1}/${safeItems.length}` : '0/0'}
        </div>

        {showControls ? (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/92 text-ink shadow-md transition hover:scale-105"
            >
              <ArrowLeftIcon />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next image"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/92 text-ink shadow-md transition hover:scale-105"
            >
              <ArrowRightIcon />
            </button>
          </>
        ) : null}
      </div>

      {safeItems.length > 1 ? (
        <div className="hide-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          {safeItems.map((item, index) => {
            const thumbSrc = useRawSource[item.id] || item.prefersRaw ? item.rawUrl : item.proxyUrl;
            return (
              <button
                key={`${item.id}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-[#F6F7F9] transition ${
                  index === activeIndex
                    ? 'border-red shadow-[0_0_0_3px_rgba(229,57,53,0.12)]'
                    : 'border-border hover:border-[#cfd4dc]'
                }`}
              >
                <img
                  src={thumbSrc}
                  alt={`${title} ${index + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={() => handleImageError(item)}
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
