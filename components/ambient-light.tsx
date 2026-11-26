// components/ambient-light.tsx
// Ambient mode's glow (lib/ambient), YouTube's, measured: the video's storyboard frame (80x45) on a 110x75 canvas, blurred
// 5px at 40%, stretched to 1.5 × 2 of the player behind it, or in theater mode to twice the video, at its sides; in the
// light theme (theater mode only) one flat colour of the frame at 24%. Each new frame fades in over 5 seconds over the one
// before. At the top of the page it shows through the header, which fills in over the first 28px of scrolling. A video
// without a storyboard: its thumbnail. First in `.watch-frame` ("Ambient mode" in app/globals.css).
"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useMediaQuery } from "@/hooks/use-media-query";
import { onAmbientTime, useAmbient } from "@/lib/ambient";
import { youtubeThumb } from "@/lib/media-lookup";
import { frameAt, storyboardOf, type Storyboard } from "@/lib/storyboard";
import { THEATER_SCREENS, useTheater } from "@/lib/theater";
import { THEME_COLORS } from "@/lib/theme-colors";

const [W, H] = [110, 75];
const FRAME = { x: 15, y: 15, w: 80, h: 45 };
const FADE_MS = 5000;
const SEEK_FADE_MS = 1000;
const HEADER_FADE_PX = 28;

const pictures = new Map<string, Promise<HTMLImageElement | null>>();
function picture(url: string) {
  let p = pictures.get(url);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        pictures.delete(url); // offline: try again next time
        resolve(null);
      };
      img.src = url;
    });
    pictures.set(url, p);
  }
  return p;
}

export function AmbientLight({ videoId }: { videoId: string }) {
  const theater = useTheater();
  const dark = useTheme().resolvedTheme === "dark";
  const on = useAmbient();
  const active = useMediaQuery(THEATER_SCREENS) && on && (dark || theater);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const topRef = useRef<HTMLCanvasElement>(null);

  // The page: see-through at the top so the glow shows behind it and under the header
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    html.dataset.ambient = theater ? "theater" : "page";
    const headers = document.querySelectorAll<HTMLElement>(".app-bar");
    const onScroll = () => headers.forEach((h) => h.style.setProperty("--bar", String(Math.min(1, window.scrollY / HEADER_FADE_PX))));
    if (!theater) {
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    return () => {
      delete html.dataset.ambient;
      window.removeEventListener("scroll", onScroll);
      headers.forEach((h) => h.style.removeProperty("--bar"));
    };
  }, [active, theater]);

  useEffect(() => {
    const base = baseRef.current?.getContext("2d");
    const top = topRef.current?.getContext("2d");
    if (!active || !base || !top) return;
    const topEl = top.canvas;
    // Outside theater mode it only shows in the dark theme: that theme's page colour. Not read from the page: when the
    // theme changes this runs before the page has its new colours, and the glow covered the page in the old (white) one.
    const background = theater ? "#000" : THEME_COLORS.dark;
    // Safari's canvas can't blur: the canvas itself is blurred instead
    const blurs = "filter" in CanvasRenderingContext2D.prototype;
    const fill = (c: CanvasRenderingContext2D) => {
      c.globalAlpha = 1;
      if (blurs) c.filter = "none";
      c.fillStyle = background;
      c.fillRect(0, 0, W, H);
    };
    fill(base);
    fill(top);
    if (!blurs) for (const c of [base, top]) c.canvas.style.filter = `blur(${Math.round((c.canvas.clientWidth * 5) / W)}px)`;

    let board: Storyboard | null | undefined;
    let shown = "";
    let shownAt = 0;
    let lastTime = -1;
    let stopped = false;
    const draw = async (time: number, duration: number) => {
      const seeked = lastTime >= 0 && Math.abs(time - lastTime) > 3;
      lastTime = time;
      if (!seeked && performance.now() - shownAt < FADE_MS) return;
      if (board === undefined) {
        shownAt = performance.now(); // asked once
        board = await storyboardOf(videoId);
        if (stopped) return;
      }
      const level = board?.levels[Math.min(1, board.levels.length - 1)];
      const f = board && frameAt(board, 1, time, duration);
      const key = f ? `${f.url} ${f.col} ${f.row}` : "thumbnail";
      if (key === shown) return;
      const img = await picture(f ? f.url : youtubeThumb(videoId, "small"));
      if (stopped || !img || key === shown) return;
      // What shows now becomes the base; the new frame fades in over it (the first one at once from the page's own colour)
      base.globalAlpha = shown ? Number(getComputedStyle(topEl).opacity) : 0;
      base.drawImage(topEl, 0, 0);
      fill(top);
      const [sx, sy, sw, sh] = f && level ? [f.col * level.width, f.row * level.height, level.width, level.height] : [0, 0, img.naturalWidth, img.naturalHeight];
      top.globalAlpha = 0.4;
      if (blurs) top.filter = "blur(5px)";
      if (dark) {
        const w = Math.min(FRAME.w, (FRAME.h * sw) / sh);
        top.drawImage(img, sx, sy, sw, sh, FRAME.x + (FRAME.w - w) / 2, FRAME.y, w, FRAME.h);
      } else {
        // One colour: the frame made one pixel small (its pixels can't be read, the picture is YouTube's)
        const one = document.createElement("canvas");
        one.width = one.height = 1;
        const o = one.getContext("2d")!;
        o.imageSmoothingQuality = "high";
        o.drawImage(img, sx, sy, sw, sh, 0, 0, 1, 1);
        top.globalAlpha = 0.24;
        top.drawImage(one, 0, 0, W, H);
      }
      shown = key;
      shownAt = performance.now();
      topEl.style.transition = "none";
      topEl.style.opacity = "0";
      void topEl.offsetWidth;
      topEl.style.transition = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "none" : `opacity ${seeked ? SEEK_FADE_MS : FADE_MS}ms linear`;
      topEl.style.opacity = "1";
    };
    const off = onAmbientTime((at) => {
      if (at.videoId === videoId) void draw(at.time, at.duration);
    });
    return () => {
      stopped = true;
      off();
    };
  }, [active, theater, dark, videoId]);

  if (!active) return null;
  return (
    <div aria-hidden="true" className="ambient">
      <div className="ambient-box">
        <canvas ref={baseRef} width={W} height={H} />
        <canvas ref={topRef} width={W} height={H} />
      </div>
    </div>
  );
}
