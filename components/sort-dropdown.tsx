// components/sort-dropdown.tsx
// The one sort button: beside a search box ("pill", as high as the box) or in a row of chips ("chip"). It says the order
// in use; its menu ticks it.
"use client";

import { Check, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CHIP, CHIP_OFF } from "@/components/page-layout";
import { cn } from "@/lib/utils";

export interface SortOption<T extends string = string> {
  label: string;
  value: T;
}

interface SortDropdownProps<T extends string> {
  options: readonly SortOption<T>[];
  currentValue: T;
  onSelect: (value: T) => void;
  variant?: "pill" | "chip";
}

export function SortDropdown<T extends string>({ options, currentValue, onSelect, variant = "pill" }: SortDropdownProps<T>) {
  const selected = options.find((o) => o.value === currentValue) ?? options[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Sort by: ${selected.label}`}
          className={cn(CHIP, CHIP_OFF, "data-[state=open]:bg-accent", variant === "pill" && "h-10 rounded-full pl-4 pr-3")}
        >
          {selected.label}
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={variant === "pill" ? "end" : "start"} className="w-60">
        {options.map((o) => (
          <DropdownMenuItem key={o.value} role="menuitemradio" aria-checked={o.value === selected.value} onSelect={() => onSelect(o.value)}>
            <span className="min-w-0 flex-1">{o.label}</span>
            <Check className={cn(o.value !== selected.value && "invisible")} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
