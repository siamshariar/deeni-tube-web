// lib/player-host.ts
// One YouTube player for the whole app on iPhone, iPad and Safari, so a tap on a video starts it WITH SOUND.
//
// Why: Apple's WebKit only lets a video play with sound when it is started or unmuted inside the visitor's tap.
// Opening a video page makes a new player, which loads after the tap is over, so Safari plays it muted (or not
// at all) and the visitor had to tap again ("Tap to unmute"). What works (as in Quran Tube, tested on iPhones):
// keep ONE player alive that is already playing a muted placeholder video; in the tap itself, tell it
// loadVideoById → unMute → playVideo. That player is then allowed sound for good, and every later video
// (related videos, "Up next", the next playlist item) plays with sound too.
//
// How: the player's frame lives at the end of <body>, outside React (moving a frame in the page reloads it), and
// is never re-created. A watch page's player (components/youtube-player.tsx) attaches to it: the frame is
// placed exactly over the page's 16:9 box (page coordinates, so it scrolls with the page), under the page
// player's own controls. A tap on any link to a video (/videos/<title>/<id>, or an element with data-play-id)
// starts that video in the frame before the page changes. When no watch page uses it, the frame is hidden and
// goes back to the muted placeholder, ready for the next tap.
//
// Everywhere else (Chrome, Android, Firefox) a page's own player already gets sound after a click, so this is off.

const HOST_ORIGIN = "https://www.youtube-nocookie.com";
// Deeni Info Tech's "Scholars Recommendation" (2:53): never seen or heard, it only keeps the player playing
const PLACEHOLDER_ID = "p3Mrisem6ek";
const CROP = 120; // same crop as the watch player (cuts YouTube's title bar and "More videos" off)
const ENDED = 0;
const PLAYING = 1;

type Info = { videoData?: { video_id?: string }; playerState?: number; muted?: boolean; [key: string]: unknown };

let wanted: boolean | null = null;
let wrapper: HTMLDivElement | null = null;
let frame: HTMLIFrameElement | null = null;
let ready = false;
let info: Info = {};
// The video the player was last told to play (the placeholder while idle)
let requested: string | null = null;
// A tap started this video; its watch page is on the way
let pending: { videoId: string; at: number } | null = null;
let attached: { el: HTMLElement; token: number } | null = null;
let nextToken = 1;
let cropped = true;
let fullscreen = false;
let resetTimer: ReturnType<typeof setTimeout> | undefined;
// After a tap: YouTube can switch back to muted once the new video has loaded (seen in Quran Tube on iPhones);
// until then, say unMute again (allowed now: the tap gave this player sound)
let keepSoundUntil = 0;
let observer: ResizeObserver | null = null;

/** iPhone, iPad (also when it says it's a Mac) or Safari: the browsers that need the shared player. */
export function hostWanted(): boolean {
  if (wanted !== null) return wanted;
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const safari = /Safari\//.test(ua) && !/(Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg|OPR|SamsungBrowser|Android)\//.test(ua);
  wanted = iOS || safari;
  return wanted;
}

const post = (message: object) => frame?.contentWindow?.postMessage(JSON.stringify(message), HOST_ORIGIN);
export function hostCommand(func: string, args: unknown[] = []) {
  // Muted on purpose (the visitor, or sound was blocked): stop putting the sound back after a tap
  if (func === "mute") keepSoundUntil = 0;
  post({ event: "command", func, args });
}

/** The video the player is showing now, as YouTube reports it (null until it says). */
export function hostShowing(): string | null {
  return info.videoData?.video_id ?? null;
}
export const hostFrame = () => frame;
export const hostReady = () => ready;
export const hostRequested = () => requested;
export const hostMuted = () => info.muted === true;

