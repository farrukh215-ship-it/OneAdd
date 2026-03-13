'use client';

import { useMemo, useState } from 'react';

export function ListingDescriptionClient({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const shouldCollapse = description.trim().length > 220;

  const preview = useMemo(() => {
    if (!shouldCollapse || expanded) return description;
    return `${description.trim().slice(0, 220).trimEnd()}...`;
  }, [description, expanded, shouldCollapse]);

  return (
    <div className="surface-premium mt-5 p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-ink3">
            Description
          </div>
          <div className="mt-1 text-lg font-extrabold text-ink">Product details</div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-ink2 md:text-[15px]">
        {preview}
      </p>

      {shouldCollapse ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-4 text-sm font-bold text-red"
        >
          {expanded ? 'Read less' : 'Read more'}
        </button>
      ) : null}
    </div>
  );
}
