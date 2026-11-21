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
// - at the end, our own end screen covers YouTube's: "Up next" with an Autoplay countdown, or Replay.
// Also: the video's thumbnail shows until it plays (no black box), and if the browser blocks sound it plays
// muted with a "Click to unmute" button. Keyboard: space/k play, j/l ±10s, ←/→ ±5s, f full screen, m mute,
// c captions. On touch screens the controls hide 3s after the video starts or after a tap, as in YouTube's app.
// How far the video has been watched is saved (lib/watch-progress: the red bar on its thumbnails), and the video
// goes on from there next time, as on YouTube (from History too); a finished video starts again.
//
// On iPhone, iPad and Safari the video plays in the app's one shared player (lib/player-host.ts) instead of a
// frame of its own: the tap that opened the page already started it there, with sound, which Safari only
// allows inside a tap. The shared player is placed over this box and these controls drive it.
"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { Captions, Check, ChevronLeft, ChevronRight, Maximize, Minimize, Pause, Play, RotateCcw, Settings, SkipForward, Volume1, Volume2, VolumeX } from "lucide-react";
import { youtubeThumb } from "@/lib/media-lookup";
import { imagePriorityProps } from "@/lib/image-priority";
import { cn } from "@/lib/utils";
import { takePreviewResume } from "@/components/inline-preview";
import { progressSaver, resumeTime } from "@/lib/watch-progress";
import {
  armHost,
  attachHost,
  detachHost,
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
const ENDED = 0;
const PLAYING = 1;
const PAUSED = 2;
const BUFFERING = 3;
const CROP = 120; // px of the frame hidden above and below the box while not playing
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const COUNTDOWN_SECONDS = 8;
const AUTOPLAY_KEY = "deeni-autoplay";

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
  const [hover, setHover] = useState<{ time: number; x: number } | null>(null);
  const [controlsShown, setControlsShown] = useState(true);
  const [menu, setMenu] = useState<null | "main" | "speed">(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false);
  const [feedback, setFeedback] = useState<{ label: "play" | "pause" | "back" | "forward"; key: number } | null>(null);
  const [savedAutoplay, setSavedAutoplay] = useState(true);
  const [countdownStart, setCountdownStart] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  const autoplayOn = controlledAutoplay ?? savedAutoplay;
  const isPlaying = playerState === PLAYING || playerState === BUFFERING;
  const cropped = !captions || !isPlaying;
  const controlsVisible = started && !ended && (!isPlaying || controlsShown || menu !== null || scrubTime !== null);
  const shownTime = scrubTime ?? time;
  const secondsLeft = countdownStart === null ? null : Math.max(0, COUNTDOWN_SECONDS - Math.floor((now - countdownStart) / 1000));

  // Latest values for event handlers that outlive a render
  const latest = useRef({ upNext, onNext, autoplayOn, controlled: controlledAutoplay !== undefined });
  useEffect(() => {
    latest.current = { upNext, onNext, autoplayOn, controlled: controlledAutoplay !== undefined };
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
  }, [startHandshake, hosted]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== YT_ORIGIN || !iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      let d;
      try {
        d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
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
        const resumeAt = takePreviewResume(videoId) ?? resumeTime(videoId);
        saverRef.current = progressSaver(videoId, resumeAt);
        if (resumeAt) command("seekTo", [resumeAt, true]);
        command("playVideo");
        return;
      }
      if (d?.event === "onAutoplayBlocked") {
        // No sound allowed yet: play muted rather than sit still
        setMutedByBrowser(true);
        setMuted(true);
        command("mute");
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
      lastStateRef.current = state;
      setPlayerState(state);
      if (state === PAUSED) saverRef.current?.update(timeRef.current.time, timeRef.current.duration, true);
      if (state === PLAYING) {
        playedRef.current = true;
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
          setCountdownStart(null);
        }
      } else if (state === ENDED) {
        setEnded(true);
        // Watched to the end: a full bar, and next time it starts from the beginning
        saverRef.current?.update(timeRef.current.duration, timeRef.current.duration, true);
        const { upNext: next, onNext: goNext, autoplayOn: auto, controlled } = latest.current;
        if (next && goNext && auto) {
          if (controlled) goNext(); // playlist: straight on to the next video
          else {
            setNow(Date.now());
            setCountdownStart(Date.now());
          }
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [command, videoId, hosted, scheduleHide]);

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
    if (hosted) setHostFullscreen(pseudoFullscreen);
  }, [hosted, pseudoFullscreen]);

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
    if (countdownStart === null) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (Date.now() - countdownStart >= COUNTDOWN_SECONDS * 1000) {
        clearInterval(timer);
        latest.current.onNext?.();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [countdownStart]);

  // ── Actions ──
  useEffect(() => () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }, []);

  const flash = (label: "play" | "pause" | "back" | "forward") => setFeedback({ label, key: Date.now() });

  const replay = () => {
    setEnded(false);
    setCountdownStart(null);
    timeRef.current.time = 0;
    setTime(0);
    command("seekTo", [0, true]);
    command("playVideo");
  };
  const togglePlay = () => {
    if (ended) return replay();
    if (isPlaying) {
      command("pauseVideo");
      setPlayerState(PAUSED);
      lastStateRef.current = PAUSED;
      flash("pause");
    } else {
      command("playVideo");
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
      setCountdownStart(null);
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
    if (controlledAutoplay !== undefined) {
      onAutoplayChange?.(next);
      return;
    }
    setSavedAutoplay(next);
    try {
      localStorage.setItem(AUTOPLAY_KEY, String(next));
    } catch {}
  };
  const toggleFullscreen = () => {
    const el = rootRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
    if (hosted) {
      // The video is the shared player's frame, outside this element: fill the window with both, and make the
      // whole page full screen where the browser can (iPad, Mac; iPhone can't)
      const page = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
      if (pseudoFullscreen) {
        setPseudoFullscreen(false);
        if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
        else if (doc.webkitFullscreenElement) doc.webkitExitFullscreen?.();
      } else {
        setPseudoFullscreen(true);
        if (page.requestFullscreen) page.requestFullscreen().catch(() => {});
        else page.webkitRequestFullscreen?.();
      }
      return;
    }
    if (document.fullscreenElement || doc.webkitFullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else doc.webkitExitFullscreen?.();
      return;
    }
    if (pseudoFullscreen) {
      setPseudoFullscreen(false);
      return;
    }
    if (el?.requestFullscreen) {
      el.requestFullscreen()
        .then(() => {
          // Phones: turn to landscape where the browser allows it
          const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
          orientation.lock?.("landscape").catch(() => {});
        })
        .catch(() => setPseudoFullscreen(true));
    } else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
    // iPhone has no full screen for page elements: fill the window instead
    else setPseudoFullscreen(true);
  };
  useEffect(() => {
    const sync = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      const el = document.fullscreenElement || doc.webkitFullscreenElement;
      setFullscreen(!!el && el === rootRef.current);
      // Shared player: leaving the page's full screen (Esc) also leaves the player's
      if (!el) setPseudoFullscreen((on) => (on && hostWanted() ? false : on));
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

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
    if (!timeRef.current.duration) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setScrubTime(timeAt(e.clientX, e.currentTarget));
  };
  const onBarMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!timeRef.current.duration) return;
    const t = timeAt(e.clientX, e.currentTarget);
    const r = e.currentTarget.getBoundingClientRect();
    setHover({ time: t, x: Math.max(24, Math.min(r.width - 24, e.clientX - r.left)) });
    if (scrubTime !== null) setScrubTime(t);
    showControls();
  };
  const onBarUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrubTime === null) return;
    seekTo(timeAt(e.clientX, e.currentTarget));
    setScrubTime(null);
  };

  // The next video, started inside the tap (shared player: with sound)
  const goNext = () => {
    if (upNext && hosted) playFromTap(upNext.videoId);
    onNext?.();
  };

  const played = duration ? Math.min(100, (shownTime / duration) * 100) : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;
  const canGoNext = !!(upNext && onNext);
  const btn =
    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 [&_svg]:h-6 [&_svg]:w-6";

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label="Video player"
      className={cn(
        // Its own layer (z-index), above the shared player's frame on iPhone/iPad/Safari, which is then the video
        "select-none overflow-hidden text-white [-webkit-tap-highlight-color:transparent]",
        hosted ? "bg-transparent" : "bg-black",
        pseudoFullscreen ? "fixed inset-0 z-[100]" : "absolute inset-0 z-[2]"
      )}
      onMouseMove={() => { if (pointerTypeRef.current === "mouse") showControls(); }}
      onMouseLeave={() => { if (isPlaying && menu === null) setControlsShown(false); }}
      onPointerDown={(e) => { pointerTypeRef.current = e.pointerType; }}
    >
      {!hosted && <iframe
        ref={iframeRef}
        src={`${YT_ORIGIN}/embed/${videoId}?autoplay=0&controls=0&disablekb=1&fs=0&rel=0&iv_load_policy=3&playsinline=1&enablejsapi=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        tabIndex={-1}
        // Invisible until it plays (the thumbnail covers it anyway): YouTube resizes its video while loading,
        // which Lighthouse otherwise counts as layout shift of the page (as on Shorts)
        className={cn("pointer-events-none absolute left-0 w-full transition-opacity duration-200", started ? "opacity-100" : "opacity-0")}
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
      {(!started || (playerState === BUFFERING && !ended)) && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="h-12 w-12 animate-spin rounded-full border-4 border-white/25 border-t-white" />
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

      {/* Touch: big play/pause in the middle while the controls show */}
      {controlsVisible && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center can-hover:hidden">
          <button
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={() => { togglePlay(); showControls(); }}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/50 [&_svg]:h-7 [&_svg]:w-7"
          >
            {isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}
          </button>
        </div>
      )}

      {mutedByBrowser && !ended && (
        <button
          type="button"
          onClick={() => { command("unMute"); setMuted(false); setMutedByBrowser(false); }}
          className="absolute left-3 top-3 z-30 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-black/85"
        >
          <VolumeX className="h-5 w-5" />
          <span className="md:hidden">Tap to unmute</span>
          <span className="hidden md:inline">Click to unmute</span>
        </button>
      )}

      {/* ── Controls ── */}
      <div
        className={cn("absolute inset-x-0 bottom-0 z-20 transition-opacity duration-200", controlsVisible ? "opacity-100" : "pointer-events-none opacity-0")}
        // Mouse only: a tap on a phone also sends mouseenter, which would keep the controls up for good
        onPointerEnter={(e) => { if (e.pointerType === "mouse") overControlsRef.current = true; }}
        onPointerLeave={(e) => { if (e.pointerType === "mouse") overControlsRef.current = false; }}
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

        {menu && (
          <div role="menu" aria-label="Settings" className="absolute bottom-14 right-3 z-30 w-60 overflow-hidden rounded-xl bg-[#1c1c1c]/95 py-2 text-sm shadow-xl">
            {menu === "main" ? (
              <>
                {canGoNext && (
                  <button type="button" role="menuitemcheckbox" aria-checked={autoplayOn} onClick={toggleAutoplay} className="flex h-10 w-full items-center justify-between px-4 hover:bg-white/10">
                    <span>Autoplay</span>
                    <span className="text-white/70">{autoplayOn ? "On" : "Off"}</span>
                  </button>
                )}
                <button type="button" role="menuitem" onClick={() => setMenu("speed")} className="flex h-10 w-full items-center justify-between px-4 hover:bg-white/10">
                  <span>Playback speed</span>
                  <span className="flex items-center gap-1 text-white/70">
                    {rate === 1 ? "Normal" : rate}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </button>
              </>
            ) : (
              <>
                <button type="button" role="menuitem" onClick={() => setMenu("main")} className="mb-1 flex h-10 w-full items-center gap-2 border-b border-white/15 px-3 font-medium hover:bg-white/10">
                  <ChevronLeft className="h-5 w-5" /> Playback speed
                </button>
                {SPEEDS.map((s) => (
                  <button key={s} type="button" role="menuitemradio" aria-checked={rate === s} onClick={() => changeRate(s)} className="flex h-9 w-full items-center gap-3 px-4 hover:bg-white/10">
                    <Check className={cn("h-4 w-4", rate !== s && "invisible")} />
                    {s === 1 ? "Normal" : s}
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        <div className="relative px-2 sm:px-3">
          {/* Progress bar: hover to preview a time, click or drag to jump there */}
          <div
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(shownTime)}
            aria-valuetext={`${formatTime(shownTime)} of ${formatTime(duration)}`}
            tabIndex={-1}
            className="group/bar relative mx-1 flex h-4 cursor-pointer touch-none items-end pb-1.5"
            onPointerDown={onBarDown}
            onPointerMove={onBarMove}
            onPointerUp={onBarUp}
            onPointerLeave={() => setHover(null)}
          >
            <div className={cn("relative w-full bg-white/25 transition-[height] duration-100", scrubTime !== null ? "h-[5px]" : "h-[3px] group-hover/bar:h-[5px]")}>
              <div className="absolute inset-y-0 left-0 bg-white/40" style={{ width: `${loaded * 100}%` }} />
              <div className="absolute inset-y-0 left-0 bg-[#f00]" style={{ width: `${played}%` }} />
              <div
                className={cn("absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f00] transition-transform", scrubTime !== null ? "scale-100" : "scale-0 group-hover/bar:scale-100")}
                style={{ left: `${played}%` }}
              />
            </div>
            {hover && (
              <span className="pointer-events-none absolute bottom-5 -translate-x-1/2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium" style={{ left: hover.x }}>
                {formatTime(hover.time)}
              </span>
            )}
          </div>

          <div className="flex h-11 items-center gap-0.5 sm:h-12">
            <button type="button" aria-label={isPlaying ? "Pause (k)" : "Play (k)"} title={isPlaying ? "Pause (k)" : "Play (k)"} onClick={togglePlay} className={btn}>
              {isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}
            </button>
            {canGoNext && (
              <button type="button" aria-label="Next" title="Next" onClick={goNext} className={cn(btn, "hidden sm:flex")}>
                <SkipForward className="fill-current" />
              </button>
            )}
            <div className="group/vol flex items-center">
              <button type="button" aria-label={muted || volume === 0 ? "Unmute (m)" : "Mute (m)"} title={muted ? "Unmute (m)" : "Mute (m)"} onClick={toggleMute} className={btn}>
                <VolumeIcon />
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={muted ? 0 : volume}
                aria-label="Volume"
                onChange={(e) => changeVolume(Number(e.target.value))}
                className="hidden h-1 w-0 cursor-pointer accent-white opacity-0 transition-all duration-200 group-hover/vol:w-16 group-hover/vol:opacity-100 focus-visible:w-16 focus-visible:opacity-100 can-hover:block"
              />
            </div>
            <span className="ml-1 whitespace-nowrap text-[13px] tabular-nums text-white/90 sm:ml-2 sm:text-sm">
              {formatTime(shownTime)} <span className="text-white/60">/ {formatTime(duration)}</span>
            </span>
            <div className="flex-1" />
            {canGoNext && (
              <button
                type="button"
                role="switch"
                aria-checked={autoplayOn}
                aria-label={autoplayOn ? "Autoplay is on" : "Autoplay is off"}
                title={autoplayOn ? "Autoplay is on" : "Autoplay is off"}
                onClick={toggleAutoplay}
                className="mr-1 hidden h-10 items-center px-2 sm:flex"
              >
                <span className={cn("relative h-3.5 w-9 rounded-full transition-colors", autoplayOn ? "bg-white/70" : "bg-white/30")}>
                  <span className={cn("absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-black shadow transition-all", autoplayOn ? "left-4 bg-white" : "left-0 bg-[#bbb]")}>
                    {autoplayOn ? <Play className="h-2.5 w-2.5 fill-current" /> : <Pause className="h-2.5 w-2.5 fill-current" />}
                  </span>
                </span>
              </button>
            )}
            <button type="button" aria-label="Subtitles/closed captions (c)" aria-pressed={captions} title="Subtitles/closed captions (c)" onClick={toggleCaptions} className={cn(btn, "relative")}>
              <Captions />
              {captions && <span className="absolute bottom-1.5 left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full bg-[#f00]" />}
            </button>
            <button type="button" aria-label="Settings" aria-expanded={menu !== null} title="Settings" onClick={() => setMenu(menu ? null : "main")} className={btn}>
              <Settings className={cn("transition-transform duration-200", menu && "rotate-45")} />
            </button>
            <button type="button" aria-label={fullscreen || pseudoFullscreen ? "Exit full screen (f)" : "Full screen (f)"} title="Full screen (f)" onClick={toggleFullscreen} className={btn}>
              {fullscreen || pseudoFullscreen ? <Minimize /> : <Maximize />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Our end screen, over YouTube's suggestions ── */}
      {ended && (
        <div className="absolute inset-0 z-30 flex items-center justify-center overflow-hidden bg-black">
          <Image src={youtubeThumb(videoId)} alt="" fill sizes="50vw" className="object-cover opacity-25 blur-sm" />
          {secondsLeft !== null && upNext ? (
            <div className="relative flex max-w-[92%] items-center gap-4 sm:gap-6">
              <UpNextThumb video={upNext} onNext={goNext} />
              <div className="min-w-0">
                <p className="text-xs text-white/75 sm:text-sm">Up next in {secondsLeft}</p>
                <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 sm:text-lg sm:leading-6">{upNext.title}</p>
                <p className="mt-0.5 hidden truncate text-sm text-white/70 sm:block">{upNext.channel}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setCountdownStart(null)} className="h-9 rounded-full bg-white/15 px-4 text-sm font-medium transition-colors hover:bg-white/25">
                    Cancel
                  </button>
                  <button type="button" onClick={() => { setCountdownStart(null); goNext(); }} className="h-9 rounded-full bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-white/85">
                    Play now
                  </button>
                </div>
              </div>
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
                  <UpNextThumb video={upNext} onNext={goNext} className="mt-1.5" />
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

function UpNextThumb({ video, onNext, className }: { video: UpNextVideo; onNext?: () => void; className?: string }) {
  const thumb = (
    <span className={cn("relative block aspect-video w-28 overflow-hidden rounded-lg bg-white/10 sm:w-48", className)}>
      <Image src={youtubeThumb(video.videoId, "small")} alt="" fill sizes="192px" className="object-cover" />
    </span>
  );
  if (video.href) {
    return (
      <Link href={video.href} aria-label={`Play next: ${video.title}`} className="flex-shrink-0 transition-opacity hover:opacity-90">
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
