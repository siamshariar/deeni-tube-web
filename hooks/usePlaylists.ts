// hooks/usePlaylists.ts
"use client";

import { useCallback, useMemo } from "react";
import { createLocalStore, useLocalStore } from "@/lib/local-store";
import { canonicalMediaId, findPlayable } from "@/lib/media-lookup";
import { extendedPlaylists, PlaylistItem } from "@/lib/playlist-data";
import { useWatchLater } from "@/hooks/useWatchLater";
import { useLikedVideos } from "@/hooks/useLikedVideos";
import { savedItem, SavedVideo } from "@/hooks/useSavedList";

export type Playlist = PlaylistItem;

export const WATCH_LATER_PLAYLIST_ID = "pl-watch-later";
export const LIKED_PLAYLIST_ID = "pl-liked-videos";

const STORAGE_KEY = "deeni-playlists";
// Playlists created before the shared store existed
const LEGACY_KEY = "deeni-playlists-list";
const EMPTY: PlaylistItem[] = [];
const palette = ["#5A7A8C", "#8C6B5A", "#7A8C5A", "#6A5A8C", "#4A6A8C", "#8C4A6A", "#6A8C4A", "#5A8C7A"];

function readLegacy(): PlaylistItem[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p: Partial<PlaylistItem> & { id: string; name: string }, i: number) => ({
      id: p.id,
      slug: p.slug ?? slugify(p.name),
      name: p.name,
      videoIds: [...new Set((p.videoIds ?? []).map(canonicalMediaId))],
      updatedAt: p.updatedAt ?? "Just now",
      updatedAtMs: Date.now(),
      isPublic: p.isPublic ?? false,
      type: "playlist",
      thumbnailColor: p.thumbnailColor ?? palette[i % palette.length],
    }));
  } catch {
    return [];
  }
}

// First visit: the static demo playlists (Watch Later comes from its own store)
function seed(): PlaylistItem[] {
  const statics = extendedPlaylists
    .filter((p) => !isSystemPlaylist(p.id))
    .map((p) => ({ ...p, videoIds: p.videoIds.filter((id) => findPlayable(id)) }));
  return [...(typeof window === "undefined" ? [] : readLegacy()), ...statics];
}

const playlistStore = createLocalStore<PlaylistItem[]>(STORAGE_KEY, seed);

function slugify(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "playlist"
  );
}

const touch = (p: PlaylistItem, changes: Partial<PlaylistItem>): PlaylistItem => ({
  ...p,
  ...changes,
  updatedAt: "Just now",
  updatedAtMs: Date.now(),
});

const UNIT_SECONDS: Record<string, number> = {
  minute: 60,
  hour: 3_600,
  day: 86_400,
  week: 604_800,
  month: 2_592_000,
  year: 31_536_000,
};

