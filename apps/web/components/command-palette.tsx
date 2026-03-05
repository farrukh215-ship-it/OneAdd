"use client";

import { useRouter } from "next/navigation";
import { KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useState } from "react";
import { getSearchSuggestions } from "../lib/api";
import { SearchSuggestion } from "../lib/types";

type CommandPaletteProps = {
  triggerLabel?: string;
};

export function CommandPalette({ triggerLabel = "Search (Ctrl+K)" }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handle = window.setTimeout(() => {
      setLoading(true);
      getSearchSuggestions(query, 20)
        .then((next) => {
          setItems(next);
          setActiveIndex(0);
        })
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, 140);

    return () => window.clearTimeout(handle);
  }, [open, query]);

  const hasItems = items.length > 0;
  const activeItem = items[activeIndex] ?? null;

  function onOpenLink(item: SearchSuggestion) {
    setOpen(false);
    setQuery("");
    router.push(item.href);
  }

  function onPaletteKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (hasItems ? (prev + 1) % items.length : prev));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (hasItems ? (prev - 1 + items.length) % items.length : prev));
      return;
    }
    if (event.key === "Enter" && activeItem) {
      event.preventDefault();
      onOpenLink(activeItem);
    }
  }

  const groupedHint = useMemo(() => {
    if (query.trim().length === 0) {
      return "Pages, categories, listings, recent chats aur saved adds";
    }
    return "Enter dabayen ya click karke open karein";
  }, [query]);

  return (
    <>
      <button className="btn-ghost cmdTrigger" type="button" onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>

      {open ? (
        <div className="cmdBackdrop" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="cmdCard" onClick={(event) => event.stopPropagation()}>
            <div className="cmdInputWrap">
              <input
                autoFocus
                className="cmdInput"
                placeholder="Jump to pages, categories, chats..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onPaletteKeyDown}
              />
              <span className="cmdHint">{groupedHint}</span>
            </div>

            <div className="cmdList" role="listbox" aria-label="Suggestions">
              {loading ? <p className="cmdEmpty">Loading...</p> : null}
              {!loading && items.length === 0 ? (
                <p className="cmdEmpty">No results. Try another keyword.</p>
              ) : null}
              {!loading &&
                items.map((item, index) => (
                  <button
                    className={`cmdItem ${index === activeIndex ? "active" : ""}`}
                    key={`${item.type}-${item.id}-${index}`}
                    onClick={() => onOpenLink(item)}
                    type="button"
                  >
                    <span className="cmdItemType">{item.type}</span>
                    <span className="cmdItemLabel">{item.label}</span>
                    {item.meta ? <span className="cmdItemMeta">{item.meta}</span> : null}
                  </button>
                ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
