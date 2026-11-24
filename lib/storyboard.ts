// lib/storyboard.ts
// YouTube's storyboards: the small frames of a video shown while its progress bar is hovered or dragged
// (components/storyboard.tsx draws them). YouTube keeps them as sheets of frames in up to four sizes (levels):
//   L0  48×27, one sheet of 100 frames for the whole video (25 KB): loaded first, so a frame shows at once
//   L1  80×45, L2 160×90, L3 320×180: a frame every 1–10 s, 100 / 25 / 9 frames to a sheet
// Their links are signed, so they come from lib/storyboard-data.ts (made by scripts/storyboards.mjs). That file and
// a video's first sheet are only loaded when its progress bar is first used. Related videos' moving thumbnails use
// them too (components/moving-thumbnail.tsx).

export interface StoryboardLevel {
  width: number;
  height: number;
  /** Frames in the whole video */
  count: number;
  /** Frames in a full sheet */
  cols: number;
  rows: number;
  /** Milliseconds between frames; 0: the frames are spread over the whole video */
  interval: number;
  /** A sheet's link, with "$M" for its number */
  url: string;
}
export interface Storyboard {
  videoId: string;
  levels: StoryboardLevel[];
  /** Width / height of the frames */
  aspect: number;
}
/** One frame: its sheet, and where it is on it */
export interface StoryboardFrameAt {
  url: string;
  sheet: number;
  sheets: number;
  cols: number;
  rows: number;
  col: number;
  row: number;
}

export function parseStoryboard(videoId: string, spec: string): Storyboard | null {
  const [sqp, ...parts] = spec.split("|");
  const levels = parts.map((part, i): StoryboardLevel => {
    const [width, height, count, cols, rows, interval, name, sigh] = part.split("#");
    return {
      width: +width,
      height: +height,
      count: +count,
      cols: +cols,
      rows: +rows,
      interval: +interval,
      url: `https://i.ytimg.com/sb/${videoId}/storyboard3_L${i}/${name}.jpg?sqp=${sqp}&sigh=${encodeURIComponent(sigh)}`,
    };
  });
  if (!levels.length || levels.some((l) => !(l.count > 0 && l.cols > 0 && l.rows > 0))) return null;
  const last = levels[levels.length - 1];
  return { videoId, levels, aspect: last.width / last.height };
}

/** Frame number `index` (0 is the first) of a level. */
function frameNumber(l: StoryboardLevel, index: number): StoryboardFrameAt {
  const perSheet = l.cols * l.rows;
  const sheet = Math.floor(index / perSheet);
  const inSheet = index - sheet * perSheet;
  // The last sheet is only as big as the frames left for it
  const frames = Math.min(perSheet, l.count - sheet * perSheet);
  return {
    url: l.url.replace("$M", String(sheet)),
    sheet,
    sheets: Math.ceil(l.count / perSheet),
    cols: Math.min(l.cols, frames),
    rows: Math.ceil(frames / l.cols),
    col: inSheet % l.cols,
    row: Math.floor(inSheet / l.cols),
  };
}

/** The frame at `time` seconds. `level` is the size wanted; videos without it use their largest. */
export function frameAt(board: Storyboard, level: number, time: number, duration: number): StoryboardFrameAt {
  const l = board.levels[Math.min(level, board.levels.length - 1)];
  const at = l.interval > 0 ? (time * 1000) / l.interval : duration > 0 ? (time / duration) * l.count : 0;
  return frameNumber(l, Math.min(l.count - 1, Math.max(0, Math.floor(at))));
}

/**
 * The frames of a moving thumbnail, in order: up to three sheets of the largest size (320×180), from different
 * parts of the video, at most nine frames each.
 */
export function movingFrames(board: Storyboard): StoryboardFrameAt[] {
  const l = board.levels[board.levels.length - 1];
  const perSheet = l.cols * l.rows;
  const sheets = Math.ceil(l.count / perSheet);
  const frames: StoryboardFrameAt[] = [];
  for (const sheet of new Set([0.2, 0.5, 0.8].map((part) => Math.floor(sheets * part)))) {
    const first = sheet * perSheet;
    const inSheet = Math.min(perSheet, l.count - first);
    const step = Math.max(1, Math.floor(inSheet / 9));
    for (let i = 0; i < inSheet; i += step) frames.push(frameNumber(l, first + i));
  }
  return frames;
}

/** Background styles that draw one frame over the whole element, whatever its size. */
export function frameBackground(f: StoryboardFrameAt) {
  const along = (i: number, n: number) => (n > 1 ? (i / (n - 1)) * 100 : 0);
  return {
    image: `url("${f.url}")`,
    size: `${f.cols * 100}% ${f.rows * 100}%`,
    position: `${along(f.col, f.cols)}% ${along(f.row, f.rows)}%`,
  };
}

const fetched = new Map<string, Promise<boolean>>();
/** Download a sheet ahead of use; resolves to whether it loaded. */
export function loadSheet(url: string): Promise<boolean> {
  let p = fetched.get(url);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => {
        fetched.delete(url); // offline: try again next time
        resolve(false);
      };
      img.src = url;
    });
    fetched.set(url, p);
  }
  return p;
}

const boards = new Map<string, Promise<Storyboard | null>>();
/** The video's storyboard without any of its sheets; null when it has none. */
export function storyboardOf(videoId: string): Promise<Storyboard | null> {
  let p = boards.get(videoId);
  if (!p) {
    p = import("@/lib/storyboard-data")
      .then(({ storyboards }) => (storyboards[videoId] ? parseStoryboard(videoId, storyboards[videoId]) : null))
      .catch(() => {
        boards.delete(videoId); // offline: try again next time
        return null;
      });
    boards.set(videoId, p);
  }
  return p;
}

/** The video's storyboard, once its first small sheet has loaded; null when it has none (or it can't load). */
export async function loadStoryboard(videoId: string): Promise<Storyboard | null> {
  const board = await storyboardOf(videoId);
  return board && (await loadSheet(board.levels[0].url.replace("$M", "0"))) ? board : null;
}
