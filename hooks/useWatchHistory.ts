// hooks/useWatchHistory.ts
"use client";

import { useCallback } from "react";
import { createLocalStore, useLocalStore } from "@/lib/local-store";
import { historySeed, HistoryItem } from "@/lib/history-data";

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

export function useWatchHistory() {
  const history = useLocalStore(historyStore, EMPTY);

  const removeFromHistory = useCallback((id: string) => {
    historyStore.set((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const replaceHistory = useCallback((next: HistoryItem[]) => {
    historyStore.set(() => next);
  }, []);

  return { history, removeFromHistory, replaceHistory };
}
