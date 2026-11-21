// app/channels/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Search, X, Users, EyeOff, House } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { channelData, ChannelItem } from "@/lib/channel-data";
import { toast } from "sonner";
import { SortDropdown, SortOption } from "@/components/sort-dropdown";

import { useFeedPreferences } from "@/hooks/useFeedPreferences";
function ChannelSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-12 w-12 md:h-14 md:w-14 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-9 w-20 md:w-24 rounded-full" />
    </div>
  );
}

const sortOptions: SortOption[] = [
  { label: "Default", value: "default" },
  { label: "Name (A-Z)", value: "name-asc" },
  { label: "Name (Z-A)", value: "name-desc" },
];

// YouTube-style blue for "on", in both themes (as on the Settings page)
const SWITCH_ON = "data-[state=checked]:bg-[#065fd4] dark:data-[state=checked]:bg-[#3ea6ff] [&>span]:bg-white";

// Each channel has a "Home feed" switch: off hides that channel's videos from the Home feed only (the channel
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

  const setOnHome = (channelId: string, on: boolean) => {
    setChannelFeed(channelId, on);
    const channel = channelData.find((ch) => ch.id === channelId);
    if (!channel) return;
    if (on) toast.success(`${channel.name} is back on your Home feed`);
    else
      toast(`${channel.name} hidden from your Home feed`, {
        description: "Its videos won't show on Home. The channel is still here and in search.",
        action: { label: "Undo", onClick: () => setChannelFeed(channelId, true) },
      });
  };
  const hiddenIds = channelData.filter((ch) => !followedChannels.includes(ch.id)).map((ch) => ch.id);
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
      .filter((ch) => (onlyHidden ? !followedChannels.includes(ch.id) : selectedLanguages.includes(ch.language)))
      .filter(
        (ch) =>
          !searchQuery || ch.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const formatSubscribers = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M subscribers`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K subscribers`;
    return `${count} subscribers`;
  };

  const languageOptions = [
    { code: "bn", name: "Bangla" },
    { code: "en", name: "English" },
    { code: "ar", name: "Arabic" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="px-3 md:px-6 py-4 md:py-6 mt-14 md:mt-16">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="md:block">
            <h1 className="text-2xl font-bold">Channels</h1>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search channels"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-muted/50 rounded-full text-sm outline-none focus:bg-muted transition-colors"
              />
              {searchQuery && (
                <button aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <SortDropdown
              options={sortOptions}
              currentValue={sortValue}
              onSelect={setSortValue}
            />
          </div>
        </div>

        {/* What the switches do */}
        <div className="mb-4 flex items-start gap-3 rounded-xl bg-muted/60 px-4 py-3">
          <House className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-5">Choose what&apos;s on your Home feed</p>
            <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">
              Turn a channel off to stop its videos showing on Home. You can still open the channel and find its
              videos in search, and turn it back on any time.
            </p>
            <p className="mt-1.5 text-[13px] font-medium leading-5" aria-live="polite">
              {channelData.length - hiddenIds.length} of {channelData.length} channels on your Home feed
              {hiddenIds.length > 0 && (
                <button type="button" onClick={showAll} className="ml-2 text-[#065fd4] dark:text-[#3ea6ff]">
                  Show all
                </button>
              )}
            </p>
          </div>
        </div>

        {/* Language chips, and the hidden channels */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
          {languageOptions.map((lang) => (
            <button
              key={lang.code}
              type="button"
              aria-pressed={!onlyHidden && selectedLanguages.includes(lang.code)}
              onClick={() => {
                setOnlyHidden(false);
                toggleLanguage(lang.code);
              }}
              className={cn(
                "h-8 px-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                !onlyHidden && selectedLanguages.includes(lang.code)
                  ? "bg-foreground text-background"
                  : "bg-muted hover:bg-accent text-foreground"
              )}
            >
              {lang.name}
            </button>
          ))}
          {hiddenIds.length > 0 && (
            <button
              type="button"
              aria-pressed={onlyHidden}
              onClick={() => setOnlyHidden((v) => !v)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors",
                onlyHidden ? "bg-foreground text-background" : "bg-muted hover:bg-accent text-foreground"
              )}
            >
              <EyeOff className="h-4 w-4" aria-hidden="true" /> Hidden {hiddenIds.length}
            </button>
          )}
        </div>

        {/* Channel list */}
        {isLoading ? (
          <div className="divide-y">
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
            <p className="text-muted-foreground">
              Try different language or search keywords
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredChannels.map((channel) => {
              const isVisible = followedChannels.includes(channel.id);
              return (
                <div
                  key={channel.id}
                  className="flex items-center gap-2 md:gap-3 px-2 py-3 hover:bg-muted/30 transition-colors group"
                >
                  <Link aria-label={channel.name}
                    href={`/channels/${channel.slug}`}
                    className="flex-shrink-0"
                  >
                    <Avatar className="h-12 w-12 md:h-14 md:w-14 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                      <AvatarImage src={channel.avatar} />
                      <AvatarFallback>
                        {channel.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link href={`/channels/${channel.slug}`}>
                      <div className="flex items-center gap-1">
                        <h3 className="font-medium text-[15px] md:text-base truncate">
                          {channel.name}
                        </h3>
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
                    </Link>
                    <p className="text-[13px] md:text-sm text-muted-foreground truncate">
                      {formatSubscribers(channel.subscribers)}
                      {!isVisible && (
                        <span className="text-foreground/80">
                          <span aria-hidden="true"> · </span>Hidden from Home
                        </span>
                      )}
                    </p>
                  </div>

                  {/* On the Home feed: a labelled switch (the label shows from sm up; phones read it aloud) */}
                  <label className="flex shrink-0 cursor-pointer items-center gap-2 pl-1">
                    <span className="hidden text-[13px] font-medium text-muted-foreground sm:inline">Home feed</span>
                    <Switch
                      checked={isVisible}
                      onCheckedChange={(on) => setOnHome(channel.id, on)}
                      aria-label={`Show ${channel.name} on your Home feed`}
                      className={SWITCH_ON}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}