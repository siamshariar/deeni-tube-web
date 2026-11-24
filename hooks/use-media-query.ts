"use client"

import { useCallback, useSyncExternalStore } from "react"

// One listener per query for the whole page, which tells everyone at once, so React draws the change in one go. With a
// listener of its own each, the dozens of menus on a page changed one after the other when a phone was turned sideways,
// each with its own update inside the one before it, until React stopped ("Maximum update depth exceeded") and the
// page broke.
const queries = new Map<string, { media: MediaQueryList; changed: Set<() => void> }>()

function shared(query: string) {
  let entry = queries.get(query)
  if (!entry) {
    const changed = new Set<() => void>()
    const media = window.matchMedia(query)
    media.addEventListener("change", () => changed.forEach((tell) => tell()))
    queries.set(query, (entry = { media, changed }))
  }
  return entry
}

/** True when the media query matches. Always false during SSR and hydration. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (tell: () => void) => {
      const { changed } = shared(query)
      changed.add(tell)
      return () => void changed.delete(tell)
    },
    [query]
  )
  return useSyncExternalStore(
    subscribe,
    () => shared(query).media.matches,
    () => false
  )
}
