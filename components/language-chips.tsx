// components/language-chips.tsx
// The language filter of list pages (Scholars, Channels, Categories): chips, at least one of them on. Every page starts
// with all of them on.
"use client";

import { useState, type ReactNode } from "react";
import { CHIP, CHIP_OFF, CHIP_ON, CHIP_ROW } from "@/components/page-layout";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "bn", name: "Bangla" },
  { code: "en", name: "English" },
  { code: "ar", name: "Arabic" },
  { code: "ur", name: "Urdu" },
];

/** The languages something is listed in, in the usual order. */
export function useLanguageFilter(available: string[]) {
  const languages = LANGUAGES.filter((l) => available.includes(l.code));
  const [selected, setSelected] = useState<string[]>(() => languages.map((l) => l.code));
  const toggle = (code: string) =>
    setSelected((prev) => (prev.includes(code) ? (prev.length > 1 ? prev.filter((l) => l !== code) : prev) : [...prev, code]));
  return { languages, selected, toggle };
}

interface LanguageChipsProps {
  filter: ReturnType<typeof useLanguageFilter>;
  /** None is on (another chip of the row is) */
  off?: boolean;
  onToggle?: () => void;
  /** More chips after them */
  children?: ReactNode;
  className?: string;
}

export function LanguageChips({ filter, off = false, onToggle, children, className }: LanguageChipsProps) {
  return (
    <div className={cn(CHIP_ROW, "mb-4", className)} role="group" aria-label="Languages">
      {filter.languages.map((l) => {
        const on = !off && filter.selected.includes(l.code);
        return (
          <button
            key={l.code}
            type="button"
            aria-pressed={on}
            onClick={() => {
              onToggle?.();
              filter.toggle(l.code);
            }}
            className={cn(CHIP, on ? CHIP_ON : CHIP_OFF)}
          >
            {l.name}
          </button>
        );
      })}
      {children}
    </div>
  );
}
