'use client';

import type { Category } from '@tgmg/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

function triggerHaptic() {
  if (typeof window === 'undefined') return;
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(12);
  }
}

export function CategoryTabs({
  categories,
  activeSlug,
  city,
}: {
  categories: Category[];
  activeSlug?: string;
  city?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState(activeSlug ?? '');

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('category-')) {
      setSelected(hash.replace('category-', ''));
      return;
    }
    if (hash === 'today') setSelected('');
  }, []);

  const scrollToAnchor = (anchor: string) => {
    const section = document.getElementById(anchor);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const onSelect = (category: Category) => {
    const nextSlug = category.slug || '';
    const isAll = !category.slug;
    const anchor = isAll ? 'today' : `category-${category.slug}`;
    setSelected(nextSlug);
    triggerHaptic();

    const params = new URLSearchParams(searchParams.toString());
    if (city) params.set('city', city);
    else params.delete('city');

    if (isAll) params.delete('category');
    else params.set('category', category.slug);

    if (pathname === '/') {
      const nextQuery = params.toString();
      const nextUrl = `${nextQuery ? `/?${nextQuery}` : '/'}#${anchor}`;
      window.history.replaceState({}, '', nextUrl);
      scrollToAnchor(anchor);
      return;
    }

    router.push(`/${params.toString() ? `?${params.toString()}` : ''}#${anchor}`);
  };

  return (
    <section className="border-b border-border bg-white">
      <div className="page-wrap hide-scrollbar flex gap-4 overflow-x-auto px-3 py-3 md:px-5">
        {categories.map((category) => {
          const isAll = !category.slug;
          const active = isAll ? !selected : selected === category.slug;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category)}
              className={`flex shrink-0 flex-col items-center gap-1 border-b-[3px] px-1 pb-2 text-center transition-all duration-200 ${
                active ? 'scale-[1.02] border-red text-red' : 'border-transparent text-ink2'
              }`}
            >
              <span className="text-xl">{category.icon}</span>
              <span className="text-[11px] font-semibold">{category.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

