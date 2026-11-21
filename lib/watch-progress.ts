// lib/watch-progress.ts
// How far each video has been watched, as on YouTube: the red bar under a thumbnail, and opening the video goes
// on from there. Saved per device in localStorage ('deeni-watch-progress': { [youtubeId]: { t, d, at } },
// seconds watched, the video's length, when). The watch pages' player and the cards' inline playback both save
// it. A video watched to (nearly) the end counts as watched: full bar, and it starts again from the beginning.

import { useSyncExternalStore } from "react";

const KEY = "deeni-watch-progress";
const MAX_ENTRIES = 300;
// Less than this (seconds) and the video starts from the beginning, as if not watched
const MIN_RESUME = 5;
// Saved at most this often while playing (and at once on pause, end and leaving)
const SAVE_EVERY_MS = 5000;

type Entry = { t: number; d: number; at: number };
type All = Record<string, Entry>;

let cache: All | null = null;
const listeners = new Set<() => void>();

function read(): All {
  if (cache) return cache;
  try {
    cache = (JSON.parse(localStorage.getItem(KEY) || "{}") as All) || {};
  } catch {
    cache = {};
  }
  return cache;
}

const emit = () => listeners.forEach((l) => l());
const onStorage = (e: StorageEvent) => {
  if (e.key !== KEY && e.key !== null) return;
  cache = null;
  emit();
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

/** Watched to the end, or close enough (the last 10 seconds, or the last 3% of a long video). */
const isDone = (t: number, d: number) => t >= d - Math.max(10, d * 0.03) || t >= d;

/** Save how far `videoId` (YouTube id) has been watched. */
export function saveWatchProgress(videoId: string, t: number, d: number) {
  if (!videoId || !(d > 0) || !(t >= 0)) return;
  const all = read();
  const time = isDone(t, d) ? d : Math.floor(t);
  const prev = all[videoId];
  if (prev && prev.t === time && prev.d === d) return;
  let next: All = { ...all, [videoId]: { t: time, d, at: Date.now() } };
  const ids = Object.keys(next);
  if (ids.length > MAX_ENTRIES) {
    ids.sort((a, b) => next[b].at - next[a].at);
    next = Object.fromEntries(ids.slice(0, MAX_ENTRIES).map((id) => [id, next[id]]));
  }
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  emit();
}

/** Where to start `videoId`: the time it was left at, or null (not watched, barely started, or finished). */
export function resumeTime(videoId: string): number | null {
  if (typeof window === "undefined") return null;
  const e = read()[videoId];
  if (!e || e.t < MIN_RESUME || isDone(e.t, e.d)) return null;
  return e.t;
}

/** How much of `videoId` has been watched, 0–1 (0 before hydration and for unwatched videos). */
export function useWatchedFraction(videoId: string): number {
  return useSyncExternalStore(
    subscribe,
    () => {
      const e = read()[videoId];
      return e && e.d > 0 ? Math.min(1, e.t / e.d) : 0;
    },
    () => 0
  );
}

/**
 * Saves a playing video's progress: call update() with each time report, flush() when it stops. Until the
 * player has reached `startAt` (the resume point it was asked to seek to), its reports are the time before the
 * seek and aren't saved, so they can't wipe the saved place.
 */
export function progressSaver(videoId: string, startAt: number | null = null) {
  let pending = startAt;
  const pendingUntil = Date.now() + 10_000;
  let lastSave = 0;
  let last: { t: number; d: number } | null = null;
  return {
    update(t: number, d: number, now = false) {
      if (!(d > 0)) return;
      if (pending !== null) {
        if (Math.abs(t - pending) > 3 && Date.now() < pendingUntil) return;
        pending = null;
      }
      last = { t, d };
      if (now || Date.now() - lastSave >= SAVE_EVERY_MS) {
        lastSave = Date.now();
        saveWatchProgress(videoId, t, d);
      }
    },
    flush() {
      if (last) saveWatchProgress(videoId, last.t, last.d);
    },
  };
}
