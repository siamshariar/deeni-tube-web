// hooks/useSavedList.ts
// Shared logic for user lists of videos/shorts (Watch Later, Liked videos).
"use client";

import { useCallback, useMemo } from "react";
import { createLocalStore, useLocalStore } from "@/lib/local-store";
import { canonicalMediaId, findPlayable, youtubeIdFromThumbnail, youtubeThumb } from "@/lib/media-lookup";
import { viewsText } from "@/lib/format";
import { removedShorts } from "@/lib/shorts-data";

export interface SavedVideo {
  id: string;
  title: string;
  channel: string;
  channelAvatar: string;
  thumbnail: string;
  views: string;
  timeAgo: string;
  duration: string;
  addedAt: number;
  /** YouTube id, used to build links and thumbnails */
  videoId?: string;
  type?: "video" | "short";
}

/** A video or short of the catalogue (by internal or YouTube id), as a saved item. */
export function savedItem(id: string, addedAt: number): SavedVideo | undefined {
  const media = findPlayable(id);
  return (
    media && {
      id: media.id,
      videoId: media.videoId,
      type: media.isShort ? "short" : "video",
      title: media.title,
      channel: media.channel,
      channelAvatar: media.channelAvatar,
      thumbnail: youtubeThumb(media.videoId),
      views: media.views,
      timeAgo: media.timeAgo,
      duration: media.duration,
      addedAt,
    }
  );
}

/** Resolve an incoming item to one canonical id/type, so the same video is never saved twice; the catalogue's details
 *  win over a copy saved with an older one. */
export function normalizeSaved(video: SavedVideo): SavedVideo {
  const videoId = video.videoId ?? youtubeIdFromThumbnail(video.thumbnail);
  // By YouTube id first: some lists once gave shorts ids of their own ("sh3"), which meant different shorts
  const known = (videoId && savedItem(videoId, video.addedAt)) || savedItem(video.id, video.addedAt);
  if (known) return known;
  return { ...video, videoId, views: viewsText(video.views), type: video.type ?? (/^sh?\d+$/.test(video.id) ? "short" : "video") };
}

// Items saved before ids were normalised may use YouTube ids; clean them up on read and write (also removed shorts)
function normalizeAll(list: SavedVideo[]) {
  const seen = new Set<string>();
  return list.map(normalizeSaved).filter((v) => !removedShorts.has(v.videoId ?? "") && !seen.has(v.id) && !!seen.add(v.id));
}

const EMPTY: SavedVideo[] = [];

export function createSavedList(key: string, seed: () => SavedVideo[]) {
  const store = createLocalStore<SavedVideo[]>(key, seed);

  return function useSavedList() {
    const raw = useLocalStore(store, EMPTY);
    const items = useMemo(() => normalizeAll(raw), [raw]);

    const add = useCallback((video: SavedVideo) => {
      // addedAt is always "now", whatever the caller passed
      const item = normalizeSaved({ ...video, addedAt: Date.now() });
      store.set((prev) => {
        const list = normalizeAll(prev);
        return list.some((v) => v.id === item.id) ? list : [item, ...list];
      });
    }, []);

    /** Remove a video; returns a function that puts it back where it was (Undo). */
    const remove = useCallback((videoId: string) => {
      const id = canonicalMediaId(videoId);
      const before = normalizeAll(store.get());
      const at = before.findIndex((v) => v.id === id);
      store.set((prev) => normalizeAll(prev).filter((v) => v.id !== id));
      return () => {
        if (at < 0) return;
        store.set((prev) => {
          const list = normalizeAll(prev);
          return list.some((v) => v.id === id) ? list : [...list.slice(0, at), before[at], ...list.slice(at)];
        });
      };
    }, []);

    /** Replace the whole list (used for manual reordering). */
    const replace = useCallback((next: SavedVideo[]) => {
      store.set(() => next);
    }, []);

    const has = useCallback(
      (videoId: string) => {
        const id = canonicalMediaId(videoId);
        return items.some((v) => v.id === id);
      },
      [items]
    );

    return { items, add, remove, replace, has };
  };
}
