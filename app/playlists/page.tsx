// app/playlists/page.tsx
"use client";

import { useState, useMemo } from "react";
import { ListVideo, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LIST_SEARCH, ListHeader } from "@/components/list-header";
import { CHIP_ROW, PAGE } from "@/components/page-layout";
import { PLAYLIST_GRID, PlaylistCard } from "@/components/playlist-card";
import { PlaylistDialog } from "@/components/playlist-menu";
import { SearchField } from "@/components/search-field";
import { SortDropdown } from "@/components/sort-dropdown";
import { Button } from "@/components/ui/button";
import { playlistAgeMs, usePlaylists } from "@/hooks/usePlaylists";
import { useHydrated } from "@/lib/local-store";
import { cn } from "@/lib/utils";
import { filterIn } from "@/lib/search-match";

const SORT_OPTIONS = [
  { label: "Recently updated", value: "recent" },
  { label: "Name (A-Z)", value: "name-asc" },
  { label: "Name (Z-A)", value: "name-desc" },
  { label: "Most videos", value: "videos" },
] as const;
type Sort = (typeof SORT_OPTIONS)[number]["value"];

export default function PlaylistsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [creating, setCreating] = useState(false);
  const hydrated = useHydrated();
  const { playlists } = usePlaylists();

  const shown = useMemo(() => {
    return filterIn(playlists, searchQuery, (pl) => [pl.name])
      .sort((a, b) =>
        sort === "recent" ? playlistAgeMs(a) - playlistAgeMs(b) : sort === "name-asc" ? a.name.localeCompare(b.name) : sort === "name-desc" ? b.name.localeCompare(a.name) : b.videoIds.length - a.videoIds.length
      );
  }, [playlists, searchQuery, sort]);

  const newPlaylist = (
    // Under 360px only its icon, so the search box keeps room for its text
    <Button className="h-10 flex-shrink-0 pl-3 pr-4 max-[359px]:w-10 max-[359px]:px-0 [&_svg]:size-5" onClick={() => setCreating(true)}>
      <Plus /> <span className="max-[359px]:sr-only">New playlist</span>
    </Button>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className={PAGE}>
        <ListHeader title="Playlists">
          <SearchField value={searchQuery} onChange={setSearchQuery} label="Search playlists" className={LIST_SEARCH} />
          {newPlaylist}
        </ListHeader>

        <div className={cn(CHIP_ROW, "mb-4")}>
          <SortDropdown variant="chip" options={SORT_OPTIONS} currentValue={sort} onSelect={setSort} />
        </div>

        <h2 className="sr-only">All playlists</h2>
        {!hydrated ? null : shown.length === 0 ? (
          searchQuery ? (
            <EmptyState icon={ListVideo} title="No playlists found" description="Try different keywords" />
          ) : (
            <EmptyState icon={ListVideo} title="No playlists yet" description="Create your first playlist to organise your lectures">
              {newPlaylist}
            </EmptyState>
          )
        ) : (
          <div className={PLAYLIST_GRID}>
            {shown.map((playlist, i) => (
              <PlaylistCard key={playlist.id} playlist={playlist} imagePriority={i === 0 ? "lcp" : undefined} />
            ))}
          </div>
        )}
      </div>

      {creating && <PlaylistDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