/** Creates the player (once). `videoId`: what to load when there is no player yet (else the placeholder). */
export function armHost(videoId?: string) {
  if (frame || !hostWanted() || typeof document === "undefined") return;
  const placeholder = !videoId || videoId === PLACEHOLDER_ID;
  requested = placeholder ? PLACEHOLDER_ID : videoId!;
  wrapper = document.createElement("div");
  wrapper.setAttribute("data-player-host", "");
  wrapper.setAttribute("aria-hidden", "true");
  // Hidden until a watch page attaches it; black behind the video, under the page player's controls
  wrapper.style.cssText = "display:none;position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;background:#000;z-index:1;pointer-events:none;";
  frame = document.createElement("iframe");
  frame.title = "Video player";
  frame.tabIndex = -1;
  frame.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
  // The placeholder starts at once, muted (always allowed); a real video waits for the page's playVideo
  frame.src = `${HOST_ORIGIN}/embed/${requested}?autoplay=${placeholder ? 1 : 0}${placeholder ? "&mute=1" : ""}&controls=0&disablekb=1&fs=0&rel=0&iv_load_policy=3&playsinline=1&enablejsapi=1`;
  frame.style.cssText = "position:absolute;left:0;width:100%;border:0;pointer-events:none;";
  applyCrop();
  frame.addEventListener("load", handshake);
  wrapper.appendChild(frame);
  document.body.appendChild(wrapper);
  window.addEventListener("message", onMessage);
  handshake();
}

// YouTube only reports to the page after it says it's listening: repeat until it answers
let pinging = false;
function handshake() {
  if (pinging || ready) return;
  pinging = true;
  let tries = 0;
  const ping = () => {
    if (ready || !frame || tries++ >= 80) {
      pinging = false;
      return;
    }
    post({ event: "listening", id: "player-host" });
    setTimeout(ping, tries < 40 ? 250 : 1000);
  };
  ping();
}

function onMessage(e: MessageEvent) {
  if (e.origin !== HOST_ORIGIN || !frame || e.source !== frame.contentWindow) return;
  let d: { event?: string; info?: Info };
  try {
    d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
  } catch {
    return;
  }
  if ((d?.event === "onReady" || d?.event === "initialDelivery") && !ready) {
    ready = true;
    if (requested === PLACEHOLDER_ID) {
      hostCommand("mute");
      hostCommand("playVideo");
    }
  }
  if (d?.info) {
    info = { ...info, ...d.info };
    if (Date.now() < keepSoundUntil && requested !== PLACEHOLDER_ID) {
      if (info.muted === true && (info.playerState === PLAYING || info.playerState === 3)) hostCommand("unMute");
      else if (info.muted === false && hostShowing() === requested && info.playerState === PLAYING) keepSoundUntil = 0;
    }
    // Keep the placeholder playing while nothing else uses the player (YouTube's loop needs a playlist)
    if (d.info.playerState === ENDED && requested === PLACEHOLDER_ID && !attached) {
      hostCommand("seekTo", [0, true]);
      hostCommand("playVideo");
    }
  }
}

/**
 * Called inside a tap on a video link: starts that video with sound in the shared player, which the video
 * page then takes over. False if the player isn't ready yet (the page then starts the video itself, muted).
 */
export function playFromTap(videoId: string): boolean {
  if (!frame || !ready || !/^[\w-]{11}$/.test(videoId)) return false;
  clearTimeout(resetTimer);
  pending = { videoId, at: Date.now() };
  if (requested !== videoId) {
    requested = videoId;
    // Object form without startSeconds: with it, real iPhones kept playing the placeholder (Quran Tube)
    hostCommand("loadVideoById", [{ videoId }]);
  }
  hostCommand("unMute");
  hostCommand("playVideo");
  keepSoundUntil = Date.now() + 8000;
  return true;
}

/** A watch page player takes the shared player: it shows over `el` (the page player's box) until detached. */
export function attachHost(el: HTMLElement): number {
  clearTimeout(resetTimer);
  const token = nextToken++;
  attached = { el, token };
  pending = null;
  if (wrapper) wrapper.style.display = "block";
  observer?.disconnect();
  observer = new ResizeObserver(place);
  observer.observe(el);
  observer.observe(document.body);
  window.addEventListener("resize", place);
  place();
  return token;
}

