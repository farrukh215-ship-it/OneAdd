'use client';

import type { Category } from '@tgmg/types';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export function CategoryTabs({
  categories,
  activeSlug,
  city,
}: {
  categories: Category[];
  activeSlug?: string;
  city?: string;
}) {
  const searchParams = useSearchParams();

  return (
    <section className="border-b border-border bg-white">
      <div className="page-wrap hide-scrollbar flex gap-4 overflow-x-auto px-3 py-3 md:px-5">
        {categories.map((category) => {
          const isAll = !category.slug;
          const active = isAll ? !activeSlug : activeSlug === category.slug;
          const params = new URLSearchParams(searchParams.toString());

          if (city) params.set('city', city);
          else params.delete('city');

          params.delete('category');
          const anchor = isAll ? 'today' : `category-${category.slug}`;
          const href = params.toString() ? `/?${params.toString()}#${anchor}` : `/#${anchor}`;

          return (
            <Link
              key={category.id}
              href={href}
              className={`flex shrink-0 flex-col items-center gap-1 border-b-[3px] px-1 pb-2 text-center ${
                active ? 'border-red text-red' : 'border-transparent text-ink2'
              }`}
            >
              <span className="text-xl">{category.icon}</span>
              <span className="text-[11px] font-semibold">{category.name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
