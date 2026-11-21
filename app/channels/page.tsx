// app/channels/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Search, X, Users, EyeOff, House, ChevronDown, Check } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { channelData, ChannelItem } from "@/lib/channel-data";
import { toast } from "sonner";
import { SortDropdown, SortOption } from "@/components/sort-dropdown";

import { useFeedPreferences } from "@/hooks/useFeedPreferences";

function ChannelSkeleton() {
  return (
    <div className="flex items-center gap-3 px-2 py-2.5">
      <Skeleton className="h-12 w-12 md:h-14 md:w-14 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-9 w-[104px] rounded-full" />
    </div>
  );
}

const sortOptions: SortOption[] = [
  { label: "Default", value: "default" },
  { label: "Name (A-Z)", value: "name-asc" },
  { label: "Name (Z-A)", value: "name-desc" },
];

const languageOptions = [
  { code: "bn", name: "Bangla" },
  { code: "en", name: "English" },
  { code: "ar", name: "Arabic" },
];

const CHIP = "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors";
const CHIP_ON = "bg-foreground text-background";
const CHIP_OFF = "bg-muted text-foreground can-hover:hover:bg-accent";

const FEED_CHOICES = [
  { on: true, label: "Show on Home", description: "Its videos appear in your Home feed", icon: House },
  { on: false, label: "Hide from Home", description: "Still here, on its page and in search", icon: EyeOff },
];

/**
 * A channel's place on the Home feed, in the style of YouTube's "Subscribed ▾" button: a grey pill that says
 * where the channel is ("On Home" or "Hidden") and opens a menu with the two choices, each explained.
 */
