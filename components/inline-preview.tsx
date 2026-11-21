// components/inline-preview.tsx
// YouTube's inline playback for video cards: the video plays in the card's thumbnail, muted, with a volume
// button, the time left and a seekable progress bar. Opening the card then starts the video where it was (see
// takePreviewResume and the watch page's player). Settings → "Playback in feeds" turns it off (lib/feed-playback).
//
// - With a mouse (YouTube web): rest it on a thumbnail and the video starts (a quick pass over the grid loads
//   nothing, HOVER_DELAY_MS); leaving the thumbnail removes the player. The progress bar is a 5px line along the
//   bottom edge; hovering it lifts it 10px, pulls its ends 12px in, darkens the bottom and shows the red
//   playhead and the time under the pointer; click or drag to seek (measured on youtube.com).
// - On phones and tablets (YouTube's app and mobile site): once scrolling stops, the card nearest the middle of
//   the screen with its thumbnail almost fully on screen plays; it stops when it's half off screen. Touching and
//   holding a card (a long press) plays it too. The progress bar is a 3px line flush with the card's bottom
//   edge, with the red playhead on it; drag along it to seek (a tap there opens the video, like the rest of the
//   card). Thumbnails narrower than MIN_IN_VIEW_WIDTH (small search
//   rows) don't play on their own, nor does anything with the browser's data saver on. Nothing plays on its
//   own until the visitor scrolls or touches the page, or a moment after the page has loaded, so the player
//   never competes with the page's own loading.
// - While seeking, the time shows in a dark pill and the video follows the playhead (seekTo without loading
//   more, then a full seek on release, as YouTube's player does).
// - One player at a time on the page, and none while the tab is hidden.
// - It starts muted, which browsers always allow; the volume button (YouTube's plain white icon, with a dark
//   circle on hover) unmutes, and that choice is kept for the next previews in this tab, as on YouTube.
// - The same embed tricks as the watch page's player: the privacy-enhanced embed with YouTube's controls off
//   and the frame CROP px taller at the top and bottom, so YouTube's title bar and other overlays are cut off;
//   no pointer events on it (so YouTube's hover UI never shows and taps still open the card's link). YouTube
//   still draws its round play/pause control in the middle for the first few seconds (no parameter turns it
//   off); the video shows as soon as it plays, as on YouTube. The thumbnail stays until then: no black flash.
"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { feedPlaybackOn, subscribeFeedPlayback } from "@/lib/feed-playback";
import type { PreviewMode } from "@/components/inline-preview-player";

// The player itself is a separate chunk, fetched when a preview is about to start (on hover, or once touch
// playback is allowed), with a plain import() (no next/dynamic wrapper needed)
type Player = typeof import("@/components/inline-preview-player").default;
let PreviewLayer: Player | null = null;
let playerLoading: Promise<Player | null> | null = null;
function loadPlayer(): Promise<Player | null> {
  playerLoading ??= import("@/components/inline-preview-player").then(
    (m) => (PreviewLayer = m.default),
    () => {
      playerLoading = null; // offline: try again next time
      return null;
    }
  );
  return playerLoading;
}

const RESUME_KEY = "deeni-preview-resume";

// Mouse: a quick pass over a card doesn't start it
const HOVER_DELAY_MS = 300;
// Touch: a touch held this long (without scrolling) plays the card. A long press, as on phones: a slow tap
// (often 250-400ms) must still open the video on the first try
const HOLD_MS = 500;
// Touch: play once at least this much of the thumbnail is on screen (below the header, above the bottom
// nav), stop when less than STOP_RATIO is
const PLAY_RATIO = 0.75;
const STOP_RATIO = 0.5;
const VIEW_MARGIN = "-56px 0px -56px 0px";
const SCROLL_SETTLE_MS = 350;
const MIN_IN_VIEW_WIDTH = 240;
// Touch: another card takes over only when it's this much nearer the middle (no flipping on small scrolls)
const SWITCH_MARGIN = 48;
// Touch: with no scroll or touch, start this long after the page's load event. Any sooner and Lighthouse
// (mobile) still measures the player's code loading: TBT +70 ms at 2.5 s
const START_AFTER_LOAD_MS = 5000;

// ─── One player at a time ─────────────────────────────────────────────────────

interface Owner {
  el: HTMLElement;
  /** How much of the thumbnail is on screen (touch mode) */
  ratio: number;
  /** Played to the end (or failed) while on screen: don't start it again until it leaves the screen */
  done: boolean;
  start: () => void;
  stop: () => void;
}

let current: Owner | null = null;
function claim(owner: Owner) {
  const previous = current;
  current = owner;
  if (previous && previous !== owner) previous.stop();
}
function release(owner: Owner) {
  if (current === owner) current = null;
}

