// components/inline-preview-player.tsx
// The playing video of a card's inline preview (see components/inline-preview.tsx, which explains the
// behaviour): the YouTube embed, the volume button, the time left and the seekable progress bar. Loaded only
// when a preview starts, so pages with cards don't carry it in their first JavaScript.
// Like YouTube's inline playback, it starts where the video was left (lib/watch-progress), saves how far it
// gets, and adds the video to History once it has played HISTORY_AFTER_S seconds.
"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { progressSaver, resumeTime } from "@/lib/watch-progress";
import { recordWatch } from "@/hooks/useWatchHistory";
import { findVideo } from "@/lib/media-lookup";
import { historyEntryForVideo } from "@/lib/history-entry";

export type PreviewMode = "mouse" | "touch";

const ORIGIN = "https://www.youtube-nocookie.com";
const CROP = 120;
const ENDED = 0;
const PLAYING = 1;

// Progress bar, as on YouTube: mouse 5px line, lifted by 10px with 12px insets on hover, 28px hit area;
// touch 3px line flush with the bottom edge, 28px hit area reaching 7px below it; playhead 12px (16px dragging)
const BAR = {
  mouse: { line: 5, lift: 10, inset: 12 },
  touch: { line: 3, lift: 0, inset: 0 },
} as const;
// While dragging, the video follows at most this often (allowSeekAhead off), then seeks fully on release
const LIVE_SEEK_MS = 250;
// Played this many seconds in the card: it goes into History
const HISTORY_AFTER_S = 5;

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

// YouTube's own volume icons (as on youtube.com's inline player)
const VOLUME_ON =
  "M11.485 2.143 3.913 6.687A6 6 0 001 11.832v.338a6 6 0 002.913 5.144l7.572 4.543A1 1 0 0013 21V3a1.001 1.001 0 00-1.515-.857Zm6.88 2.079a1 1 0 00-.001 1.414 9 9 0 010 12.728 1 1 0 001.414 1.414 11 11 0 000-15.556 1 1 0 00-1.413 0Zm-2.83 2.828a1 1 0 000 1.415 5 5 0 010 7.07 1 1 0 001.415 1.415 6.999 6.999 0 000-9.9 1 1 0 00-1.415 0Z";
const VOLUME_OFF =
  "M11.485 2.143 3.913 6.687A6 6 0 001 11.832v.338a6 6 0 002.913 5.144l7.572 4.543A1 1 0 0013 21V3a1.001 1.001 0 00-1.515-.857Zm9.808 6.15L19 10.586l-2.293-2.293a1 1 0 10-1.414 1.414L17.586 12l-2.293 2.293a1 1 0 101.414 1.414L19 13.414l2.293 2.293a1 1 0 101.414-1.414L20.414 12l2.293-2.293a1 1 0 10-1.414-1.414Z";