function HomeFeedButton({ name, onHome, onChange }: { name: string; onHome: boolean; onChange: (on: boolean) => void }) {
  const Icon = onHome ? House : EyeOff;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${name}: ${onHome ? "on your Home feed" : "hidden from your Home feed"}`}
          className={cn(
            "group inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-muted pl-2.5 pr-2 text-sm font-medium transition-colors min-[360px]:gap-1.5 min-[360px]:pl-3",
            "can-hover:hover:bg-accent data-[state=open]:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !onHome && "text-muted-foreground"
          )}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          {/* Very narrow phones (under 360px) show only the icon, so channel names keep their room */}
          <span className="hidden min-[360px]:inline">{onHome ? "On Home" : "Hidden"}</span>
          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(300px,calc(100vw-32px))] rounded-xl">
        {FEED_CHOICES.map((c) => {
          const selected = c.on === onHome;
          return (
            <DropdownMenuItem
              key={c.label}
              role="menuitemradio"
              aria-checked={selected}
              onSelect={() => !selected && onChange(c.on)}
              className="py-2.5"
            >
              <c.icon />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{c.label}</span>
                <span className="block text-xs text-muted-foreground">{c.description}</span>
              </span>
              <Check className={cn(!selected && "invisible")} />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Each channel has a Home feed button: hiding a channel removes its videos from the Home feed only (the channel
// stays here, in search and on its own page). Stored in 'feed-visible-channels' (hooks/useFeedPreferences),
// the same list the cards' "Don't recommend channel" changes.
export default function ChannelsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["bn", "en", "ar"]);
  const [sortValue, setSortValue] = useState("default");
  const { followedChannels, setChannelFeed } = useFeedPreferences();
  const [onlyHidden, setOnlyHidden] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const toggleLanguage = (code: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(code)
        ? prev.length > 1
          ? prev.filter((l) => l !== code)
          : prev
        : [...prev, code]
    );
  };

  const setOnHome = (channel: ChannelItem, on: boolean) => {
    setChannelFeed(channel.id, on);
    if (on) toast.success(`${channel.name} is back on your Home feed`);
    else
      toast(`${channel.name} hidden from your Home feed`, {
        action: { label: "Undo", onClick: () => setChannelFeed(channel.id, true) },
      });
  };
  const hiddenIds = channelData.filter((ch) => !followedChannels.includes(ch.id)).map((ch) => ch.id);
  // The Hidden filter ends by itself once nothing is hidden
  const showingHidden = onlyHidden && hiddenIds.length > 0;
  const showAll = () => {
    hiddenIds.forEach((id) => setChannelFeed(id, true));
    setOnlyHidden(false);
    toast.success("All channels are on your Home feed");
  };

  const sortChannels = (channels: ChannelItem[]) => {
    switch (sortValue) {
      case "name-asc":
        return [...channels].sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc":
        return [...channels].sort((a, b) => b.name.localeCompare(a.name));
      default:
        return channels;
    }
  };

  const filteredChannels = sortChannels(
    channelData
      .filter((ch) => (showingHidden ? !followedChannels.includes(ch.id) : selectedLanguages.includes(ch.language)))
      .filter((ch) => !searchQuery || ch.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatSubscribers = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M subscribers`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K subscribers`;
    return `${count} subscribers`;
  };

  const total = channelData.length;
  const onHomeCount = total - hiddenIds.length;

  return (
    <div className="min-h-screen bg-background">
      <div className="px-3 md:px-6 py-4 md:py-6 mt-14 md:mt-16">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Channels</h1>
            <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
              {hiddenIds.length === 0
                ? `All ${total} channels show on your Home feed`
                : `${onHomeCount} of ${total} channels show on your Home feed`}
              {hiddenIds.length > 0 && (
                <>
                  <span aria-hidden="true"> · </span>
                  <button
                    type="button"
                    onClick={showAll}
                    className="-mx-1 rounded px-1 font-medium text-foreground can-hover:hover:bg-accent"
                  >
                    Show all
                  </button>
                </>
              )}
            </p>
          </div>

          <div className="flex w-full items-center gap-2 lg:w-auto">
            <div className="relative min-w-0 flex-1 lg:w-72 lg:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search channels"
                aria-label="Search channels"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-10 pr-10 bg-muted/50 rounded-full text-sm outline-none focus:bg-muted transition-colors"
              />
              {searchQuery && (
                <button
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <SortDropdown options={sortOptions} currentValue={sortValue} onSelect={setSortValue} />
          </div>
        </div>

        {/* Language chips, and the hidden channels */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
          {languageOptions.map((lang) => {
            const on = !showingHidden && selectedLanguages.includes(lang.code);
            return (
              <button
                key={lang.code}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setOnlyHidden(false);
                  toggleLanguage(lang.code);
                }}
                className={cn(CHIP, on ? CHIP_ON : CHIP_OFF)}
              >
                {lang.name}
              </button>
            );
          })}
          {hiddenIds.length > 0 && (
            <>
              <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden="true" />
              <button
                type="button"
                aria-pressed={showingHidden}
                onClick={() => setOnlyHidden((v) => !v)}
                className={cn(CHIP, showingHidden ? CHIP_ON : CHIP_OFF)}
              >
                <EyeOff className="h-4 w-4" aria-hidden="true" /> Hidden {hiddenIds.length}
              </button>
            </>
          )}
        </div>

        {showingHidden && (
          <p className="mb-2 px-2 text-[13px] leading-5 text-muted-foreground md:text-sm">
            Videos from these channels don&apos;t show on your Home feed. You can still open them and find their
            videos in search.
          </p>
        )}

        {/* Channel list */}
        {isLoading ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <ChannelSkeleton key={i} />
            ))}
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">No channels found</h3>
            <p className="text-muted-foreground">Try different language or search keywords</p>
          </div>
        ) : (
          <ul>
            {filteredChannels.map((channel) => {
              const onHome = followedChannels.includes(channel.id);
              return (
                <li
                  key={channel.id}
                  className="flex items-center gap-2 rounded-xl px-2 py-2.5 transition-colors can-hover:hover:bg-muted/50 md:gap-4"
                >
                  <Link href={`/channels/${channel.slug}`} className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
                    <Avatar className={cn("h-12 w-12 flex-shrink-0 transition-opacity md:h-14 md:w-14", !onHome && "opacity-50")}>
                      <AvatarImage src={channel.avatar} alt="" />
                      <AvatarFallback>{channel.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <h3 className="truncate text-[15px] font-medium md:text-base">{channel.name}</h3>
                        {channel.verified && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4 text-muted-foreground flex-shrink-0"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-label="Verified"
                          >
                            <path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm5.707 7.293a1 1 0 010 1.414L10 17.414l-3.707-3.707a1 1 0 111.414-1.414L10 14.586l6.293-6.293a1 1 0 011.414 0Z" />
                          </svg>
                        )}
                      </div>
                      <p className="truncate text-[13px] text-muted-foreground md:text-sm">
                        {formatSubscribers(channel.subscribers)}
                      </p>
                    </div>
                  </Link>

                  <HomeFeedButton name={channel.name} onHome={onHome} onChange={(on) => setOnHome(channel, on)} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
