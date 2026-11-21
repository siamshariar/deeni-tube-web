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
// player's own controls. The Shorts page attaches it to the short on screen ("short" fit: the 9:16 video
// covers the box) and loads each next short into it, so swiping keeps the sound, as in YouTube's own apps.
// A tap on any link to a video (/videos/<title>/<id>, /shorts, /shorts?v=<id>, or an element with
// data-play-id) starts that video in the frame before the page changes. When no page uses it, the frame is
// hidden and goes back to the muted placeholder, ready for the next tap.
//
// Everywhere else (Chrome, Android, Firefox) a page's own player already gets sound after a click, so this is off.

const HOST_ORIGIN = "https://www.youtube-nocookie.com";
// Deeni Info Tech's "Scholars Recommendation" (2:53): never seen or heard, it only keeps the player playing
const PLACEHOLDER_ID = "p3Mrisem6ek";
const CROP = 120; // same crop as the watch player (cuts YouTube's title bar and "More videos" off)
// /shorts opens on this short (the first one in app/shorts/page.tsx). If they ever differ, the Shorts page
// loads its own first short into the player, still with sound: the tap has already allowed it.
const FIRST_SHORT_ID = "MBxDbbkk0gQ";
const ENDED = 0;
const PLAYING = 1;

type Info = {
  videoData?: { video_id?: string };
  playerState?: number;
  muted?: boolean;
  currentTime?: number;
  duration?: number;
  [key: string]: unknown;
};

let wanted: boolean | null = null;
let wrapper: HTMLDivElement | null = null;
let frame: HTMLIFrameElement | null = null;
let ready = false;
let info: Info = {};
// The video the player was last told to play (the placeholder while idle), and the one its frame opened with
let requested: string | null = null;
let opened: string | null = null;
// A tap started this video; its watch page is on the way
let pending: { videoId: string; at: number } | null = null;
export type HostFit = "video" | "short";
let attached: { el: HTMLElement; token: number; fit: HostFit } | null = null;
let nextToken = 1;
let cropped = true;
let fullscreen = false;
let resetTimer: ReturnType<typeof setTimeout> | undefined;
// After a tap: YouTube can switch back to muted once the new video has loaded (seen in Quran Tube on iPhones);
// until then, say unMute again (allowed now: the tap gave this player sound)
let keepSoundUntil = 0;
// A tap (or click, or key press) has started or unmuted this player: Safari lets it play with sound from now on
let soundAllowed = false;
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
/** Whether the player may play with sound (a tap has started or unmuted it). Before that, play it muted. */
export const hostSoundAllowed = () => soundAllowed;
/** Call inside a tap, click or key press that unmutes or starts the player (Shorts: "Tap to unmute"). */
export function allowHostSound() {
  if (frame && ready) soundAllowed = true;
}
/** What YouTube last reported (state, time, length…), merged; check hostShowing() for which video it is. */
export const hostInfo = (): Readonly<Info> => info;

/** Creates the player (once). `videoId`: what to load when there is no player yet (else the placeholder). */
export function armHost(videoId?: string) {
  if (frame || !hostWanted() || typeof document === "undefined") return;
  const placeholder = !videoId || videoId === PLACEHOLDER_ID;
  requested = opened = placeholder ? PLACEHOLDER_ID : videoId!;
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
    // Asked for another video before the player could listen (a page attached early): load it now
    if (requested && requested !== opened) hostCommand("loadVideoById", [{ videoId: requested }]);
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
  soundAllowed = true;
  return true;
}

/**
 * A page player takes the shared player: it shows over `el` (the page player's box) until detached.
 * "video": a 16:9 watch player. "short": a short, whose 9:16 video covers the box (cropping the overflow).
 * Attaching again (the next short) just moves it.
 */
export function attachHost(el: HTMLElement, fit: HostFit = "video"): number {
  clearTimeout(resetTimer);
  const token = nextToken++;
  attached = { el, token, fit };
  pending = null;
  if (wrapper) wrapper.style.display = "block";
  observer?.disconnect();
  observer = new ResizeObserver(place);
  observer.observe(el);
  observer.observe(document.body);
  window.addEventListener("resize", place);
  // A short's box sits in a scrolling feed: follow it while the feed moves
  window.addEventListener("scroll", onScroll, { capture: true, passive: true });
  applyCrop();
  place();
  return token;
}

let scrollFrame = 0;
function onScroll() {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    if (attached?.fit === "short") place();
  });
}

/** Show or hide the attached player without letting it go (Shorts: until the next short plays). */
export function setHostVisible(on: boolean) {
  if (on) place();
  if (wrapper) wrapper.style.opacity = on ? "1" : "0";
}

/** The page player is gone. Unless a tap already started the next video, pause and go back to the placeholder. */
export function detachHost(token: number) {
  if (!attached || attached.token !== token) return;
  attached = null;
  observer?.disconnect();
  observer = null;
  window.removeEventListener("resize", place);
  window.removeEventListener("scroll", onScroll, { capture: true });
  if (wrapper) {
    wrapper.style.display = "none";
    wrapper.style.opacity = "1";
  }
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

/**
 * Load a video into the attached player (no tap: sound only if the player already had it).
 * `keepSound`: the visitor has the sound on; say unMute again if YouTube mutes the new video (as after a tap).
 */
export function hostLoad(videoId: string, keepSound = false) {
  if (requested === videoId) return;
  requested = videoId;
  hostCommand("loadVideoById", [{ videoId }]);
  if (keepSound && soundAllowed) keepSoundUntil = Date.now() + 8000;
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
  if (attached?.fit === "short") return place(); // sized in place()
  frame.style.left = "0";
  frame.style.width = "100%";
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
  if (attached.fit === "short") {
    // The Shorts feed is fixed to the screen: screen coordinates. The 9:16 video covers the box; YouTube's
    // bars live in the CROP bands above and below the video, outside the box (no bands while captions show,
    // which YouTube draws at its bottom edge)
    s.position = "fixed";
    s.left = `${rect.left}px`;
    s.top = `${rect.top}px`;
    s.width = `${rect.width}px`;
    s.height = `${rect.height}px`;
    s.borderRadius = getComputedStyle(box).borderRadius;
    s.zIndex = "1";
    if (frame) {
      const w = Math.max(rect.width, (rect.height * 9) / 16);
      const h = (w * 16) / 9;
      const band = cropped ? CROP : 0;
      frame.style.width = `${w}px`;
      frame.style.height = `${h + band * 2}px`;
      frame.style.left = `${(rect.width - w) / 2}px`;
      frame.style.top = `${(rect.height - h) / 2 - band}px`;
    }
    return;
  }
  s.position = "absolute";
  s.left = `${rect.left + window.scrollX}px`;
  s.top = `${rect.top + window.scrollY}px`;
  s.width = `${rect.width}px`;
  s.height = `${rect.height}px`;
  s.borderRadius = getComputedStyle(box.parentElement ?? box).borderRadius;
  s.zIndex = "1";
}

// ─── Taps on video links ──────────────────────────────────────────────────────

/**
 * The YouTube id a link opens: /videos/<title>/<id>, a short (/shorts?v=<id>, or /shorts: the first one), or
 * data-play-id on the link or a parent. Not Shorts links on the Shorts page, which switches shorts itself.
 */
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
  if (/^\/shorts\/?$/.test(url.pathname)) {
    if (/^\/shorts\/?$/.test(location.pathname)) return null;
    const v = url.searchParams.get("v");
    return v && /^[\w-]{11}$/.test(v) ? v : FIRST_SHORT_ID;
  }
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