// ─── The page: every card, and the card in the middle of the screen (touch) ───
// A mounting card only joins a list, so hydrating a feed of cards costs next to nothing; the page's listeners
// are set up once, and on touch screens the cards are watched only once playing is allowed (unlock).

const cards = new Set<Owner>();
const inView = new Map<Element, Owner>();
let observer: IntersectionObserver | null = null;
let pageReady = false;
let unlocked = false;
// The card the visitor touched and held: it keeps playing until they scroll
let heldOwner: Owner | null = null;
let pickTimer: ReturnType<typeof setTimeout> | undefined;

function addCard(owner: Owner) {
  cards.add(owner);
  setUpPage();
  if (watching()) watch(owner);
}
function removeCard(owner: Owner) {
  cards.delete(owner);
  unwatch(owner);
  release(owner);
}

function setUpPage() {
  if (pageReady) return;
  pageReady = true;
  // The tab is hidden: stop; shown again: pick again
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) current?.stop();
    else schedulePick();
  });
  // The setting or the device (a laptop can switch between mouse and touch) changed
  subscribeFeedPlayback(refresh);
  getHoverQuery().addEventListener("change", refresh);
  // Scrolling (the page or any list) picks again once it stops; the first scroll or touch also allows playing
  window.addEventListener("scroll", () => { heldOwner = null; unlock(); schedulePick(); }, { passive: true, capture: true });
  window.addEventListener("touchstart", unlock, { passive: true, once: true });
  const later = () =>
    setTimeout(() => (typeof requestIdleCallback === "function" ? requestIdleCallback(unlock) : unlock()), START_AFTER_LOAD_MS);
  if (document.readyState === "complete") later();
  else window.addEventListener("load", later, { once: true });
}

/** Touch playback is on: cards are watched for being in the middle of the screen. */
function watching() {
  return unlocked && feedPlaybackOn() && getMode() === "touch" && !saveData();
}

function refresh() {
  if (!feedPlaybackOn()) current?.stop();
  const on = watching();
  cards.forEach((owner) => (on ? watch(owner) : unwatch(owner)));
  if (on) schedulePick();
}

function unlock() {
  if (unlocked) return;
  unlocked = true;
  if (getMode() === "touch" && feedPlaybackOn()) void loadPlayer();
  refresh();
}

function watch(owner: Owner) {
  if (inView.has(owner.el)) return;
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const card = inView.get(entry.target);
        if (!card) continue;
        card.ratio = entry.isIntersecting ? entry.intersectionRatio : 0;
        if (card.ratio < STOP_RATIO) {
          card.done = false;
          if (current === card) card.stop();
        }
      }
      schedulePick();
    },
    { rootMargin: VIEW_MARGIN, threshold: [0, 0.25, STOP_RATIO, PLAY_RATIO, 1] }
  );
  inView.set(owner.el, owner);
  observer.observe(owner.el);
}
function unwatch(owner: Owner) {
  if (!inView.delete(owner.el)) return;
  observer?.unobserve(owner.el);
  owner.ratio = 0;
  if (current === owner) owner.stop();
}

function schedulePick() {
  clearTimeout(pickTimer);
  pickTimer = setTimeout(pick, SCROLL_SETTLE_MS);
}

/** How far a thumbnail's centre is from the middle of the screen. */
function distanceFromMiddle(el: Element) {
  const rect = el.getBoundingClientRect();
  return Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2);
}

function pick() {
  if (document.hidden || inView.size === 0) return;
  // A hover preview (mouse) is left alone, and so is the card the visitor chose by holding it
  if (current && (!inView.has(current.el) || (current === heldOwner && current.ratio >= STOP_RATIO))) return;
  let best: Owner | null = null;
  let bestDistance = Infinity;
  inView.forEach((owner) => {
    if (owner.done || owner.ratio < PLAY_RATIO) return;
    if (owner.el.getBoundingClientRect().width < MIN_IN_VIEW_WIDTH) return;
    const distance = distanceFromMiddle(owner.el);
    if (distance < bestDistance) {
      best = owner;
      bestDistance = distance;
    }
  });
  const next = best as Owner | null;
  if (!next || next === current) return;
  // The playing card keeps playing while it's on screen, unless another is clearly nearer the middle
  if (current && current.ratio >= STOP_RATIO && distanceFromMiddle(current.el) - bestDistance < SWITCH_MARGIN) return;
  next.start();
}