/** Milliseconds since the playlist was last updated (for "Recently updated" sorting). */
export function playlistAgeMs(p: PlaylistItem): number {
  if (p.updatedAtMs) return Date.now() - p.updatedAtMs;
  const text = p.updatedAt.toLowerCase();
  if (text === "just now") return 0;
  if (text === "yesterday") return UNIT_SECONDS.day * 1000;
  const match = text.match(/(\d+)\s*(minute|hour|day|week|month|year)/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * UNIT_SECONDS[match[2]] * 1000;
}

export function isSystemPlaylist(id: string) {
  return id === WATCH_LATER_PLAYLIST_ID || id === LIKED_PLAYLIST_ID;
}

export function usePlaylists() {
  const stored = useLocalStore(playlistStore, EMPTY);
  const { videos: watchLater, addToWatchLater, removeFromWatchLater, setWatchLater } = useWatchLater();
  const { likedVideos, like, unlike, setLikedVideos } = useLikedVideos();

  // Watch Later and Liked videos appear as playlists but are backed by their own stores
  const playlists = useMemo<PlaylistItem[]>(() => {
    const fromList = (id: string, list: SavedVideo[]): PlaylistItem => {
      const base = extendedPlaylists.find((p) => p.id === id)!;
      const latest = list.reduce((max, v) => Math.max(max, v.addedAt), 0);
      return {
        ...base,
        videoIds: list.filter((v) => findPlayable(v.id)).map((v) => v.id),
        ...(latest ? { updatedAtMs: latest } : {}),
      };
    };
    return [
      fromList(WATCH_LATER_PLAYLIST_ID, watchLater),
      fromList(LIKED_PLAYLIST_ID, likedVideos),
      // Older stored copies of the system playlists are ignored
      ...stored
        .filter((p) => !isSystemPlaylist(p.id))
        // Only what can be played, so the count is what the playlist shows
        .map((p) => (p.videoIds.every((id) => findPlayable(id)) ? p : { ...p, videoIds: p.videoIds.filter((id) => findPlayable(id)) })),
    ];
  }, [stored, watchLater, likedVideos]);

  // The store behind a system playlist (Watch Later / Liked videos), or null for normal playlists
  const listFor = useCallback(
    (playlistId: string) =>
      playlistId === WATCH_LATER_PLAYLIST_ID
        ? { items: watchLater, add: addToWatchLater, remove: removeFromWatchLater, replace: setWatchLater }
        : playlistId === LIKED_PLAYLIST_ID
          ? { items: likedVideos, add: like, remove: unlike, replace: setLikedVideos }
          : null,
    [watchLater, addToWatchLater, removeFromWatchLater, setWatchLater, likedVideos, like, unlike, setLikedVideos]
  );

  const createPlaylist = useCallback((name: string, isPublic: boolean): string => {
    const id = Date.now().toString();
    playlistStore.set((prev) => [
      {
        id,
        slug: slugify(name),
        name: name.trim(),
        videoIds: [],
        updatedAt: "Just now",
        updatedAtMs: Date.now(),
        isPublic,
        type: "playlist",
        thumbnailColor: palette[prev.length % palette.length],
      },
      ...prev,
    ]);
    return id;
  }, []);

  const updatePlaylist = useCallback((playlistId: string, changes: { name?: string; isPublic?: boolean }) => {
    playlistStore.set((prev) =>
      prev.map((p) =>
        p.id === playlistId
          ? touch(p, { ...changes, ...(changes.name ? { name: changes.name.trim(), slug: slugify(changes.name) } : {}) })
          : p
      )
    );
  }, []);

  /** Delete a playlist; returns a function that puts it back where it was (Undo). */
  const deletePlaylist = useCallback((playlistId: string) => {
    const before = playlistStore.get();
    const at = before.findIndex((p) => p.id === playlistId);
    playlistStore.set((prev) => prev.filter((p) => p.id !== playlistId));
    return () => {
      if (at < 0) return;
      playlistStore.set((prev) => (prev.some((p) => p.id === playlistId) ? prev : [...prev.slice(0, at), before[at], ...prev.slice(at)]));
    };
  }, []);

  /** Returns false if the video was already in the playlist. */
  const addVideoToPlaylist = useCallback(
    (playlistId: string, video: { id: string }): boolean => {
      const id = canonicalMediaId(video.id);
      const list = listFor(playlistId);
      if (list) {
        const item = savedItem(id, Date.now());
        if (!item || list.items.some((w) => w.id === id)) return false;
        list.add(item);
        return true;
      }
      const target = playlistStore.get().find((p) => p.id === playlistId);
      if (!target || target.videoIds.includes(id)) return false;
      playlistStore.set((prev) =>
        prev.map((p) => (p.id === playlistId ? touch(p, { videoIds: [...p.videoIds, id] }) : p))
      );
      return true;
    },
    [listFor]
  );

  /** Remove a video; returns a function that puts it back where it was (Undo). */
  const removeVideoFromPlaylist = useCallback(
    (playlistId: string, videoId: string): (() => void) => {
      const id = canonicalMediaId(videoId);
      const list = listFor(playlistId);
      if (list) return list.remove(id);
      const at = playlistStore.get().find((p) => p.id === playlistId)?.videoIds.indexOf(id) ?? -1;
      playlistStore.set((prev) =>
        prev.map((p) => (p.id === playlistId ? touch(p, { videoIds: p.videoIds.filter((v) => v !== id) }) : p))
      );
      return () => {
        if (at < 0) return;
        playlistStore.set((prev) =>
          prev.map((p) =>
            p.id === playlistId && !p.videoIds.includes(id)
              ? touch(p, { videoIds: [...p.videoIds.slice(0, at), id, ...p.videoIds.slice(at)] })
              : p
          )
        );
      };
    },
    [listFor]
  );

  const reorderPlaylist = useCallback(
    (playlistId: string, videoIds: string[]) => {
      const list = listFor(playlistId);
      if (list) {
        const byId = new Map(list.items.map((v) => [v.id, v]));
        const ordered = videoIds.map((id) => byId.get(id)).filter((v): v is SavedVideo => v !== undefined);
        const rest = list.items.filter((v) => !videoIds.includes(v.id));
        return list.replace([...ordered, ...rest]);
      }
      playlistStore.set((prev) => prev.map((p) => (p.id === playlistId ? touch(p, { videoIds }) : p)));
    },
    [listFor]
  );

  const getPlaylist = useCallback((playlistId: string) => playlists.find((p) => p.id === playlistId), [playlists]);

  /** Whether a video is saved anywhere (Watch later or a playlist; Liked videos doesn't count). */
  const isSaved = useCallback(
    (videoId: string) => {
      const id = canonicalMediaId(videoId);
      return playlists.some((p) => p.id !== LIKED_PLAYLIST_ID && p.videoIds.includes(id));
    },
    [playlists]
  );

  return {
    playlists,
    isSaved,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    reorderPlaylist,
    getPlaylist,
  };
}
