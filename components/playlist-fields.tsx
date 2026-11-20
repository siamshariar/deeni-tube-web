// components/playlist-fields.tsx
// YouTube-style form fields, used by the Save dialog, the create/edit playlist dialogs and the You page:
// - PlaylistNameField: an outlined field with a small "Name" label and a character count
// - OptionSelect: an outlined field (small label, current choice, chevron) that opens a menu of choices, each
//   with an optional icon and second line and a check mark; PrivacySelect is OptionSelect for Private/Public
"use client";

import { useId } from "react";
import { Check, ChevronDown, Globe, Lock, type LucideIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const PLAYLIST_NAME_MAX = 150;

const FIELD =
  "rounded-lg border border-input bg-background px-3 py-1.5 transition-colors hover:border-foreground/40";

export function PlaylistNameField({
  value,
  onChange,
  onEnter,
  placeholder = "Enter playlist title",
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <div className={cn(FIELD, "focus-within:border-[#065fd4] focus-within:hover:border-[#065fd4] dark:focus-within:border-[#3ea6ff] dark:focus-within:hover:border-[#3ea6ff]")}>
        <label htmlFor={id} className="block text-xs text-muted-foreground">Name</label>
        <input
          id={id}
          value={value}
          maxLength={PLAYLIST_NAME_MAX}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && onEnter) { e.preventDefault(); onEnter(); } }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="block w-full bg-transparent text-sm font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground"
        />
      </div>
      <p className="mt-1 text-right text-xs text-muted-foreground">{value.length}/{PLAYLIST_NAME_MAX}</p>
    </div>
  );
}

export type SelectOption<T> = {
  value: T;
  label: string;
  /** Second line in the menu (e.g. an explanation, or a language's name in its own script) */
  description?: string;
  icon?: LucideIcon;
};

/**
 * YouTube-style select: an outlined field with a small label, the current choice (with its icon) and a
 * chevron, opening a menu where each choice can have an icon, a second line and a check mark.
 */
export function OptionSelect<T>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const current = options.find((o) => o.value === value) ?? options[0];
  const CurrentIcon = current?.icon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${current?.label ?? ""}`}
          className={cn(
            FIELD,
            "group flex w-full items-center gap-3 text-left focus-visible:outline-none",
            "focus-visible:border-[#065fd4] data-[state=open]:border-[#065fd4] dark:focus-visible:border-[#3ea6ff] dark:data-[state=open]:border-[#3ea6ff]",
            className
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted-foreground">{label}</span>
            <span className="flex items-center gap-2 text-sm font-medium">
              {CurrentIcon && <CurrentIcon className="h-4 w-4 flex-shrink-0" />}
              <span className="truncate">{current?.label}</span>
            </span>
          </span>
          <ChevronDown className="h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[min(360px,var(--radix-dropdown-menu-content-available-height))] w-[var(--radix-dropdown-menu-trigger-width)] min-w-[240px] overflow-y-auto yt-scrollbar">
        {options.map((o) => {
          const selected = o.value === value;
          const Icon = o.icon;
          return (
            <DropdownMenuItem
              key={String(o.value)}
              role="menuitemradio"
              aria-checked={selected}
              onSelect={() => onChange(o.value)}
              className={o.description ? "py-2.5" : undefined}
            >
              {Icon && <Icon />}
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{o.label}</span>
                {o.description && <span className="block text-xs text-muted-foreground">{o.description}</span>}
              </span>
              <Check className={cn("text-[#065fd4] dark:text-[#3ea6ff]", !selected && "invisible")} />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const PRIVACY_OPTIONS: SelectOption<boolean>[] = [
  { value: false, label: "Private", description: "Only you can view", icon: Lock },
  { value: true, label: "Public", description: "Anyone can search for and view", icon: Globe },
];

export function PrivacySelect({ isPublic, onChange, className }: { isPublic: boolean; onChange: (isPublic: boolean) => void; className?: string }) {
  return <OptionSelect label="Privacy" value={isPublic} options={PRIVACY_OPTIONS} onChange={onChange} className={className} />;
}