/** Touch and hold: play this card, and keep it until the visitor scrolls. */
function holdToPlay(owner: Owner) {
  heldOwner = owner;
  owner.start();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Mode = PreviewMode;
// One media query for every card. Read in effects and event handlers only, so a card renders the same on the
// server and in the browser and hydrating the feed costs nothing extra
let hoverQuery: MediaQueryList | null = null;
const getHoverQuery = () => (hoverQuery ??= window.matchMedia("(hover: hover) and (pointer: fine)"));
const getMode = (): Mode => (getHoverQuery().matches ? "mouse" : "touch");

function saveData() {
  return !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
}

// Previews start muted until the visitor unmutes one (kept for this tab, as on YouTube)
let previewMuted = true;
const setPreviewMuted = (muted: boolean) => {
  previewMuted = muted;
};

/** The time a preview of this video reached, if the visitor clicked through from it just now (read once). */
export function takePreviewResume(videoId: string): number | null {
  try {
    const raw = sessionStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(RESUME_KEY);
    const saved = JSON.parse(raw) as { videoId: string; t: number; at: number };
    return saved.videoId === videoId && Date.now() - saved.at < 30_000 && saved.t > 1 ? saved.t : null;
  } catch {
    return null;
  }
}

// ─── The card wrapper ─────────────────────────────────────────────────────────

/**
 * Wraps a card's thumbnail link. `className` sizes the wrapper (it is the thumbnail's box; the link inside
 * should fill it); `rounded` is the thumbnail's corner rounding, which the playing video follows.
 */
export function InlinePreview({
  videoId,
  title,
  className,
  rounded = "rounded-xl",
  children,
}: {
  videoId: string;
  title: string;
  className?: string;
  rounded?: string;
  children: React.ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const ownerRef = useRef<Owner | null>(null);
  // Playing, and how it's controlled (mouse or touch); null shows the plain thumbnail
  const [playingMode, setPlayingMode] = useState<Mode | null>(null);
  const active = playingMode !== null;
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const holdRef = useRef<{ x: number; y: number } | null>(null);
  // A hold started this card: lifting the finger doesn't open the video
  const heldRef = useRef(false);
  const timeRef = useRef(0);

  useEffect(() => {
    const owner: Owner = {
      el: wrapperRef.current!,
      ratio: 0,
      done: false,
      start: () => {
        if (!feedPlaybackOn()) return;
        timeRef.current = 0;
        claim(owner);
        const mode = getMode();
        if (PreviewLayer) setPlayingMode(mode);
        // Still loading the player: show it once it's here, if this card is still the one to play
        else void loadPlayer().then(() => current === owner && setPlayingMode(mode));
      },
      stop: () => {
        clearTimeout(timerRef.current);
        release(owner);
        setPlayingMode(null);
      },
    };
    ownerRef.current = owner;
    addCard(owner);
    return () => {
      clearTimeout(timerRef.current);
      removeCard(owner);
      ownerRef.current = null;
    };
  }, []);

  const finished = () => {
    const owner = ownerRef.current;
    if (!owner) return;
    owner.done = true;
    owner.stop();
  };
  const cancelHold = () => {
    if (!holdRef.current) return;
    holdRef.current = null;
    clearTimeout(timerRef.current);
  };
  const touchPlayback = () => getMode() === "touch" && feedPlaybackOn();

  return (
    <div
      ref={wrapperRef}
      // No text selection or iOS link menu on a thumbnail held to play it
      data-inline-preview=""
      className={cn("relative select-none [-webkit-touch-callout:none]", className)}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse" || getMode() !== "mouse" || !feedPlaybackOn()) return;
        void loadPlayer();
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => ownerRef.current?.start(), HOVER_DELAY_MS);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse" && getMode() === "mouse") ownerRef.current?.stop();
      }}
      // Touch and hold (without scrolling): this card plays. A quick tap still opens the video
      onPointerDown={(e) => {
        heldRef.current = false;
        if (e.pointerType === "mouse" || active || !touchPlayback()) return;
        holdRef.current = { x: e.clientX, y: e.clientY };
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          holdRef.current = null;
          heldRef.current = true;
          if (ownerRef.current) holdToPlay(ownerRef.current);
        }, HOLD_MS);
      }}
      onPointerMove={(e) => {
        const hold = holdRef.current;
        if (hold && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > 10) cancelHold();
      }}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      // No "open link / save image" menu on a long press: holding plays the video, as in the YouTube app
      onContextMenu={(e) => {
        if (touchPlayback()) e.preventDefault();
      }}
      onClickCapture={(e) => {
        if (heldRef.current) {
          heldRef.current = false;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        // Opening the video while it plays: the video page starts where the preview was
        if (!active || !(e.target as Element).closest("a")) return;
        try {
          sessionStorage.setItem(RESUME_KEY, JSON.stringify({ videoId, t: Math.floor(timeRef.current), at: Date.now() }));
        } catch {}
      }}
    >
      {children}
      {playingMode && PreviewLayer && (
        <PreviewLayer
          videoId={videoId}
          title={title}
          rounded={rounded}
          mode={playingMode}
          startMuted={previewMuted}
          onMutedChange={setPreviewMuted}
          timeRef={timeRef}
          onDone={finished}
        />
      )}
    </div>
  );
}
