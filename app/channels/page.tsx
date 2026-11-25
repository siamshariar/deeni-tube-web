// app/channels/page.tsx
"use client";

import { useState } from "react";
import { EyeOff, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { HomeFeedButton } from "@/components/home-feed-button";
import { LanguageChips, useLanguageFilter } from "@/components/language-chips";
import { LIST_SEARCH, ListHeader } from "@/components/list-header";
import { CHIP, CHIP_OFF, CHIP_ON, PAGE } from "@/components/page-layout";
import { PERSON_LIST, PersonItem } from "@/components/person-item";
import { SearchField } from "@/components/search-field";
import { cn } from "@/lib/utils";
import { channelData, subscribersText } from "@/lib/channel-data";
import { SortDropdown } from "@/components/sort-dropdown";
import { useFeedPreferences } from "@/hooks/useFeedPreferences";
import { filterIn } from "@/lib/search-match";

const SORT_OPTIONS = [
  { label: "Default", value: "default" },
  { label: "Name (A-Z)", value: "name-asc" },
  { label: "Name (Z-A)", value: "name-desc" },
  { label: "Most subscribers", value: "subscribers" },
] as const;
type Sort = (typeof SORT_OPTIONS)[number]["value"];

const LANGUAGES = channelData.map((ch) => ch.language);

// Each channel has a Home feed button: hiding a channel removes its videos from the Home feed only (the channel
// stays here, in search and on its own page). Stored in 'feed-visible-channels' (hooks/useFeedPreferences),
// the same list the cards' "Don't recommend channel" changes.
export default function ChannelsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const languages = useLanguageFilter(LANGUAGES);
  const [sort, setSort] = useState<Sort>("default");
  const { followedChannels, setChannelFeed } = useFeedPreferences();
  const [onlyHidden, setOnlyHidden] = useState(false);

  const hiddenIds = channelData.filter((ch) => !followedChannels.includes(ch.id)).map((ch) => ch.id);
  // The Hidden filter ends by itself once nothing is hidden
  const showingHidden = onlyHidden && hiddenIds.length > 0;
  const showAll = () => {
    hiddenIds.forEach((id) => setChannelFeed(id, true));
    setOnlyHidden(false);
  };

  const channels = filterIn(channelData.filter((ch) => (showingHidden ? !followedChannels.includes(ch.id) : languages.selected.includes(ch.language))), searchQuery, (ch) => [ch.name])
    .sort((a, b) => (sort === "name-asc" ? a.name.localeCompare(b.name) : sort === "name-desc" ? b.name.localeCompare(a.name) : sort === "subscribers" ? b.subscribers - a.subscribers : 0));

  const total = channelData.length;
  const onHomeCount = total - hiddenIds.length;

  return (
    <div className="min-h-screen bg-background">
      <div className={PAGE}>
        <ListHeader
          title="Channels"
          subtitle={
            <p aria-live="polite">
              {hiddenIds.length === 0 ? `All ${total} channels show on your Home feed` : `${onHomeCount} of ${total} channels show on your Home feed`}
              {hiddenIds.length > 0 && (
                <>
                  <span aria-hidden="true"> • </span>
                  <button type="button" onClick={showAll} className="-mx-1 rounded px-1 font-medium text-foreground can-hover:hover:bg-accent">
                    Show all
                  </button>
                </>
              )}
            </p>
          }
        >
          <SearchField value={searchQuery} onChange={setSearchQuery} label="Search channels" className={LIST_SEARCH} />
          <SortDropdown options={SORT_OPTIONS} currentValue={sort} onSelect={setSort} />
        </ListHeader>

        {/* Language chips, and the hidden channels */}
        <LanguageChips filter={languages} off={showingHidden} onToggle={() => setOnlyHidden(false)}>
          {hiddenIds.length > 0 && (
            <>
              <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden="true" />
              <button type="button" aria-pressed={showingHidden} onClick={() => setOnlyHidden((v) => !v)} className={cn(CHIP, showingHidden ? CHIP_ON : CHIP_OFF)}>
                <EyeOff className="h-4 w-4" aria-hidden="true" /> Hidden {hiddenIds.length}
              </button>
            </>
          )}
        </LanguageChips>

        <h2 className="sr-only">All channels</h2>
        {showingHidden && (
          <p className="mb-2 px-2 text-[13px] leading-5 text-muted-foreground md:text-sm">
            Videos from these channels don&apos;t show on your Home feed. You can still open them and find their
            videos in search.
          </p>
        )}

        {/* Channel list */}
        {channels.length === 0 ? (
          <EmptyState icon={Users} title="No channels found" description="Try another language or different keywords" />
        ) : (
          <ul className={PERSON_LIST}>
            {channels.map((channel) => (
              <PersonItem
                key={channel.id}
                href={`/channels/${channel.slug}`}
                avatar={channel.avatar}
                name={channel.name}
                verified={channel.verified}
                details={subscribersText(channel.id)}
                dim={!followedChannels.includes(channel.id)}
              >
                <HomeFeedButton channelId={channel.id} name={channel.name} />
              </PersonItem>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
