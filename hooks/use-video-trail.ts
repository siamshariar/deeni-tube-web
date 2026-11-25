"use client"

import { useEffect, useState } from "react"

// The videos opened one after another in this visit (YouTube ids), for the player's Previous on phones, as on YouTube's
// mobile site: none on the first video, and going back takes the last one off
let trail: string[] = []

/** The video that was open before this one */
export function usePreviousVideo(videoId: string): string | null {
  const [previous, setPrevious] = useState<string | null>(null)
  useEffect(() => {
    const last = trail.length - 1
    if (trail[last] !== videoId) trail = trail[last - 1] === videoId ? trail.slice(0, last) : [...trail, videoId].slice(-50)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- what was opened before is outside React
    setPrevious(trail[trail.length - 2] ?? null)
  }, [videoId])
  return previous
}
