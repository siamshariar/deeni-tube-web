// hooks/useSavedList.ts
// Shared logic for user lists of videos/shorts (Watch Later, Liked videos).
"use client";

import { useCallback, useMemo } from "react";
import { createLocalStore, useLocalStore } from "@/lib/local-store";
import { findShort, findVideo, youtubeIdFromThumbnail } from "@/lib/media-lookup";
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

/** Resolve an incoming item to one canonical id/type so the same video is never saved twice. */
export function normalizeSaved(video: SavedVideo): SavedVideo {
  const v = findVideo(video.id);
  // The catalogue's duration (the video's real length) wins over a copy saved with an older catalogue
  if (v) return { ...video, id: v.id, videoId: v.videoId, type: "video", duration: v.duration };
  const s = findShort(video.id);
  if (s) return { ...video, id: s.id, videoId: s.youtubeId, type: "short" };
  return {
    ...video,
    videoId: video.videoId ?? youtubeIdFromThumbnail(video.thumbnail),
    type: video.type ?? (/^sh?\d+$/.test(video.id) ? "short" : "video"),
  };
}

export function canonicalMediaId(id: string): string {
  return findVideo(id)?.id ?? findShort(id)?.id ?? id;
}

// Items saved before ids were normalised may use YouTube ids; clean them up on read and write (also removed shorts)
function normalizeAll(list: SavedVideo[]) {
  const seen = new Set<string>();
  return list.map(normalizeSaved).filter((v) => !removedShorts.has(v.videoId ?? "") && !seen.has(v.id) && !!seen.add(v.id));
}

/** A demo item for a main-feed video or short (by internal or YouTube id). */
export function demoSavedItem(id: string, addedAt: number): SavedVideo | undefined {
  const v = findVideo(id);
  if (v) {
    return {
      id: v.id,
      videoId: v.videoId,
      type: "video",
      title: v.title,
      channel: v.channel,
      channelAvatar: v.channelAvatar,
      thumbnail: `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
      views: v.views,
      timeAgo: v.timeAgo,
      duration: v.duration,
      addedAt,
    };
  }
  const s = findShort(id);
  if (s) {
    return {
      id: s.id,
      videoId: s.youtubeId,
      type: "short",
      title: s.title,
      channel: s.channel,
      channelAvatar: s.channelAvatar,
      thumbnail: `https://img.youtube.com/vi/${s.youtubeId}/hqdefault.jpg`,
      views: s.views,
      timeAgo: s.timeAgo,
      duration: "",
      addedAt,
    };
  }
  return undefined;
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
