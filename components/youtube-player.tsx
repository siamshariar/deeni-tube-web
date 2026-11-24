// components/youtube-player.tsx
// The player on the watch pages (video, playlist): a YouTube embed with our own YouTube-style controls,
// driven through YouTube's postMessage API (enablejsapi=1). It fills its parent (`relative aspect-video`).
//
// Why our own controls: the embed shows YouTube's suggestions (the "More videos" pill, share button and
// title bar) whenever a video is paused, and its end screen suggests videos from other channels. So:
// - YouTube's controls are off (controls=0), and a transparent layer over the frame takes all clicks and
//   hovers, so YouTube's hover UI never appears;
// - the frame is made taller than the box (CROP at the top and bottom), so YouTube's overlays along its edges
//   (shown when paused and for a few seconds after playback starts) are cut off while the video itself still
//   fills the box exactly. Only while captions are on and the video plays is it the box's size, because
//   YouTube draws captions near the bottom edge of the frame;
// - it's the privacy-enhanced embed (youtube-nocookie.com), which leaves out creators' end-screen cards;
// - at the end, our own end screen covers YouTube's: "Up next" with an Autoplay countdown (YouTube's 8 seconds, 3 in
//   full screen), or Replay. The control bar stays, so Autoplay can be switched on there. Full screen is the page's
//   (this player fills it), so it goes on with the next video, whose page has its own player.
// Nothing stays stuck (watchPlayback, as on Shorts): until it plays it is asked again, its player is loaded again once,
// and then the page says it isn't playing; a video YouTube can't play says so and the next one follows.
// Also: the video's thumbnail shows until it plays (no black box), and if the browser blocks sound it plays
// muted with a "Click to unmute" button. Keyboard: space/k play, j/l ±10s, ←/→ ±5s, f full screen, m mute,
// c captions. On touch screens the controls hide 3s after the video starts or after a tap, as in YouTube's app.
// The controls are YouTube's updated ones (measured on youtube.com and m.youtube.com): each group on its own rounded
// dark backing, no gradient. With a mouse: play and next, volume (opens a slider), the time (a click shows the time
// left), and one group with Autoplay, captions, settings and full screen, each with its name and key on hover. On touch
// screens: play and next in the middle, the switches at the top right, the time and full screen above the bar.
// The progress bar is YouTube's (measured): a 4px line, 6px under the pointer, 56px above the bottom on desktop. Over
// it, a box with the video's frame there (YouTube's storyboard, components/storyboard.tsx) and the time; dragging
// also covers the video with that frame, dimmed. With a finger: the frame over the whole video and the time in the
// middle, with the other controls out of the way, as on YouTube's mobile site.
// How far the video has been watched is saved (lib/watch-progress: the red bar on its thumbnails), and the video
// goes on from there next time, as on YouTube (from History too); a finished video starts again.
//
// On iPhone, iPad and Safari the video plays in the app's one shared player (lib/player-host.ts) instead of a
// frame of its own: the tap that opened the page already started it there, with sound, which Safari only
// allows inside a tap. The shared player is placed over this box and these controls drive it.
"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Gauge, ListVideo, Minimize2, Pause, Play, RotateCcw, Settings, SkipForward } from "lucide-react";
import { CCIconOff, CCIconOn, FullscreenIcon, VolumeIcon } from "@/components/icons/player-icons";
import { youtubeThumb } from "@/lib/media-lookup";
import { imagePriorityProps } from "@/lib/image-priority";
import { cn } from "@/lib/utils";
import { takePreviewResume } from "@/components/inline-preview";
import { progressSaver, resumeTime } from "@/lib/watch-progress";
import { STORYBOARD_LARGE, STORYBOARD_MEDIUM, StoryboardFrame, useStoryboard } from "@/components/storyboard";
import {
  armHost,
  attachHost,
  detachHost,
  hostCommand,
  hostFrame,
  hostInfo,
  hostLoad,
  hostMuted,
  hostReady,
  hostRequested,
  hostShowing,
  hostWanted,
  playFromTap,
  revealHost,
  setHostCropped,
  setHostFullscreen,
} from "@/lib/player-host";

const noSubscribe = () => () => {};
// Controls hide this long after the last mouse move (desktop) or tap / start of playback (touch)
const HIDE_AFTER_MS = { mouse: 2500, touch: 3000 };

// YouTube's privacy-enhanced embed: same player and postMessage API, but it doesn't show creators' end-screen
// cards (video/playlist thumbnails over a video's last seconds), which the normal embed does
const YT_ORIGIN = "https://www.youtube-nocookie.com";
const UNSTARTED = -1;
const ENDED = 0;
const PLAYING = 1;
const PAUSED = 2;
const BUFFERING = 3;
const CUED = 5;
const CROP = 120; // px of the frame hidden above and below the box while not playing
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
// "Up next in N": YouTube's, at the end and in full screen (measured)
const COUNTDOWN_SECONDS = { window: 8, full: 3 };
// A video that doesn't play: seconds until the spinner, until its player is loaded again (once a minute), and from then until the
// page says so. Twice as long for a player that hasn't answered yet or is loading: on a slow network it may still work
const SPINNER_AFTER = 1;
const PLAY_TRIES = 5;
const RELOAD_AFTER = 10;
// A stream that broke off in the middle (YouTube gives up after about 20s of loading): asking again doesn't help
const RELOAD_BROKEN_AFTER = 5;
const RELOAD_EVERY_MS = 60_000;
// Stuck this long within its last seconds (often after a jump to the end): finished, so the next one can play
const NEAR_END = 10;
const STUCK_NEAR_END = 8;
const GIVE_UP_AFTER = 15;
const AUTOPLAY_KEY = "deeni-autoplay";
// Progress bar: the storyboard box is 240px wide (less on a small player), and a press that moves less than DRAG_PX is
// a click (seeks there), not a drag (shows the frames over the video)
const BOARD_WIDTH = { max: 240, min: 140, share: 0.42 };
const DRAG_PX = 3;
const BAR_EASE = "duration-200 ease-[cubic-bezier(0.05,0,0,1)]";

// For the next video's player, which takes them over: full screen goes on, and Autoplay brought it here. Autoplay skips
// videos YouTube can't play, at most SKIP_MAX in a row
let keepFull = false;
let autoMove = false;
let skipped = 0;
const SKIP_MAX = 3;
type FullscreenDocument = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
function leavePageFullscreen() {
  const doc = document as FullscreenDocument;
  if (doc.fullscreenElement) doc.exitFullscreen?.().catch(() => {});
  else if (doc.webkitFullscreenElement) doc.webkitExitFullscreen?.();
}

