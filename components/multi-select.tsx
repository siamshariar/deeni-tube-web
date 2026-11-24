// components/multi-select.tsx
// Choosing several of a list (search's categories, scholars and channels): the chosen ones as tags, a list with a search
// box and ticks. `closeOnPick`: closes after each choice (the phone's search screen, so the next step is in reach).
"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { SearchField } from "@/components/search-field";
import { Tick } from "@/components/tick";
import { cn } from "@/lib/utils";

interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  closeOnPick?: boolean;
}

export function MultiSelect({ label, options, selected, onChange, closeOnPick = false }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const close = () => {
    setOpen(false);
    setText("");
  };

  useEffect(() => {
    if (!open) return;
    const onPress = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPress);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPress);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (option: string) => {
    onChange(selected.includes(option) ? selected.filter((s) => s !== option) : [...selected, option]);
    if (closeOnPick) close();
  };
  const query = text.trim().toLowerCase();
  const shown = query ? options.filter((o) => o.toLowerCase().includes(query)) : options;

  return (
    <div ref={ref} className="relative">
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div className={cn("relative flex min-h-11 items-center rounded-xl border bg-background pr-10 transition-colors", open && "border-foreground")}>
        {/* The whole field opens the list, behind the tags' own buttons */}
        <button type="button" aria-label={label} aria-expanded={open} onClick={() => (open ? close() : setOpen(true))} className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        <div className="pointer-events-none relative flex min-w-0 flex-1 flex-wrap gap-1.5 px-3 py-2">
          {selected.length === 0 ? (
            <span className="text-sm leading-5 text-muted-foreground">All {label.toLowerCase()}</span>
          ) : (
            selected.map((option) => (
              <span key={option} className="flex min-w-0 max-w-full items-center rounded-lg bg-muted pl-2 text-[13px] leading-5">
                <span className="truncate">{option}</span>
                <button
                  type="button"
                  aria-label={`Remove ${option}`}
                  onClick={() => onChange(selected.filter((s) => s !== option))}
                  className="pointer-events-auto flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors active:bg-accent can-hover:hover:bg-accent"
                >
                  <X className="h-4 w-4" />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown className={cn("pointer-events-none absolute right-3 h-5 w-5 text-muted-foreground transition-transform duration-200", open && "rotate-180")} aria-hidden="true" />
      </div>

      {open && (
        <div className="absolute z-[70] mt-1 w-full overflow-hidden rounded-xl border bg-popover shadow-lg">
          <div className="border-b p-2">
            <SearchField value={text} onChange={setText} label={`Search ${label.toLowerCase()}`} />
          </div>
          <div role="group" aria-label={label} className="yt-scrollbar max-h-60 overflow-y-auto overscroll-contain py-2">
            {shown.length === 0 ? (
              <p className="px-4 py-3 text-center text-sm text-muted-foreground">No results</p>
            ) : (
              shown.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="checkbox"
                  aria-checked={selected.includes(option)}
                  onClick={() => toggle(option)}
                  className="flex min-h-11 w-full items-center gap-4 px-4 py-2 text-left text-sm leading-5 transition-colors active:bg-accent can-hover:hover:bg-accent md:min-h-9"
                >
                  <Tick checked={selected.includes(option)} />
                  {option}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
