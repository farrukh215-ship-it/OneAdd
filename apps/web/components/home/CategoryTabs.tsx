'use client';

import type { Category } from '@tgmg/types';
import Link from 'next/link';

export function CategoryTabs({
  categories,
  activeSlug,
}: {
  categories: Category[];
  activeSlug?: string;
}) {
  return (
    <section className="border-b border-border bg-white">
      <div className="page-wrap hide-scrollbar flex gap-4 overflow-x-auto px-3 py-3 md:px-5">
        {categories.map((category) => {
          const active = activeSlug === category.slug;

          return (
            <Link
              key={category.id}
              href={active ? '/' : `/?category=${category.slug}#today`}
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
