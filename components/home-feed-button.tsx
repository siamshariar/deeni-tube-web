// components/home-feed-button.tsx
// Whether a channel's videos show on the Home feed: one button, the same on Channels and on a channel's and a scholar's
// page, after YouTube's Subscribe button. "Add to Home" (filled) adds it with one press; then it's a grey "On Home ▾" with
// a menu that says what each choice does. Stored in 'feed-visible-channels' (hooks/useFeedPreferences), the same list the
// cards' "Don't recommend channel" changes. Hiding removes the videos from Home only, and the message has Undo.
"use client";

import { useRef } from "react";
import { Check, ChevronDown, EyeOff, House, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useFeedPreferences } from "@/hooks/useFeedPreferences";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

const CHOICES = [
  { on: true, label: "Show on Home", description: "Its videos appear in your Home feed", icon: House },
  { on: false, label: "Hide from Home", description: "Still here, on its page and in search", icon: EyeOff },
];

const PILL =
  "group inline-flex h-9 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&_svg]:flex-shrink-0";

interface HomeFeedButtonProps {
  channelId: string;
  name: string;
  align?: "start" | "center" | "end";
}

export function HomeFeedButton({ channelId, name, align = "end" }: HomeFeedButtonProps) {
  const { isFollowed, setChannelFeed } = useFeedPreferences();
  const onHome = isFollowed(channelId);
  // Each press puts another button in this one's place: the focus goes on to it
  const refocus = useRef(false);
  const ref = (el: HTMLButtonElement | null) => {
    if (!el || !refocus.current) return;
    refocus.current = false;
    el.focus({ preventScroll: true });
  };
  const set = (on: boolean) => {
    refocus.current = true;
    setChannelFeed(channelId, on);
    // Showing it again needs no message: the button says so
    if (!on) notify(`${name} hidden from your Home feed`, () => setChannelFeed(channelId, true));
  };

  if (!onHome)
    return (
      <button
        ref={ref}
        type="button"
        data-home-feed="off"
        aria-label={`${name}: Add to Home, hidden from your Home feed`}
        onClick={() => set(true)}
        className={cn(PILL, "bg-foreground pl-2.5 pr-3.5 text-background hover:bg-foreground/85 active:bg-foreground/75")}
      >
        <Plus className="h-5 w-5" aria-hidden="true" /> Add to Home
      </button>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          ref={ref}
          type="button"
          data-home-feed="on"
          aria-label={`${name}: On Home, shows on your Home feed`}
          className={cn(PILL, "bg-muted pl-3 pr-2 hover:bg-accent active:bg-accent data-[state=open]:bg-accent")}
        >
          <House className="h-[18px] w-[18px]" aria-hidden="true" /> On Home
          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-[min(300px,calc(100vw-32px))] rounded-xl">
        {CHOICES.map((c) => (
          <DropdownMenuItem key={c.label} role="menuitemradio" aria-checked={c.on} afterClose={c.on ? undefined : () => set(false)} className="py-2.5">
            <c.icon />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{c.label}</span>
              <span className="block text-xs text-muted-foreground">{c.description}</span>
            </span>
            <Check className={cn(!c.on && "invisible")} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