export default function PreviewLayer({
  videoId,
  title,
  rounded,
  mode,
  startMuted,
  onMutedChange,
  timeRef,
  onDone,
}: {
  videoId: string;
  title: string;
  rounded: string;
  mode: PreviewMode;
  /** Read once: the URL is fixed for this preview (changing it would reload the player) */
  startMuted: boolean;
  onMutedChange: (muted: boolean) => void;
  timeRef: React.MutableRefObject<number>;
  onDone: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });
  // Fixed for this preview: it's in the URL, and changing that would reload the player
  const [initialMuted] = useState(startMuted);
  // Where the video was left last time (watched before): the preview goes on from there
  const [startAt] = useState(() => resumeTime(videoId));
  const [saver] = useState(() => progressSaver(videoId, startAt));
  const [muted, setMuted] = useState(initialMuted);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(startAt ?? 0);
  const [duration, setDuration] = useState(0);
  const [loaded, setLoaded] = useState(0);
  // Progress bar: the hovered (mouse) and dragged positions, 0-1
  const [hoverAt, setHoverAt] = useState<number | null>(null);
  const [dragAt, setDragAt] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);
  // Touch: where the finger went down on the bar, until it moves sideways (then it's a drag that seeks)
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const draggedRef = useRef(false);
  const liveSeekRef = useRef(0);
  // After a seek, YouTube reports the old time for a moment: don't jump back
  const seekRef = useRef<{ to: number; until: number } | null>(null);
  // Seconds actually played (not skipped by seeking), for History
  const watchRef = useRef({ played: false, last: null as number | null, total: 0, recorded: false, duration: 0 });

  // The card's own time starts where the video was left (opening the video goes on from there)
  useEffect(() => {
    if (startAt) timeRef.current = startAt;
    return () => saver.flush();
  }, [saver, startAt, timeRef]);

  const command = (func: string, args: unknown[] = []) =>
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), ORIGIN);

  // Handshake: YouTube only reports to the page after it says it's listening
  useEffect(() => {
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const ping = () => {
      if (readyRef.current || tries++ >= 40) return;
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: videoId }), ORIGIN);
      timer = setTimeout(ping, 250);
    };
    ping();
    return () => clearTimeout(timer);
  }, [videoId]);

  useEffect(() => {
    const send = (func: string, args: unknown[] = []) =>
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), ORIGIN);
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== ORIGIN || !iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      let d;
      try {
        d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      if ((d?.event === "onReady" || d?.event === "initialDelivery") && !readyRef.current) {
        readyRef.current = true;
        send("addEventListener", ["onAutoplayBlocked"]);
        send("playVideo");
        return;
      }
      if (d?.event === "onAutoplayBlocked") {
        // Sound not allowed yet (nothing clicked on the page): play muted
        setMuted(true);
        send("mute");
        send("playVideo");
        return;
      }
      if (d?.event === "onError") {
        onDoneRef.current();
        return;
      }
      const info = d?.info;
      if (!info) return;
      if (typeof info.currentTime === "number") {
        const seek = seekRef.current;
        if (seek && Date.now() < seek.until && Math.abs(info.currentTime - seek.to) > 1.5) {
          // Still the time from before the seek
        } else {
          seekRef.current = null;
          timeRef.current = info.currentTime;
          setTime(info.currentTime);
          const w = watchRef.current;
          if (w.played) {
            const t = info.currentTime;
            if (w.last !== null && t > w.last && t - w.last < 2) w.total += t - w.last;
            w.last = t;
            if (!w.recorded && w.total >= HISTORY_AFTER_S) {
              w.recorded = true;
              const video = findVideo(videoId);
              if (video) recordWatch(historyEntryForVideo(video));
            }
            saver.update(t, w.duration);
          }
        }
      }
      if (typeof info.duration === "number" && info.duration > 0) {
        watchRef.current.duration = info.duration;
        setDuration(info.duration);
      }
      if (typeof info.videoLoadedFraction === "number") setLoaded(info.videoLoadedFraction);
      if (info.playerState === PLAYING) {
        watchRef.current.played = true;
        setPlaying(true);
      }
      // At the end, go back to the thumbnail (YouTube's end screen never shows); watched to the end
      else if (info.playerState === ENDED) {
        const d = watchRef.current.duration;
        saver.update(d, d, true);
        onDoneRef.current();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [timeRef, saver, videoId]);

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !muted;
    command(next ? "mute" : "unMute");
    setMuted(next);
    onMutedChange(next);
  };

  // ── Progress bar ──
  const mouse = mode === "mouse";
  const bar = BAR[mode];
  const lifted = mouse && (hoverAt !== null || dragAt !== null);
  const inset = lifted ? bar.inset : 0;
  // The position under the pointer, along the bar (where it is when lifted)
  const positionAt = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - rect.left - bar.inset) / (rect.width - bar.inset * 2)));
  };
  const timeAt = (fraction: number) => Math.min(fraction * duration, Math.max(0, duration - 0.5)); // the very end would close it
  const scrubTo = (fraction: number) => {
    dragRef.current = fraction;
    setDragAt(fraction);
    // The video follows the playhead, without loading more than it has
    const now = Date.now();
    if (duration && now - liveSeekRef.current > LIVE_SEEK_MS) {
      liveSeekRef.current = now;
      command("seekTo", [timeAt(fraction), false]);
    }
  };
  const endDrag = (seek: boolean) => {
    const fraction = dragRef.current;
    dragRef.current = null;
    setDragAt(null);
    if (!seek || fraction === null || !duration) return;
    const to = timeAt(fraction);
    seekRef.current = { to, until: Date.now() + 2000 };
    timeRef.current = to;
    setTime(to);
    command("seekTo", [to, true]);
  };

  const played = dragAt ?? (duration ? Math.min(1, time / duration) : 0);
  const percent = (f: number) => `${f * 100}%`;
  // Along the bar, in the layer's coordinates
  const along = (f: number) => `calc(${inset}px + (100% - ${inset * 2}px) * ${f})`;
  const lineBottom = lifted ? bar.lift : 0;
  const headSize = dragAt !== null ? 16 : 12;
  const showHead = !mouse || lifted;

  return (
    <div className="pointer-events-none absolute inset-0 z-[1]" data-preview={videoId}>
      {/* The video, cut to the thumbnail's shape; the progress line is drawn inside it */}
      <div className={cn("absolute inset-0 overflow-hidden", rounded)}>
        <iframe
          ref={iframeRef}
          src={`${ORIGIN}/embed/${videoId}?autoplay=1${startAt ? `&start=${Math.floor(startAt)}` : ""}&mute=${initialMuted ? 1 : 0}&controls=0&disablekb=1&fs=0&rel=0&iv_load_policy=3&playsinline=1&cc_load_policy=0&enablejsapi=1`}
          title={`Preview: ${title}`}
          allow="autoplay; encrypted-media; picture-in-picture"
          tabIndex={-1}
          aria-hidden="true"
          className={cn("absolute left-0 w-full border-0 transition-opacity duration-200", playing ? "opacity-100" : "opacity-0")}
          style={{ top: -CROP, height: `calc(100% + ${CROP * 2}px)` }}
        />
        {playing && (
          <>
            {/* Mouse: the bottom darkens while the bar is hovered */}
            {mouse && (
              <div
                className={cn(
                  "absolute inset-x-0 bottom-0 h-7 bg-gradient-to-b from-transparent to-black/50 transition-opacity duration-100",
                  lifted ? "opacity-100" : "opacity-0"
                )}
              />
            )}
            <div
              data-preview-bar=""
              className="absolute transition-[left,right,bottom] duration-100 ease-out"
              style={{ left: inset, right: inset, bottom: lineBottom, height: bar.line }}
            >
              <div className={cn("relative h-full w-full overflow-hidden", lifted && "rounded-[2.5px]")}>
                <div className="absolute inset-0 bg-white/30" />
                <div className="absolute inset-y-0 left-0 bg-white/60" style={{ width: percent(loaded) }} />
                {lifted && hoverAt !== null && dragAt === null && (
                  <div className="absolute inset-y-0 left-0 bg-white/70" style={{ width: percent(hoverAt) }} />
                )}
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 bg-[linear-gradient(90deg,#f03_80%,#ff2791)]",
                    dragAt === null && "transition-[width] duration-200 ease-linear"
                  )}
                  style={{ width: percent(played) }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {playing && (
        <>
          {/* Volume, top right: YouTube's plain white icon, with a dark circle behind it on hover */}
          <button
            type="button"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={toggleMute}
            className="group/volume pointer-events-auto absolute right-1 top-1 flex h-12 w-12 items-center justify-center text-white focus-visible:outline-none"
          >
            <span
              aria-hidden="true"
              className="absolute inset-1 rounded-full bg-black/60 opacity-0 transition-opacity duration-100 group-focus-visible/volume:opacity-100 can-hover:group-hover/volume:opacity-100"
            />
            <svg viewBox="0 0 24 24" className="relative h-6 w-6 drop-shadow-[0_0_2px_rgba(0,0,0,0.45)]" fill="currentColor" aria-hidden="true">
              <path d={muted ? VOLUME_OFF : VOLUME_ON} />
            </svg>
          </button>

          {/* Time left (hidden while the bar shows the time being picked) */}
          {duration > 0 && !lifted && dragAt === null && (
            <span className="absolute bottom-2 right-1.5 rounded bg-black/80 px-1 py-px text-xs font-medium leading-[18px] text-white">
              {formatTime(duration - time)}
            </span>
          )}

          {/* Playhead: on the lifted bar (mouse), or always, straddling the bottom edge (touch) */}
          <div
            data-preview-head=""
            className="absolute h-4 w-4 rounded-full bg-[#f03]"
            style={{
              // Moves with the red line; follows the pointer exactly while dragging
              transition: dragAt === null ? "transform 100ms, bottom 100ms, left 200ms linear" : "transform 100ms",
              left: mouse ? along(played) : `clamp(6px, ${percent(played)}, calc(100% - 6px))`,
              bottom: lineBottom + bar.line / 2,
              transform: `translate(-50%, 50%) scale(${showHead ? headSize / 16 : 0})`,
            }}
          />

          {/* Where the pointer or finger takes the bar: 28px tall (reaching below the edge on touch) */}
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-auto absolute inset-x-0 h-7 cursor-pointer",
              // Touch: vertical swipes still scroll the page; sideways drags seek
              mouse ? "bottom-0" : "-bottom-[7px] touch-pan-y"
            )}
            onPointerEnter={mouse ? (e) => setHoverAt(positionAt(e)) : undefined}
            onPointerMove={(e) => {
              const at = positionAt(e);
              if (mouse) setHoverAt(at);
              const touch = touchRef.current;
              if (touch && dragRef.current === null) {
                // Touch: a sideways drag seeks; anything else is a tap or the page scrolling
                const dx = Math.abs(e.clientX - touch.x);
                if (dx < 8 || dx < Math.abs(e.clientY - touch.y)) return;
                touchRef.current = null;
                draggedRef.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                liveSeekRef.current = 0;
              }
              if (dragRef.current !== null || touch) scrubTo(at);
            }}
            onPointerLeave={mouse ? () => setHoverAt(null) : undefined}
            onPointerDown={(e) => {
              if (e.pointerType === "mouse" && e.button !== 0) return;
              e.stopPropagation();
              draggedRef.current = false;
              if (e.pointerType !== "mouse") {
                // Touch: wait to see whether it's a sideways drag (seek) or a tap (open the video)
                touchRef.current = { x: e.clientX, y: e.clientY };
                return;
              }
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              liveSeekRef.current = 0;
              scrubTo(positionAt(e));
            }}
            onPointerUp={(e) => {
              touchRef.current = null;
              if (dragRef.current === null) return;
              e.stopPropagation();
              endDrag(true);
            }}
            // The page took the touch to scroll: no seek
            onPointerCancel={() => {
              touchRef.current = null;
              draggedRef.current = false;
              endDrag(false);
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Touch: a tap here opens the video, as anywhere else on the card (a drag seeked instead)
              if (!mouse && !draggedRef.current)
                e.currentTarget.closest("[data-inline-preview]")?.querySelector<HTMLAnchorElement>("a[href]")?.click();
              draggedRef.current = false;
            }}
            onContextMenu={(e) => e.preventDefault()}
          />

          {/* The time being picked: over the pointer while hovering, in the middle while dragging (as on YouTube) */}
          {duration > 0 && (dragAt !== null || (lifted && hoverAt !== null)) && (
            <span
              className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded-2xl bg-black/60 px-4 py-2 text-sm font-medium leading-[18px] text-white"
              style={
                dragAt !== null
                  ? { left: "50%", bottom: 48 }
                  : { left: `clamp(32px, ${along(hoverAt!)}, calc(100% - 32px))`, bottom: 24 }
              }
            >
              {formatTime(timeAt(dragAt ?? hoverAt!))}
            </span>
          )}
        </>
      )}
    </div>
  );
}
