// hooks/useWatchLater.ts
"use client";

import { createSavedList, demoSavedItem, SavedVideo } from "@/hooks/useSavedList";
import { extendedPlaylists } from "@/lib/playlist-data";
import { shortsVideos } from "@/lib/shorts-data";

export type WatchLaterVideo = SavedVideo;

// First-visit demo content: the static Watch Later playlist plus a few shorts
function seed(): SavedVideo[] {
  const now = Date.now();
  const videoIds = extendedPlaylists.find((p) => p.id === "pl-watch-later")?.videoIds ?? [];
  const ids = [...videoIds, ...shortsVideos.slice(0, 4).map((s) => s.id)];
  return ids
    .map((id, i) => demoSavedItem(id, now - i * 60_000))
    .filter((v): v is SavedVideo => v !== undefined);
}

const useWatchLaterList = createSavedList("deeni-watch-later", seed);

export const useWatchLater = () => {
  const { items, add, remove, replace, has } = useWatchLaterList();
  return {
    videos: items,
    addToWatchLater: add,
    removeFromWatchLater: remove,
    setWatchLater: replace,
    isInWatchLater: has,
  };
};
