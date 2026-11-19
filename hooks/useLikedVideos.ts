// hooks/useLikedVideos.ts
"use client";

import { createSavedList, demoSavedItem, SavedVideo } from "@/hooks/useSavedList";
import { extendedPlaylists } from "@/lib/playlist-data";
import { shortsVideos } from "@/lib/shorts-data";

export type LikedVideo = SavedVideo;

// First-visit demo content: the static Liked Videos playlist plus a few shorts
function seed(): SavedVideo[] {
  const now = Date.now();
  const videoIds = extendedPlaylists.find((p) => p.id === "pl-liked-videos")?.videoIds ?? [];
  const ids = [...videoIds, ...shortsVideos.slice(2, 6).map((s) => s.id)];
  return ids
    .map((id, i) => demoSavedItem(id, now - i * 3_600_000))
    .filter((v): v is SavedVideo => v !== undefined);
}

const useLikedList = createSavedList("deeni-liked-videos", seed);

export function useLikedVideos() {
  const { items, add, remove, replace, has } = useLikedList();
  return {
    likedVideos: items,
    like: add,
    unlike: remove,
    setLikedVideos: replace,
    isLiked: has,
  };
}