export type UpNextVideo = { title: string; channel: string; videoId: string; href?: string };

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export function YouTubePlayer({
  videoId,
  title,
  upNext,
  onNext,
  autoplay: controlledAutoplay,
  onAutoplayChange,
}: {
  videoId: string;
  title: string;
  /** The video that plays after this one */
  upNext?: UpNextVideo | null;
  /** Go to the next video (end of the countdown, the Next button, the "Up next" card) */
  onNext?: () => void;
  /** Autoplay set by the page (playlist: moves on at once at the end). Otherwise the player's own switch,
   *  saved per device, with a countdown at the end. */
  autoplay?: boolean;
  onAutoplayChange?: (on: boolean) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // iPhone/iPad/Safari: play in the shared player (decided after hydration; the server renders a frame)
  const hosted = useSyncExternalStore(noSubscribe, hostWanted, () => false);
  // Where to go on from once the video plays (shared player): the card preview's time, or where it was left
  const resumeRef = useRef<number | null>(null);
  // Saves how far it has been watched, once it has played
  const saverRef = useRef<ReturnType<typeof progressSaver> | null>(null);
  const playedRef = useRef(false);
  const readyRef = useRef(false);
  const lastStateRef = useRef<number | null>(null);
  const timeRef = useRef({ time: 0, duration: 0 });
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overControlsRef = useRef(false);
  const pointerTypeRef = useRef("mouse");
  const lastTapRef = useRef({ at: 0, side: 0 });

  const [playerState, setPlayerState] = useState(-1);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [rate, setRate] = useState(1);
  const [captions, setCaptions] = useState(false);
  const [mutedByBrowser, setMutedByBrowser] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [hover, setHover] = useState<{ time: number; x: number; width: number } | null>(null);
  // The bar is being dragged (not just pressed), and by a finger rather than the mouse
  const [dragging, setDragging] = useState(false);
  const [touchScrub, setTouchScrub] = useState(false);
  const barDownRef = useRef(0);
  // The frames for the progress bar: loaded once the controls are about to be used
  const [wantBoard, setWantBoard] = useState(false);
  const board = useStoryboard(videoId, wantBoard);
  const [controlsShown, setControlsShown] = useState(true);
  const [menu, setMenu] = useState<null | "main" | "speed">(null);
  // The time left instead of the time played (a click on the time)
  const [showTimeLeft, setShowTimeLeft] = useState(false);
  // The menu scrolls when the player is too short for it (phones)
  const [menuMax, setMenuMax] = useState(0);
  const [full, setFull] = useState(() => keepFull);
  const [byAutoplay] = useState(() => autoMove);
  // On the way to the next video (once: the countdown, a button and the card can't both go there)
  const movingRef = useRef(false);
  const [feedback, setFeedback] = useState<{ label: "play" | "pause" | "back" | "forward"; key: number } | null>(null);
  const [savedAutoplay, setSavedAutoplay] = useState(true);
  const [countdown, setCountdown] = useState<{ endsAt: number; seconds: number } | null>(null);
  const [now, setNow] = useState(0);
  // Until it plays: the watchdog (watchPlayback), its spinner, and what to say when it doesn't
  const watchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userPausedRef = useRef(false);
  const reloadedAtRef = useRef(0);
  const reloadAtRef = useRef<number | null>(null);
  const blockedRef = useRef(false);
  const [slow, setSlow] = useState(false);
  const [issue, setIssue] = useState<null | "stalled" | "unavailable">(null);
  const [frameLoads, setFrameLoads] = useState(0);

  const autoplayOn = controlledAutoplay ?? savedAutoplay;
  const isPlaying = playerState === PLAYING || playerState === BUFFERING;
  const cropped = !captions || !isPlaying;
  const controlsVisible = started && !issue && (!isPlaying || controlsShown || menu !== null || scrubTime !== null);
  const shownTime = scrubTime ?? time;
  const secondsLeft = countdown === null ? null : Math.min(countdown.seconds, Math.max(1, Math.ceil((countdown.endsAt - now) / 1000)));

  const mutedRef = useRef(false);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // Latest values for event handlers that outlive a render
  const latest = useRef({ upNext, onNext, autoplayOn, controlled: controlledAutoplay !== undefined, full });
  useEffect(() => {
    latest.current = { upNext, onNext, autoplayOn, controlled: controlledAutoplay !== undefined, full };
  });

  // The device's Autoplay choice (read after hydration so server and client render the same)
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage after hydration
      if (localStorage.getItem(AUTOPLAY_KEY) === "false") setSavedAutoplay(false);
    } catch {}
  }, []);

  const command = useCallback((func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), YT_ORIGIN);
  }, []);

  const startCountdown = useCallback(() => {
    const seconds = latest.current.full ? COUNTDOWN_SECONDS.full : COUNTDOWN_SECONDS.window;
    setNow(Date.now());
    setCountdown({ endsAt: Date.now() + seconds * 1000, seconds });
  }, []);
  // On to the next video; full screen goes on with it
  const moveOn = useCallback((auto = false) => {
    if (movingRef.current) return;
    movingRef.current = true;
    keepFull = latest.current.full;
    autoMove = auto;
    latest.current.onNext?.();
  }, []);

  // ── Controls: shown, then hidden after a moment while playing ──
  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!overControlsRef.current) setControlsShown(false);
    }, pointerTypeRef.current === "mouse" ? HIDE_AFTER_MS.mouse : HIDE_AFTER_MS.touch);
  }, []);
  const showControls = useCallback(() => {
    setControlsShown(true);
    scheduleHide();
  }, [scheduleHide]);

  // ── Talking to the player ──
  // YouTube only talks to the page after it says it's listening; repeat until the player answers. Started on
  // mount as well as on load: the server-rendered frame can finish loading before React is ready to see its
  // load event.
  const pingingRef = useRef(false);
  const startHandshake = useCallback(() => {
    if (pingingRef.current || readyRef.current) return;
    pingingRef.current = true;
    let tries = 0;
    const ping = () => {
      const iframe = iframeRef.current;
      if (!iframe?.isConnected || readyRef.current || tries++ >= 80) {
        pingingRef.current = false;
        return;
      }
      iframe.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: videoId }), YT_ORIGIN);
      setTimeout(ping, tries < 40 ? 250 : 1000);
    };
    ping();
  }, [videoId]);
  useEffect(() => {
    if (!hosted) startHandshake();
  }, [startHandshake, hosted, frameLoads]);

  const mutePlayer = useCallback(() => {
    // The browser doesn't allow its sound: muted, with "Tap to unmute". (Through the shared player's own code, so it
    // stops putting the sound back)
    if (hosted) hostCommand("mute");
    else command("mute");
    setMutedByBrowser(true);
    setMuted(true);
  }, [command, hosted]);

  // Load the video's player again: a stream that stalled usually plays in a new player. It goes on from where it was
  const reloadPlayer = useCallback(() => {
    reloadedAtRef.current = Date.now();
    const at = timeRef.current.time > 1 ? timeRef.current.time : null;
    lastStateRef.current = null;
    playedRef.current = false;
    setPlayerState(-1);
    setStarted(false);
    if (hosted) {
      resumeRef.current = at ?? resumeRef.current;
      hostLoad(videoId, true, true);
      command("playVideo");
    } else {
      reloadAtRef.current = at;
      readyRef.current = false;
      setFrameLoads((n) => n + 1);
    }
  }, [command, hosted, videoId]);

  const stopWatching = useCallback(() => {
    if (watchRef.current) clearTimeout(watchRef.current);
    watchRef.current = null;
    setSlow(false);
  }, []);

  // At the end: the end screen, and with Autoplay on to the next video
  const endedRef = useRef(false);
  useEffect(() => { endedRef.current = ended; }, [ended]);
  const finish = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    stopWatching();
    setEnded(true);
    // Watched to the end: a full bar, and next time it starts from the beginning
    saverRef.current?.update(timeRef.current.duration, timeRef.current.duration, true);
    const { upNext: next, onNext: goNext, autoplayOn: auto, controlled } = latest.current;
    if (!next || !goNext || !auto) return;
    if (controlled) moveOn(true); // playlist: straight on to the next video
    else startCountdown();
  }, [moveOn, startCountdown, stopWatching]);

  // Until it plays: a play command can get lost while the player loads or seeks (the next video then just sat there),
  // Safari can leave it paused when it doesn't allow its sound, and a stream can stall
  const watchPlayback = useCallback(() => {
    if (watchRef.current) clearTimeout(watchRef.current);
    let seconds = 0;
    let tries = 0;
    let stuck = 0;
    const check = () => {
      watchRef.current = null;
      const state = lastStateRef.current;
      const { time: at, duration: length } = timeRef.current;
      // Playing, at its end, or paused after it had played (by the visitor, the phone, another app…): nothing to repair
      if (userPausedRef.current || state === PLAYING || state === ENDED || (state === PAUSED && playedRef.current)) return setSlow(false);
      if (playedRef.current && length > 0 && length - at <= NEAR_END && ++stuck >= STUCK_NEAR_END) return finish();
      if (readyRef.current && state !== BUFFERING && tries < PLAY_TRIES) {
        tries++;
        // Paused, and nobody paused it
        if (state === PAUSED && tries >= 2) mutePlayer();
        command("playVideo");
      }
      // In the background the page waits; a stream that was playing may take its time to go on
      if (!document.hidden && !(state === BUFFERING && playedRef.current)) {
        seconds++;
        if (seconds >= SPINNER_AFTER) setSlow(true);
        // Even muted it has to wait for a tap (a phone saving power): show the play button
        if (seconds > PLAY_TRIES && (state === PAUSED || blockedRef.current)) {
          setStarted(true);
          return setSlow(false);
        }
        const reloaded = Date.now() - reloadedAtRef.current < RELOAD_EVERY_MS;
        const wait = reloaded ? GIVE_UP_AFTER : playedRef.current ? RELOAD_BROKEN_AFTER : RELOAD_AFTER;
        if (seconds >= wait * (readyRef.current && state !== BUFFERING ? 1 : 2)) {
          if (reloaded) {
            setSlow(false);
            setIssue("stalled");
            return;
          }
          reloadPlayer();
          seconds = tries = 0;
        }
      }
      watchRef.current = setTimeout(check, 1000);
    };
    watchRef.current = setTimeout(check, 1000);
  }, [command, mutePlayer, reloadPlayer, finish]);
  useEffect(() => {
    watchPlayback();
    return () => {
      if (watchRef.current) clearTimeout(watchRef.current);
    };
  }, [watchPlayback]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== YT_ORIGIN || !iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      let d;
      try {
        d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      // YouTube can't play it (removed, private, not allowed outside YouTube…): say so, and go on to the next
      if (d?.event === "onError") {
        if (hosted && hostRequested() !== videoId) return;
        stopWatching();
        setIssue("unavailable");
        const { upNext: next, onNext: goNext, autoplayOn: auto } = latest.current;
        if (next && goNext && auto && byAutoplay && skipped < SKIP_MAX) {
          skipped++;
          startCountdown();
        }
        return;
      }
      // The shared player can still be reporting the video it played before this one: not ours
      const reported = d?.info?.videoData?.video_id ?? (hosted ? hostShowing() : null);
      if (hosted && reported && reported !== videoId) return;
      if ((d?.event === "onReady" || d?.event === "initialDelivery") && !readyRef.current) {
        readyRef.current = true;
        // The shared player came up with its placeholder: switch it to this video
        if (hosted && hostRequested() !== videoId) hostLoad(videoId);
        // Be told when the browser blocks playback, then start (autoplay=0 in the URL, so nothing is missed)
        command("addEventListener", ["onAutoplayBlocked"]);
        // Go on from where the card's preview was, or from where it was left last time, as on YouTube
        // (or, loaded again after it got stuck, from there)
        const resumeAt = reloadAtRef.current ?? takePreviewResume(videoId) ?? resumeTime(videoId);
        reloadAtRef.current = null;
        saverRef.current = progressSaver(videoId, resumeAt);
        if (resumeAt) command("seekTo", [resumeAt, true]);
        command("playVideo");
        return;
      }
      if (d?.event === "onAutoplayBlocked") {
        // No sound allowed yet: play muted rather than sit still. (Blocked muted too: it waits for a tap, see watchPlayback)
        if (mutedRef.current) blockedRef.current = true;
        mutePlayer();
        command("playVideo");
        return;
      }
      const info = d?.info;
      if (!info) return;
      if (typeof info.currentTime === "number") {
        timeRef.current.time = info.currentTime;
        setTime(info.currentTime);
      }
      if (typeof info.duration === "number" && info.duration > 0) {
        timeRef.current.duration = info.duration;
        setDuration(info.duration);
      }
      if (playedRef.current && typeof info.currentTime === "number") saverRef.current?.update(info.currentTime, timeRef.current.duration);
      if (typeof info.videoLoadedFraction === "number") setLoaded(info.videoLoadedFraction);
      if (typeof info.muted === "boolean") {
        setMuted(info.muted);
        if (!info.muted) setMutedByBrowser(false);
      }
      if (typeof info.volume === "number") setVolume(info.volume);
      if (typeof info.playbackRate === "number") setRate(info.playbackRate);
      const state = info.playerState;
      // Act on changes only: YouTube can report the same state more than once
      if (typeof state !== "number" || state === lastStateRef.current) return;
      const wasEnded = lastStateRef.current === ENDED;
      const hadPlayed = playedRef.current;
      lastStateRef.current = state;
      setPlayerState(state);
      // It stopped to load, or YouTube gave up in the middle (a stream that broke off): watch that it goes on
      if (hadPlayed && !wasEnded && !watchRef.current && !userPausedRef.current && (state === BUFFERING || state === UNSTARTED || state === CUED)) watchPlayback();
      if (state === PAUSED) saverRef.current?.update(timeRef.current.time, timeRef.current.duration, true);
      if (state === PLAYING) {
        playedRef.current = true;
        skipped = 0;
        blockedRef.current = false;
        userPausedRef.current = false;
        setSlow(false);
        setIssue(null);
        // Shared player: the thumbnail goes once YouTube has drawn the video at this size (no small video zooming)
        if (hosted) revealHost(() => setStarted(true));
        else setStarted(true);
        // Touch screens: the controls go away a moment after playback starts, as in YouTube's app
        if (!overControlsRef.current) scheduleHide();
        // Shared player: go on from where the card's preview was, now that the video has loaded
        if (resumeRef.current !== null) {
          command("seekTo", [resumeRef.current, true]);
          resumeRef.current = null;
        }
        // Right after the end YouTube can briefly report "playing" while still at the end: keep the end screen
        const { time: t, duration: dur } = timeRef.current;
        if (!(wasEnded && dur > 0 && dur - t < 1)) {
          setEnded(false);
          setCountdown(null);
        }
      } else if (state === ENDED) finish();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [command, videoId, hosted, scheduleHide, mutePlayer, startCountdown, finish, watchPlayback, stopWatching, byAutoplay]);

  // ── The shared player (iPhone, iPad, Safari) ──
  useEffect(() => {
    const root = rootRef.current;
    if (!hosted || !root) return;
    // First video page with no shared player yet (opened from a link elsewhere): create it with this video
    armHost(videoId);
    iframeRef.current = hostFrame();
    readyRef.current = false;
    lastStateRef.current = null;
    const token = attachHost(root);
    if (hostReady()) {
      readyRef.current = true;
      resumeRef.current = takePreviewResume(videoId) ?? resumeTime(videoId);
      saverRef.current = progressSaver(videoId, resumeRef.current);
      command("addEventListener", ["onAutoplayBlocked"]);
      if (hostRequested() !== videoId) {
        // Not started by a tap on its link (e.g. Up next): load it here; it has sound if the player had it
        hostLoad(videoId);
        if (hostMuted()) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the shared player, an outside system
          setMuted(true);
          setMutedByBrowser(true);
        }
      }
      command("playVideo");
      // A tap started it already and YouTube won't say "playing" again (it only reports changes): take it as
      // playing now (resume, controls, thumbnail)
      const info = hostInfo();
      if (hostShowing() === videoId && info.playerState === PLAYING) {
        if (resumeRef.current !== null) command("seekTo", [resumeRef.current, true]);
        resumeRef.current = null;
        playedRef.current = true;
        lastStateRef.current = PLAYING;
        setPlayerState(PLAYING);
        if (!overControlsRef.current) scheduleHide();
        revealHost(() => setStarted(true));
      }
    }
    return () => {
      detachHost(token);
      iframeRef.current = null;
      readyRef.current = false;
    };
  }, [hosted, videoId, command, scheduleHide]);
  useEffect(() => {
    if (hosted) setHostCropped(cropped);
  }, [hosted, cropped]);
  useEffect(() => {
    if (hosted) setHostFullscreen(full);
  }, [hosted, full]);

  // Save how far it got when leaving the video, the page or the tab
  useEffect(() => {
    const flush = () => saverRef.current?.flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      flush();
      saverRef.current = null;
      playedRef.current = false;
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [videoId]);

  // If the player doesn't start (e.g. even muted autoplay is blocked), show our paused controls
  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  // "Up next" countdown: plays the next video when it runs out
  useEffect(() => {
    if (countdown === null) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= countdown.endsAt) {
        clearInterval(timer);
        moveOn(true);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [countdown, moveOn]);

  // ── Actions ──
  useEffect(() => () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }, []);

  const flash = (label: "play" | "pause" | "back" | "forward") => setFeedback({ label, key: Date.now() });

  const replay = () => {
    setEnded(false);
    setCountdown(null);
    timeRef.current.time = 0;
    setTime(0);
    userPausedRef.current = false;
    command("seekTo", [0, true]);
    command("playVideo");
  };
  const togglePlay = () => {
    if (ended) return replay();
    if (isPlaying) {
      userPausedRef.current = true;
      command("pauseVideo");
      setPlayerState(PAUSED);
      lastStateRef.current = PAUSED;
      stopWatching();
      flash("pause");
    } else {
      userPausedRef.current = false;
      command("playVideo");
      if (!playedRef.current) watchPlayback();
      flash("play");
    }
  };
  const seekTo = (t: number) => {
    const dur = timeRef.current.duration;
    const target = Math.max(0, dur ? Math.min(dur - 0.25, t) : t);
    timeRef.current.time = target;
    setTime(target);
    command("seekTo", [target, true]);
    if (ended && target < dur - 1) {
      setEnded(false);
      setCountdown(null);
      userPausedRef.current = false;
      command("playVideo");
    }
  };
  const seekBy = (delta: number) => {
    seekTo(timeRef.current.time + delta);
    flash(delta < 0 ? "back" : "forward");
  };
  const toggleMute = () => {
    if (muted || volume === 0) {
      command("unMute");
      if (volume === 0) {
        command("setVolume", [50]);
        setVolume(50);
      }
      setMuted(false);
      setMutedByBrowser(false);
    } else {
      command("mute");
      setMuted(true);
    }
  };
  const changeVolume = (v: number) => {
    setVolume(v);
    command("setVolume", [v]);
    if (v > 0 && muted) {
      command("unMute");
      setMuted(false);
      setMutedByBrowser(false);
    }
    if (v === 0) {
      command("mute");
      setMuted(true);
    }
  };
  const toggleCaptions = () => {
    command(captions ? "unloadModule" : "loadModule", ["captions"]);
    setCaptions(!captions);
  };
  const changeRate = (r: number) => {
    setRate(r);
    command("setPlaybackRate", [r]);
    setMenu(null);
  };
  const toggleAutoplay = () => {
    const next = !autoplayOn;
    // At the end it takes effect at once: the countdown starts, or stops
    if (ended || issue === "unavailable") {
      if (!next) setCountdown(null);
      else if (upNext && onNext) startCountdown();
    }
    if (controlledAutoplay !== undefined) {
      onAutoplayChange?.(next);
      return;
    }
    setSavedAutoplay(next);
    try {
      localStorage.setItem(AUTOPLAY_KEY, String(next));
    } catch {}
  };
  // The whole page goes full screen and this player fills it: a player's own element would leave full screen when the
  // next video's page replaces it. iPhone has no full screen for pages: the player fills the window
  const toggleFullscreen = () => {
    if (full) {
      setFull(false);
      leavePageFullscreen();
      return;
    }
    setFull(true);
    const page = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
    if (page.requestFullscreen) {
      page
        .requestFullscreen({ navigationUI: "hide" })
        .then(() => {
          // Phones: turn to landscape where the browser allows it
          const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
          orientation.lock?.("landscape").catch(() => {});
        })
        .catch(() => {});
    } else page.webkitRequestFullscreen?.();
  };
  useEffect(() => {
    // Left with Esc or the phone's Back
    const sync = () => {
      const doc = document as FullscreenDocument;
      if (!doc.fullscreenElement && !doc.webkitFullscreenElement) setFull(false);
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    // This player has taken full screen over from the one before; leaving for anything else ends it
    const taken = setTimeout(() => { keepFull = autoMove = false; }, 0);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
      clearTimeout(taken);
      if (keepFull) return;
      leavePageFullscreen();
      if (hostWanted()) setHostFullscreen(false);
    };
  }, []);
  // The page behind doesn't scroll (or show its scrollbar) meanwhile
  useLayoutEffect(() => {
    if (!full) return;
    document.documentElement.dataset.playerFull = "";
    return () => { delete document.documentElement.dataset.playerFull; };
  }, [full]);

  // Keyboard shortcuts, as on YouTube (not while typing or with a dialog or menu open)
  const actions = useRef({ togglePlay, seekBy, toggleFullscreen, toggleMute, toggleCaptions, showControls });
  useEffect(() => {
    actions.current = { togglePlay, seekBy, toggleFullscreen, toggleMute, toggleCaptions, showControls };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (document.querySelector('[role="dialog"], [role="menu"]')) return;
      // Space and arrows only when nothing else would use them (the page itself or the video)
      const free = !target || target === document.body || (!!rootRef.current?.contains(target) && target.tagName !== "BUTTON");
      const a = actions.current;
      switch (e.key) {
        case "k": case "K": a.togglePlay(); break;
        case " ": if (!free) return; a.togglePlay(); break;
        case "j": case "J": a.seekBy(-10); break;
        case "l": case "L": a.seekBy(10); break;
        case "ArrowLeft": if (!free) return; a.seekBy(-5); break;
        case "ArrowRight": if (!free) return; a.seekBy(5); break;
        case "f": case "F": a.toggleFullscreen(); break;
        case "m": case "M": a.toggleMute(); break;
        case "c": case "C": a.toggleCaptions(); break;
        default: return;
      }
      e.preventDefault();
      a.showControls();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Clicks on the video ──
  // Mouse: click plays/pauses, double click is full screen. Touch: a tap shows/hides the controls, a double tap
  // on the left/right half goes back/forward 10 seconds (as in YouTube's app).
  const onSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (menu) return setMenu(null);
    if (pointerTypeRef.current === "mouse") {
      togglePlay();
      showControls();
      return;
    }
    setWantBoard(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const side = e.clientX < rect.left + rect.width / 2 ? -1 : 1;
    const nowMs = Date.now();
    if (nowMs - lastTapRef.current.at < 300 && lastTapRef.current.side === side) {
      seekBy(side * 10);
      lastTapRef.current = { at: 0, side: 0 };
      return;
    }
    lastTapRef.current = { at: nowMs, side };
    if (controlsShown && isPlaying) setControlsShown(false);
    else showControls();
  };

  // ── Progress bar ──
  const timeAt = (clientX: number, bar: HTMLElement) => {
    const r = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * timeRef.current.duration;
  };
  const onBarDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!timeRef.current.duration || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    barDownRef.current = e.clientX;
    setTouchScrub(e.pointerType !== "mouse");
    setWantBoard(true);
    setScrubTime(timeAt(e.clientX, e.currentTarget));
  };
  const onBarMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!timeRef.current.duration) return;
    const t = timeAt(e.clientX, e.currentTarget);
    const r = e.currentTarget.getBoundingClientRect();
    if (e.pointerType === "mouse") {
      setWantBoard(true);
      setHover({ time: t, x: Math.max(0, Math.min(r.width, e.clientX - r.left)), width: r.width });
    }
    if (scrubTime !== null) {
      setScrubTime(t);
      if (Math.abs(e.clientX - barDownRef.current) >= DRAG_PX) setDragging(true);
    }
    showControls();
  };
  const endScrub = () => {
    setScrubTime(null);
    setDragging(false);
    setTouchScrub(false);
  };
  const onBarUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrubTime === null) return;
    seekTo(timeAt(e.clientX, e.currentTarget));
    endScrub();
  };

  // The next video, started inside the tap (shared player: with sound)
  const goNext = () => {
    if (upNext && hosted) playFromTap(upNext.videoId);
    moveOn();
  };
  const moveOnByLink = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // opens a new tab or window
    movingRef.current = true;
    keepFull = full;
  };
  // "This video isn't playing": load its player once more
  const retry = () => {
    setIssue(null);
    userPausedRef.current = false;
    blockedRef.current = false;
    reloadPlayer();
    watchPlayback();
  };

  const played = duration ? Math.min(100, (shownTime / duration) * 100) : 0;
  // Progress bar: lifted while the pointer is on it. Over the pointer: the frame there and its time
  const barActive = hover !== null || scrubTime !== null;
  const hoverPercent = hover && scrubTime === null && duration ? Math.min(100, (hover.time / duration) * 100) : null;
  const boardWidth = hover ? Math.round(Math.min(BOARD_WIDTH.max, Math.max(BOARD_WIDTH.min, hover.width * BOARD_WIDTH.share))) : 0;
  const pickedTime = scrubTime ?? hover?.time ?? 0;
  const volumeLevel = muted || volume === 0 ? "off" : volume < 50 ? "low" : "on";
  const canGoNext = !!(upNext && onNext);
  const isFull = full;
  const timeText = (
    <>
      {showTimeLeft ? `-${formatTime(duration - shownTime)}` : formatTime(shownTime)}
      <span className="font-normal"> / {formatTime(duration)}</span>
    </>
  );
  const openMenu = () => {
    // Above the bar with a mouse; over the controls on touch screens, where there's less room
    setMenuMax((rootRef.current?.clientHeight ?? 400) - (pointerTypeRef.current === "mouse" ? 78 : 24));
    setMenu(menu ? null : "main");
  };

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label="Video player"
      className={cn(
        // Its own layer (z-index), above the shared player's frame on iPhone/iPad/Safari, which is then the video
        "select-none overflow-hidden text-white [-webkit-tap-highlight-color:transparent]",
        hosted ? "bg-transparent" : "bg-black",
        full ? "fixed inset-0 z-[100]" : "absolute inset-0 z-[2]"
      )}
      onMouseMove={() => { if (pointerTypeRef.current === "mouse") showControls(); }}
      onMouseLeave={() => { if (isPlaying && menu === null) setControlsShown(false); }}
      onPointerDown={(e) => { pointerTypeRef.current = e.pointerType; }}
    >
      {!hosted && <iframe
        key={frameLoads}
        ref={iframeRef}
        src={`${YT_ORIGIN}/embed/${videoId}?autoplay=0&controls=0&disablekb=1&fs=0&rel=0&iv_load_policy=3&playsinline=1&enablejsapi=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        tabIndex={-1}
        // Invisible until it plays (the thumbnail covers it anyway): YouTube resizes its video while loading,
        // which Lighthouse otherwise counts as layout shift of the page (as on Shorts)
        className={cn(
          "pointer-events-none absolute transition-opacity duration-200",
          // Full screen on a screen wider than 16:9 (phones): no wider than the video, or the crop would cut into it
          full ? "left-1/2 w-full max-w-[177.78vh] -translate-x-1/2 supports-[height:1dvh]:max-w-[177.78dvh]" : "left-0 w-full",
          started ? "opacity-100" : "opacity-0"
        )}
        style={cropped ? { top: -CROP, height: `calc(100% + ${CROP * 2}px)` } : { top: 0, height: "100%" }}
        onLoad={startHandshake}
      />}

      {/* Takes every click and hover over the video, so YouTube's own hover/pause UI never shows */}
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={onSurfaceClick}
        onDoubleClick={() => { if (pointerTypeRef.current === "mouse") toggleFullscreen(); }}
      />

      {/* The thumbnail until it plays, so the page shows the video at once instead of a black box */}
      <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 transition-opacity duration-300", started ? "opacity-0" : "opacity-100")}>
        <Image src={youtubeThumb(videoId)} alt="" fill sizes="(min-width: 1016px) 70vw, 100vw" className="object-cover" {...imagePriorityProps("lcp")} />
      </div>
      {!issue && (!started || slow || (playerState === BUFFERING && !ended)) && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="h-12 w-12 animate-spin rounded-full border-4 border-white/25 border-t-white" />
        </div>
      )}

      {/* Dragging the progress bar: the frame there covers the video (dimmed with a mouse, as on YouTube) */}
      {board && dragging && scrubTime !== null && (
        <div aria-hidden="true" data-storyboard-big="" className="pointer-events-none absolute inset-0 z-[15] flex items-center justify-center bg-black">
          <StoryboardFrame board={board} level={STORYBOARD_MEDIUM} time={scrubTime} duration={duration} className={touchScrub ? undefined : "opacity-40"} />
        </div>
      )}
      {/* …and with a finger, the time in the middle, above the bar */}
      {touchScrub && scrubTime !== null && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[52px] z-30 flex justify-center">
          <span className="rounded-2xl bg-black/60 px-4 py-2 text-xs font-bold leading-[18px]">{formatTime(scrubTime)}</span>
        </div>
      )}

      {/* Play/pause/seek feedback in the middle, as on YouTube */}
      {feedback && (
        <div key={feedback.key} aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <span className="flex h-14 w-14 animate-[player-feedback_0.6s_ease-out_forwards] items-center justify-center rounded-full bg-black/50 [&_svg]:h-7 [&_svg]:w-7">
            {feedback.label === "play" ? <Play className="fill-current" /> : feedback.label === "pause" ? <Pause className="fill-current" /> : feedback.label === "back" ? <ChevronLeft /> : <ChevronRight />}
          </span>
        </div>
      )}

      {/* ── Touch: the controls over the video ── */}
      {controlsVisible && !touchScrub && (
        <div className={cn("pointer-events-none absolute inset-0 animate-in fade-in duration-200 can-hover:hidden", ended ? "z-[35]" : "z-20")}>
          <div className={cn("absolute inset-0 flex items-center justify-center gap-[34px]", ended && "hidden")}>
            {canGoNext && <span className="w-12" />}
            <button
              type="button"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={() => { togglePlay(); showControls(); }}
              className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/30 active:bg-black/50 [&_svg]:h-8 [&_svg]:w-8"
            >
              {isPlaying ? <Pause className="fill-current stroke-0" /> : <Play className="fill-current stroke-0" />}
            </button>
            {canGoNext && (
              <button type="button" aria-label="Next" onClick={goNext} className="group pointer-events-auto flex h-12 w-12 items-center justify-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 group-active:bg-black/50 [&_svg]:h-5 [&_svg]:w-5">
                  <SkipForward className="fill-current" />
                </span>
              </button>
            )}
          </div>
          <div className="pointer-events-auto absolute right-3 top-2 flex h-10 items-center rounded-full bg-black/30 px-1 [&_svg]:h-6 [&_svg]:w-6">
            {canGoNext && (
              <button type="button" role="switch" aria-checked={autoplayOn} aria-label={autoplayOn ? "Autoplay is on" : "Autoplay is off"} onClick={() => { toggleAutoplay(); showControls(); }} className="flex h-10 w-11 items-center justify-center">
                <AutoplayTrack on={autoplayOn} />
              </button>
            )}
            <button type="button" aria-label="Subtitles/closed captions" aria-pressed={captions} onClick={() => { toggleCaptions(); showControls(); }} className="flex h-10 w-11 items-center justify-center">
              {captions ? <CCIconOn /> : <CCIconOff className="fill-current" />}
            </button>
            <button type="button" aria-label="Settings" aria-expanded={menu !== null} onClick={openMenu} className="flex h-10 w-11 items-center justify-center">
              <Settings />
            </button>
          </div>
        </div>
      )}

      {mutedByBrowser && !ended && (
        <button
          type="button"
          onClick={() => { command("unMute"); setMuted(false); setMutedByBrowser(false); }}
          className="absolute left-3 top-3 z-30 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-black/85"
        >
          <VolumeIcon level="off" className="h-5 w-5" />
          <span className="md:hidden">Tap to unmute</span>
          <span className="hidden md:inline">Click to unmute</span>
        </button>
      )}

      {/* ── Controls ── */}
      <div
        // At the end over the end screen, as on YouTube (on phones only to leave full screen: there's no room for both)
        className={cn(
          "absolute inset-x-0 bottom-0 transition-opacity duration-200",
          ended ? "z-[35]" : "z-20",
          ended && !full && "invisible can-hover:visible",
          controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        // Mouse only: a tap on a phone also sends mouseenter, which would keep the controls up for good
        onPointerEnter={(e) => {
          if (e.pointerType !== "mouse") return;
          overControlsRef.current = true;
          setWantBoard(true);
        }}
        onPointerLeave={(e) => { if (e.pointerType === "mouse") overControlsRef.current = false; }}
      >
        <div className="flex flex-col px-7 can-hover:px-3">
          {/* Touch: the time and full screen, above the bar */}
          <div className={cn("flex h-11 items-center justify-between can-hover:hidden", touchScrub && "invisible")}>
            <span className="rounded-full bg-black/30 px-2 py-1 text-sm font-medium leading-4 tabular-nums">{timeText}</span>
            <button type="button" aria-label={isFull ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen} className="group -mr-1.5 flex h-12 w-12 items-center justify-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 group-active:bg-black/50 [&_svg]:h-5 [&_svg]:w-5">
                {isFull ? <Minimize2 className="rotate-90" /> : <FullscreenIcon className="fill-current" />}
              </span>
            </button>
          </div>

          {/* Progress bar: hover to see the frame and time there, click or drag to go there. The pointer can be up to
              10px above the line (a finger more) */}
          <div
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(shownTime)}
            aria-valuetext={`${formatTime(shownTime)} of ${formatTime(duration)}`}
            tabIndex={-1}
            className="relative mb-[19px] h-4 cursor-pointer touch-none before:absolute before:inset-x-0 before:-bottom-4 before:-top-2 can-hover:mb-0 can-hover:before:hidden"
            onPointerDown={onBarDown}
            onPointerMove={onBarMove}
            onPointerUp={onBarUp}
            onPointerCancel={endScrub}
            onPointerLeave={() => setHover(null)}
          >
            <div
              data-seek-line=""
              className={cn(
                "absolute inset-x-0 bottom-0 h-1.5 overflow-hidden rounded-[3px] bg-white/30 transition-transform can-hover:bg-[rgba(40,40,40,0.6)]",
                BAR_EASE,
                barActive && !touchScrub ? "scale-y-100" : "scale-y-[0.5] can-hover:scale-y-[0.667]"
              )}
            >
              <div className="absolute inset-y-0 left-0 bg-white/60 can-hover:bg-white/40" style={{ width: `${loaded * 100}%` }} />
              <div className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,#f03_80%,#ff2791)]" style={{ width: `${played}%` }} />
              {/* Between the playhead and the pointer */}
              {hoverPercent !== null && (
                <div
                  className={cn("absolute inset-y-0", hoverPercent > played ? "bg-white/50" : "bg-black/[0.125]")}
                  style={{ left: `${Math.min(played, hoverPercent)}%`, width: `${Math.abs(hoverPercent - played)}%` }}
                />
              )}
            </div>
            <div
              data-seek-head=""
              className={cn("absolute bottom-[3px] h-3 w-3 rounded-full bg-[#f03] transition-transform", BAR_EASE)}
              style={{ left: `${played}%`, transform: `translate(-50%, 50%) scale(${touchScrub ? 1.333 : barActive ? 1.667 : 1})` }}
            />
            {hover && !touchScrub && duration > 0 && (
              <div
                className="pointer-events-none absolute bottom-[calc(100%+9px)] flex -translate-x-1/2 flex-col items-center gap-[9px]"
                // Centred on the pointer, but never past the ends of the bar
                style={{ left: Math.max((board ? boardWidth + 2 : 60) / 2, Math.min(hover.width - (board ? boardWidth + 2 : 60) / 2, hover.x)) }}
              >
                {board && (
                  <div className="box-content overflow-hidden rounded-lg border border-white bg-black" style={{ width: boardWidth, aspectRatio: board.aspect }} data-storyboard-box="">
                    <StoryboardFrame board={board} level={STORYBOARD_LARGE} time={pickedTime} duration={duration} className="w-full" />
                  </div>
                )}
                <span className="rounded-[18px] bg-black/30 px-4 py-2 text-[13px] font-medium leading-[15px] [text-shadow:0_0_2px_rgba(0,0,0,0.5)]">{formatTime(pickedTime)}</span>
              </div>
            )}
          </div>

          {/* Mouse: 40px groups, 8px above the bottom edge */}
          <div className="hidden h-14 items-start pt-2 can-hover:flex">
            <div className="flex h-10 rounded-full bg-black/30">
              <BarButton name={ended ? "Replay" : isPlaying ? "Pause" : "Play"} keyName="k" tip="left" onClick={togglePlay}>
                {ended ? <RotateCcw /> : isPlaying ? <Pause className="fill-current stroke-0" /> : <Play className="fill-current stroke-0" />}
              </BarButton>
              {canGoNext && (
                <BarButton name="Next" onClick={goNext}>
                  <SkipForward className="fill-current" />
                </BarButton>
              )}
            </div>
            <div className="group/vol ml-3 flex h-10 items-center rounded-full bg-black/30">
              <BarButton name={volumeLevel === "off" ? "Unmute" : "Mute"} keyName="m" onClick={toggleMute}>
                <VolumeIcon level={volumeLevel} />
              </BarButton>
              <input
                type="range"
                min={0}
                max={100}
                value={muted ? 0 : volume}
                aria-label="Volume"
                onChange={(e) => changeVolume(Number(e.target.value))}
                style={{ "--v": `${muted ? 0 : volume}%` } as React.CSSProperties}
                className="player-volume h-10 w-0 cursor-pointer overflow-hidden opacity-0 transition-all duration-200 group-hover/vol:mr-4 group-hover/vol:w-[52px] group-hover/vol:opacity-100 kb:focus-visible:mr-4 kb:focus-visible:w-[52px] kb:focus-visible:opacity-100"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowTimeLeft(!showTimeLeft)}
              className="group/btn relative ml-2 h-10 whitespace-nowrap rounded-full bg-black/30 px-4 text-sm font-medium tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <span aria-hidden="true" className="absolute inset-1 rounded-full transition-colors group-hover/btn:bg-white/10" />
              <span className="relative">{timeText}</span>
            </button>
            <div className="flex-1" />
            <div className="flex h-10 items-center rounded-full bg-black/30 px-1">
              {canGoNext && (
                <BarButton name={autoplayOn ? "Autoplay is on" : "Autoplay is off"} role="switch" aria-checked={autoplayOn} wide onClick={toggleAutoplay} className="hidden sm:flex">
                  <AutoplayTrack on={autoplayOn} />
                </BarButton>
              )}
              <BarButton name="Subtitles/closed captions" keyName="c" aria-pressed={captions} wide onClick={toggleCaptions}>
                {captions ? <CCIconOn /> : <CCIconOff className="fill-current" />}
                {captions && <span className="absolute -bottom-1.5 left-0 h-[3px] w-6 rounded-full bg-[#e1002d]" />}
              </BarButton>
              <BarButton name="Settings" aria-expanded={menu !== null} wide onClick={openMenu} tip={menu ? "none" : "center"}>
                <Settings className={cn("transition-transform duration-200", menu && "rotate-45")} />
              </BarButton>
              <BarButton name={isFull ? "Exit full screen" : "Full screen"} keyName="f" wide tip="right" onClick={toggleFullscreen}>
                {isFull ? <Minimize2 className="rotate-90" /> : <FullscreenIcon className="fill-current" />}
              </BarButton>
            </div>
          </div>
        </div>
      </div>

      {/* ── Settings ── above the bar with a mouse, over the controls on touch screens */}
      {menu && controlsVisible && (
        <div
          role="menu"
          aria-label="Settings"
          style={{ maxHeight: menuMax }}
          className="yt-scrollbar absolute bottom-3 right-3 z-40 w-[min(320px,calc(100%-24px))] overflow-y-auto overscroll-contain rounded-xl bg-black/60 p-2 text-sm backdrop-blur-sm can-hover:bottom-[62px]"
          onPointerEnter={(e) => { if (e.pointerType === "mouse") overControlsRef.current = true; }}
          onPointerLeave={(e) => { if (e.pointerType === "mouse") overControlsRef.current = false; }}
        >
          {menu === "main" ? (
            <>
              {canGoNext && (
                <MenuRow role="menuitemcheckbox" aria-checked={autoplayOn} icon={<ListVideo />} label="Autoplay" onClick={toggleAutoplay}>
                  <MenuSwitch on={autoplayOn} />
                </MenuRow>
              )}
              <MenuRow role="menuitemcheckbox" aria-checked={captions} icon={<CCIconOff className="fill-current" />} label="Subtitles/CC" onClick={toggleCaptions}>
                <MenuSwitch on={captions} />
              </MenuRow>
              <MenuRow role="menuitem" icon={<Gauge />} label="Playback speed" onClick={() => setMenu("speed")}>
                {rate === 1 ? "Normal" : rate}
                <ChevronRight className="h-5 w-5" />
              </MenuRow>
            </>
          ) : (
            <>
              <button type="button" role="menuitem" onClick={() => setMenu("main")} className="mb-2 flex h-12 w-full items-center gap-2 border-b border-white/20 px-1 pb-1 font-medium">
                <ChevronLeft className="h-6 w-6" /> Playback speed
              </button>
              {SPEEDS.map((s) => (
                <button key={s} type="button" role="menuitemradio" aria-checked={rate === s} onClick={() => changeRate(s)} className="flex h-10 w-full items-center gap-4 rounded-lg px-2 hover:bg-white/10 active:bg-white/10">
                  <Check className={cn("h-5 w-5", rate !== s && "invisible")} />
                  {s === 1 ? "Normal" : s}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Our end screen, over YouTube's suggestions (and what to say when a video doesn't play) ── */}
      {(ended || issue) && (
        <div className={cn("absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 overflow-hidden bg-black", !issue && "pt-9 can-hover:pt-0")}>
          <Image src={youtubeThumb(videoId)} alt="" fill sizes="50vw" className="object-cover opacity-25 blur-sm" />
          {issue && (
            <div role="alert" className="relative px-6 text-center">
              <p className="text-base font-medium">{issue === "unavailable" ? "This video isn't available" : "This video isn't playing"}</p>
              <p className="mt-1 text-sm text-white/80">{issue === "unavailable" ? "It may have been removed from YouTube." : "Check your connection, then try again."}</p>
            </div>
          )}
          {secondsLeft !== null && upNext ? (
            <div className="relative flex max-w-[92%] items-center gap-4 sm:gap-6">
              <UpNextThumb video={upNext} onNext={goNext} onOpen={moveOnByLink} />
              <div className="min-w-0">
                <p className="text-xs text-white/75 sm:text-sm">Up next in {secondsLeft}</p>
                <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 sm:text-lg sm:leading-6">{upNext.title}</p>
                <p className="mt-0.5 hidden truncate text-sm text-white/70 sm:block">{upNext.channel}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setCountdown(null)} className="h-9 whitespace-nowrap rounded-full bg-white/15 px-3 text-sm font-medium transition-colors hover:bg-white/25 sm:px-4">
                    Cancel
                  </button>
                  <button type="button" onClick={goNext} className="h-9 whitespace-nowrap rounded-full bg-white px-3 text-sm font-medium text-black transition-colors hover:bg-white/85 sm:px-4">
                    Play now
                  </button>
                </div>
              </div>
            </div>
          ) : issue ? (
            <div className="relative flex flex-wrap items-center justify-center gap-2">
              {issue === "stalled" && (
                <button type="button" onClick={retry} className="h-9 rounded-full bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-white/85">
                  Try again
                </button>
              )}
              {canGoNext && (
                <button type="button" onClick={goNext} className="h-9 rounded-full bg-white/15 px-4 text-sm font-medium transition-colors hover:bg-white/25">
                  Next video
                </button>
              )}
            </div>
          ) : (
            <div className="relative flex items-center gap-6 px-4 sm:gap-10">
              <button type="button" onClick={replay} className="flex flex-col items-center gap-2">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25 sm:h-16 sm:w-16">
                  <RotateCcw className="h-6 w-6 sm:h-8 sm:w-8" />
                </span>
                <span className="text-sm font-medium">Replay</span>
              </button>
              {upNext && (
                <div className="flex flex-col items-start">
                  <span className="text-xs font-medium uppercase tracking-wide text-white/70">Up next</span>
                  <UpNextThumb video={upNext} onNext={goNext} onOpen={moveOnByLink} className="mt-1.5" />
                  <span className="mt-1.5 line-clamp-2 w-28 text-sm font-medium leading-5 sm:w-48">{upNext.title}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** A button of the control bar (mouse): the highlight inside its group, and its name and key above the progress bar. */
function BarButton({
  name,
  keyName,
  wide,
  tip = "center",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { name: string; keyName?: string; wide?: boolean; tip?: "left" | "center" | "right" | "none" }) {
  return (
    <button
      type="button"
      aria-label={keyName ? `${name} (${keyName})` : name}
      className={cn(
        "group/btn relative flex h-10 flex-shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 [&_svg]:h-6 [&_svg]:w-6",
        wide ? "w-12" : "w-10",
        className
      )}
      {...props}
    >
      <span aria-hidden="true" className={cn("absolute rounded-full transition-colors group-hover/btn:bg-white/10", wide ? "inset-x-0 inset-y-1" : "inset-1")} />
      <span className="relative flex drop-shadow-[0_0_2px_rgba(0,0,0,0.4)]">{children}</span>
      {tip !== "none" && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute bottom-[calc(100%+22px)] hidden items-center gap-1.5 whitespace-nowrap rounded-lg bg-black/60 px-2 py-1.5 text-[13px] font-medium leading-[15px] can-hover:group-hover/btn:flex",
            tip === "left" ? "left-0" : tip === "right" ? "-right-1" : "left-1/2 -translate-x-1/2"
          )}
        >
          {name}
          {keyName && <kbd className="rounded border border-white/40 px-1 font-sans text-xs uppercase leading-[15px]">{keyName}</kbd>}
        </span>
      )}
    </button>
  );
}

/** The Autoplay switch: a small track with a play or pause knob. */
function AutoplayTrack({ on }: { on: boolean }) {
  return (
    <span className={cn("relative block h-[18px] w-[30px] rounded-full transition-colors", on ? "bg-white" : "bg-white/40")}>
      <span className={cn("absolute top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full transition-[left]", on ? "left-3.5 bg-black text-white" : "left-0.5 bg-white text-black")}>
        {on ? <Play className="!h-2 !w-2 fill-current" /> : <Pause className="!h-2 !w-2 fill-current" />}
      </span>
    </span>
  );
}

/** A row of the player's settings: icon, name, and its value or switch on the right. */
function MenuRow({ icon, label, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: React.ReactNode; label: string }) {
  return (
    <button type="button" className="flex h-12 w-full items-center rounded-lg px-2 text-left hover:bg-white/10 active:bg-white/10" {...props}>
      <span className="mr-5 flex [&_svg]:h-6 [&_svg]:w-6">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="flex items-center gap-1 text-white/70">{children}</span>
    </button>
  );
}

function MenuSwitch({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className={cn("relative h-6 w-10 rounded-full transition-colors", on ? "bg-white/40" : "bg-white/15")}>
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full transition-[left,background-color]", on ? "left-[18px] bg-white" : "left-0.5 bg-white/70")} />
    </span>
  );
}

function UpNextThumb({ video, onNext, onOpen, className }: { video: UpNextVideo; onNext?: () => void; onOpen?: (e: React.MouseEvent) => void; className?: string }) {
  const thumb = (
    <span className={cn("relative block aspect-video w-28 overflow-hidden rounded-lg bg-white/10 sm:w-48", className)}>
      <Image src={youtubeThumb(video.videoId, "small")} alt="" fill sizes="192px" className="object-cover" />
    </span>
  );
  if (video.href) {
    return (
      <Link href={video.href} onClick={onOpen} aria-label={`Play next: ${video.title}`} className="flex-shrink-0 transition-opacity hover:opacity-90">
        {thumb}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onNext} aria-label={`Play next: ${video.title}`} className="flex-shrink-0 transition-opacity hover:opacity-90">
      {thumb}
    </button>
  );
}
