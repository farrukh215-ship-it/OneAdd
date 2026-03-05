"use client";

import { useRouter } from "next/navigation";
import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import { getSearchSuggestions } from "../lib/api";
import { SearchSuggestion } from "../lib/types";

type LiveSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  name?: string;
  icon?: string;
  inputClassName?: string;
  wrapperClassName?: string;
  menuClassName?: string;
  onSuggestionSelect?: (item: SearchSuggestion) => void;
};

export function LiveSearchInput({
  value,
  onChange,
  placeholder,
  name,
  icon,
  inputClassName = "input",
  wrapperClassName = "",
  menuClassName = "",
  onSuggestionSelect
}: LiveSearchInputProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const query = value.trim();
  const hasItems = items.length > 0;
  const activeItem = items[activeIndex] ?? null;
  const showMenu = open && (loading || hasItems || query.length >= 2);

  useEffect(() => {
    if (!open || query.length === 0) {
      setItems([]);
      setLoading(false);
      setActiveIndex(0);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      getSearchSuggestions(query, 12)
        .then((next) => {
          setItems(next);
          setActiveIndex(0);
        })
        .catch(() => {
          setItems([]);
          setActiveIndex(0);
        })
        .finally(() => setLoading(false));
    }, 160);

    return () => window.clearTimeout(timer);
  }, [open, query]);

  const normalizedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        meta: item.meta?.trim() || ""
      })),
    [items]
  );

  function openSuggestion(item: SearchSuggestion) {
    onSuggestionSelect?.(item);
    if (!onSuggestionSelect) {
      router.push(item.href);
    }
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showMenu || normalizedItems.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % normalizedItems.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + normalizedItems.length) % normalizedItems.length);
      return;
    }

    if (event.key === "Enter" && activeItem) {
      event.preventDefault();
      openSuggestion(activeItem);
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={`liveSuggestRoot ${wrapperClassName}`.trim()}>
      {icon ? (
        <span className="search-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <input
        className={inputClassName}
        name={name}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={onKeyDown}
        onChange={(event) => {
          onChange(event.target.value);
          if (!open) {
            setOpen(true);
          }
        }}
      />
      {showMenu ? (
        <div className={`liveSuggestMenu ${menuClassName}`.trim()} role="listbox">
          {loading ? <p className="liveSuggestEmpty">Searching...</p> : null}
          {!loading && normalizedItems.length === 0 ? (
            <p className="liveSuggestEmpty">No matches yet</p>
          ) : null}
          {!loading &&
            normalizedItems.map((item, index) => (
              <button
                key={`${item.type}-${item.id}-${index}`}
                type="button"
                className={`liveSuggestItem ${index === activeIndex ? "active" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => openSuggestion(item)}
              >
                <span className="liveSuggestLabel">{item.label}</span>
                <span className="liveSuggestMeta">
                  {item.meta ? item.meta : item.type}
                </span>
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}