/** The page player is gone. Unless a tap already started the next video, pause and go back to the placeholder. */
export function detachHost(token: number) {
  if (!attached || attached.token !== token) return;
  attached = null;
  observer?.disconnect();
  observer = null;
  window.removeEventListener("resize", place);
  if (wrapper) wrapper.style.display = "none";
  // A tap on another video started it already: its page attaches in a moment
  if (pending && Date.now() - pending.at < 10_000) return;
  pending = null;
  // Pause once this turn is over (a page player that re-attaches at once, e.g. remounting, keeps it playing);
  // the placeholder comes back a little later, in case the next page (Up next, a playlist's next video) attaches
  resetTimer = setTimeout(() => {
    if (attached || pending) return;
    hostCommand("pauseVideo");
    resetTimer = setTimeout(() => {
      if (attached || pending) return;
      requested = PLACEHOLDER_ID;
      hostCommand("loadVideoById", [{ videoId: PLACEHOLDER_ID }]);
      hostCommand("mute");
      hostCommand("playVideo");
    }, 1500);
  }, 0);
}

/** Load a video into the attached player (no tap: sound only if the player already had it). */
export function hostLoad(videoId: string) {
  if (requested === videoId) return;
  requested = videoId;
  hostCommand("loadVideoById", [{ videoId }]);
}

/** YouTube draws captions at its frame's bottom edge: uncrop while they're on (as the watch player does). */
export function setHostCropped(on: boolean) {
  cropped = on;
  applyCrop();
}
/** Fill the window (the page player's full screen). */
export function setHostFullscreen(on: boolean) {
  fullscreen = on;
  place();
}

function applyCrop() {
  if (!frame) return;
  frame.style.top = cropped ? `-${CROP}px` : "0";
  frame.style.height = cropped ? `calc(100% + ${CROP * 2}px)` : "100%";
}

// Over the page player's box, in page coordinates (so it scrolls with the page), with the box's rounding
function place() {
  if (!wrapper || !attached) return;
  const s = wrapper.style;
  if (fullscreen) {
    s.position = "fixed";
    s.left = s.top = "0";
    s.width = "100vw";
    s.height = "100dvh";
    s.borderRadius = "0";
    s.zIndex = "99";
    return;
  }
  const box = attached.el;
  const rect = box.getBoundingClientRect();
  s.position = "absolute";
  s.left = `${rect.left + window.scrollX}px`;
  s.top = `${rect.top + window.scrollY}px`;
  s.width = `${rect.width}px`;
  s.height = `${rect.height}px`;
  s.borderRadius = getComputedStyle(box.parentElement ?? box).borderRadius;
  s.zIndex = "1";
}

// ─── Taps on video links ──────────────────────────────────────────────────────

/** The YouTube id a link opens: /videos/<title>/<id>, or data-play-id on the link or a parent. */
export function videoIdForLink(el: Element | null): string | null {
  const tagged = el?.closest<HTMLElement>("[data-play-id]");
  if (tagged?.dataset.playId) return tagged.dataset.playId;
  const link = el?.closest<HTMLAnchorElement>("a[href]");
  if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return null;
  let url: URL;
  try {
    url = new URL(link.href, location.href);
  } catch {
    return null;
  }
  if (url.origin !== location.origin) return null;
  const m = url.pathname.match(/^\/videos\/[^/]+\/([\w-]{11})\/?$/);
  return m ? m[1] : null;
}

let booted = false;
/** Set up once in the app shell: create the player soon after the page loads, and start videos on taps. */
export function bootPlayerHost() {
  if (booted || !hostWanted()) return;
  booted = true;
  // A plain click (not a new tab), not stopped by the card (e.g. a touch-and-hold preview), on a video link
  window.addEventListener("click", (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const id = videoIdForLink(e.target as Element);
    if (id) playFromTap(id);
  });
  const arm = () => setTimeout(() => armHost(), 600);
  if (document.readyState === "complete") arm();
  else window.addEventListener("load", arm, { once: true });
  // A touch before then: start it now, there is usually time before the visitor picks a video
  window.addEventListener("touchstart", () => armHost(), { passive: true, once: true });
}
