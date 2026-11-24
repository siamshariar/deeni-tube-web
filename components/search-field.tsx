// components/search-field.tsx
// The one search box of list pages (Scholars, Channels, Categories, a category, Playlists, History, a playlist): a grey
// 40px pill with a 20px icon and a button that clears it.
"use client";

import type { Ref } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Says what is searched; also the placeholder */
  label: string;
  className?: string;
  onEnter?: () => void;
  inputRef?: Ref<HTMLInputElement>;
}

export function SearchField({ value, onChange, label, className, onEnter, inputRef }: SearchFieldProps) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        ref={inputRef}
        type="text"
        inputMode="search"
        enterKeyHint="search"
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onEnter && ((e) => e.key === "Enter" && onEnter())}
        className="h-10 w-full text-ellipsis rounded-full border border-transparent bg-muted pl-10 pr-10 text-base outline-none md:text-sm transition-colors placeholder:text-muted-foreground focus:border-input focus:bg-background"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
