// hooks/useWatchHistory.ts
"use client";

import { useCallback, useMemo } from "react";
import { createLocalStore, useLocalStore } from "@/lib/local-store";
import { historySeed, HistoryItem } from "@/lib/history-data";
import { findVideo } from "@/lib/media-lookup";

export type { HistoryItem };

const EMPTY: HistoryItem[] = [];
const MAX_ITEMS = 200;
const historyStore = createLocalStore<HistoryItem[]>("deeni-watch-history", historySeed);

/** Add (or move to the top) a watched video/short. Entries are matched by YouTube id. */
export function recordWatch(item: Omit<HistoryItem, "watchedDate">) {
  historyStore.set((prev) =>
    [{ ...item, watchedDate: Date.now() }, ...prev.filter((v) => v.videoId !== item.videoId)].slice(0, MAX_ITEMS)
  );
}

// Real lengths: the catalogue's for videos, the seed's for shorts. History saved with an older catalogue kept
// copies of made-up durations that didn't match the video
let seedDurations: Map<string, string> | null = null;
function realDuration(item: HistoryItem): string {
  const id = item.videoId || item.id;
  const video = findVideo(id);
  if (video) return video.duration;
  seedDurations ??= new Map(historySeed().map((h) => [h.videoId || h.id, h.duration]));
  return seedDurations.get(id) ?? item.duration;
}

export function useWatchHistory() {
  const stored = useLocalStore(historyStore, EMPTY);
  const history = useMemo(
    () => stored.map((item) => {
      const duration = realDuration(item);
      return duration === item.duration ? item : { ...item, duration };
    }),
    [stored]
  );

  /** Remove an entry; returns a function that puts it back where it was (Undo). */
  const removeFromHistory = useCallback((id: string) => {
    const before = historyStore.get();
    const at = before.findIndex((v) => v.id === id);
    historyStore.set((prev) => prev.filter((v) => v.id !== id));
    return () => {
      if (at < 0) return;
      historyStore.set((prev) => (prev.some((v) => v.id === id) ? prev : [...prev.slice(0, at), before[at], ...prev.slice(at)]));
    };
  }, []);

  const replaceHistory = useCallback((next: HistoryItem[]) => {
    historyStore.set(() => next);
  }, []);

  return { history, removeFromHistory, replaceHistory };
}
