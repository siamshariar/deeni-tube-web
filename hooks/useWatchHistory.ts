// hooks/useWatchHistory.ts
"use client";

import { useCallback, useMemo } from "react";
import { createLocalStore, useLocalStore } from "@/lib/local-store";
import { historySeed, HistoryItem } from "@/lib/history-data";
import { findShort, findVideo } from "@/lib/media-lookup";
import { historyEntryForShort, historyEntryForVideo } from "@/lib/history-entry";
import { removedShorts } from "@/lib/shorts-data";

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

const keyOf = (item: Pick<HistoryItem, "id" | "videoId">) => item.videoId || item.id;
const watchedAt = (item: HistoryItem) => new Date(item.watchedDate).getTime() || 0;

// The catalogue's details win over the copy saved with an entry (an older catalogue had made-up lengths and, for some
// shorts, titles of other videos)
function fresh(item: HistoryItem): HistoryItem {
  const id = keyOf(item);
  const video = findVideo(id);
  const short = video ? undefined : findShort(id);
  const entry = video ? historyEntryForVideo(video) : short && historyEntryForShort(short);
  return entry ? { ...item, ...entry, id: item.id } : item;
}

export function useWatchHistory() {
  const stored = useLocalStore(historyStore, EMPTY);
  const history = useMemo(
    () => {
      // Each video once, where it was watched last (an older list held some shorts several times)
      const seen = new Set<string>();
      return [...stored]
        .sort((a, b) => watchedAt(b) - watchedAt(a))
        .filter((item) => {
          const key = keyOf(item);
          return !removedShorts.has(key) && !seen.has(key) && !!seen.add(key);
        })
        .map(fresh);
    },
    [stored]
  );

  /** Remove an entry (by its id); returns a function that puts it back where it was (Undo). */
  const removeFromHistory = useCallback((id: string) => {
    const entry = historyStore.get().find((v) => v.id === id);
    const key = entry ? keyOf(entry) : id;
    const removed = historyStore.get().filter((v) => keyOf(v) === key);
    historyStore.set((prev) => prev.filter((v) => keyOf(v) !== key));
    return () =>
      historyStore.set((prev) =>
        prev.some((v) => keyOf(v) === key) ? prev : [...prev, ...removed].sort((a, b) => watchedAt(b) - watchedAt(a))
      );
  }, []);

  const replaceHistory = useCallback((next: HistoryItem[]) => {
    historyStore.set(() => next);
  }, []);

  return { history, removeFromHistory, replaceHistory };
}
