// lib/local-store.ts
// A tiny localStorage-backed store shared by every component that reads it.
// Hooks built on this use `useSyncExternalStore`, so all instances see the same
// value and every write starts from the latest stored state (no stale copies).

import { useSyncExternalStore } from "react";

export interface LocalStore<T> {
  get: () => T;
  set: (updater: (prev: T) => T) => void;
  subscribe: (listener: () => void) => () => void;
}

const sameKind = (a: unknown, b: unknown) => typeof a === typeof b && (a === null) === (b === null) && Array.isArray(a) === Array.isArray(b);

export function createLocalStore<T>(key: string, getInitial: () => T): LocalStore<T> {
  const listeners = new Set<() => void>();
  let initial: T | undefined;
  let cachedRaw: string | null | undefined;
  let cachedValue: T | undefined;

  const fallback = () => (initial === undefined ? (initial = getInitial()) : initial);

  const get = (): T => {
    if (typeof window === "undefined") return fallback();
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch {}
    if (cachedValue !== undefined && raw === cachedRaw) return cachedValue;
    cachedRaw = raw;
    try {
      const value = raw === null ? fallback() : (JSON.parse(raw) as T);
      // Something else under this key (damaged, or an older version's) must not break every page that reads it
      cachedValue = !sameKind(value, fallback()) ? fallback() : Array.isArray(value) ? (value.filter((v) => v !== null) as T) : value;
    } catch {
      cachedValue = fallback();
    }
    return cachedValue as T;
  };

  const emit = () => listeners.forEach((l) => l());

  const set = (updater: (prev: T) => T) => {
    const next = updater(get());
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
    // Keep the in-memory value even if storage is unavailable (private mode etc.)
    cachedValue = next;
    try {
      cachedRaw = localStorage.getItem(key);
    } catch {
      cachedRaw = undefined;
    }
    emit();
  };

  const onStorage = (e: StorageEvent) => {
    if (e.key === key || e.key === null) emit();
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    if (listeners.size === 1) window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  };

  return { get, set, subscribe };
}

/** Read a store's value; renders `serverValue` during SSR and hydration. */
export function useLocalStore<T>(store: LocalStore<T>, serverValue: T): T {
  return useSyncExternalStore(store.subscribe, store.get, () => serverValue);
}

const noopSubscribe = () => () => {};

/** False during SSR/hydration, true once client-side stores can be read. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
