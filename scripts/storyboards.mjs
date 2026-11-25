// Fetches each video's storyboard (the frames YouTube shows while you hover or drag a progress bar) and writes
// lib/storyboard-data.ts, the colour of each thumbnail (the hover colour of related videos), lib/thumb-tints.ts, and
// which captions each video and short has, lib/caption-data.ts, the shorts that aren't 9:16, lib/short-ratios.ts, and when each was
// published, lib/media-meta.ts.
// Run it after adding videos to lib/video-data.ts or shorts to lib/shorts-data.ts:
//   npm run storyboards            only videos that have none yet
//   npm run storyboards -- --all   all of them again (YouTube makes captions for a new video some hours later)
// YouTube's storyboard images need a signed link, which is on the video's watch page (`playerStoryboardSpecRenderer`).
// The links don't expire: they are made when the video is processed and stay the same.
import { readFile, writeFile } from "node:fs/promises";

const OUT = new URL("../lib/storyboard-data.ts", import.meta.url);
const TINTS = new URL("../lib/thumb-tints.ts", import.meta.url);
const CAPTIONS = new URL("../lib/caption-data.ts", import.meta.url);
const META = new URL("../lib/media-meta.ts", import.meta.url);
const RATIOS = new URL("../lib/short-ratios.ts", import.meta.url);
const VIDEOS = new URL("../lib/video-data.ts", import.meta.url);
const SHORTS = new URL("../lib/shorts-data.ts", import.meta.url);
const all = process.argv.includes("--all");

const ids = [...new Set([...(await readFile(VIDEOS, "utf8")).matchAll(/videoId:\s*"([\w-]{11})"/g)].map((m) => m[1]))];
const known = {};
try {
  for (const [, id, spec] of (await readFile(OUT, "utf8")).matchAll(/"([\w-]{11})":\s*"([^"]+)"/g)) known[id] = spec;
} catch {}

async function fetchPage(id) {
  const res = await fetch(`https://www.youtube.com/watch?v=${id}`, {
    headers: { "accept-language": "en", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function fetchSpec(id) {
  const spec = (await fetchPage(id)).match(/"playerStoryboardSpecRenderer":\{"spec":"([^"]+)"/)?.[1];
  if (!spec) throw new Error("no storyboard on its page");
  // Kept without the parts that are the same for every video: "<sqp>|w#h#count#cols#rows#ms#name#sigh|…"
  const [url, ...levels] = spec.replaceAll("\\u0026", "&").split("|");
  const base = `https://i.ytimg.com/sb/${id}/storyboard3_L$L/$N.jpg?sqp=`;
  if (!url.startsWith(base)) throw new Error(`unexpected link ${url}`);
  return [url.slice(base.length), ...levels].join("|");
}

// A video's captions: their languages ("a." before one that YouTube wrote itself), YouTube's choice first; "" for none
async function fetchCaptions(id) {
  const page = await fetchPage(id);
  if (!page.includes('"playabilityStatus":{"status":"OK"')) throw new Error("its page didn't come");
  const start = page.indexOf('"playerCaptionsTracklistRenderer":');
  if (start < 0) return "";
  // The object after it, up to its closing bracket (there are no brackets in its texts)
  let end = page.indexOf("{", start);
  const open = end;
  for (let depth = 0; end < page.length; end++) {
    if (page[end] === "{") depth++;
    else if (page[end] === "}" && --depth === 0) break;
  }
  const list = JSON.parse(page.slice(open, end + 1));
  const tracks = (list.captionTracks ?? []).map((t) => (t.kind === "asr" ? "a." : "") + t.languageCode);
  const first = tracks[list.audioTracks?.[list.defaultAudioTrackIndex ?? 0]?.defaultCaptionTrackIndex ?? 0];
  return [...new Set([first, ...tracks].filter(Boolean))].join(" ");
}

// YouTube's hover colours are the thumbnail's main hue at 53% lightness, in three strengths (measured)
async function fetchTint(id) {
  const { default: sharp } = await import("sharp");
  const res = await fetch(`https://i.ytimg.com/vi/${id}/mqdefault.jpg`);
  if (!res.ok) throw new Error(`thumbnail HTTP ${res.status}`);
  const data = await sharp(Buffer.from(await res.arrayBuffer())).resize(64, 36, { fit: "fill" }).removeAlpha().raw().toBuffer();
  const bins = new Array(36).fill(0); // 10° of hue each, colourful pixels counting more
  let chroma = 0;
  for (let i = 0; i < data.length; i += 3) {
    const [r, g, b] = [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255];
    const max = Math.max(r, g, b);
    const c = max - Math.min(r, g, b);
    chroma += c / (data.length / 3);
    if (c < 0.12) continue;
    const h = max === r ? ((g - b) / c + 6) % 6 : max === g ? (b - r) / c + 2 : (r - g) / c + 4;
    bins[Math.floor(h * 6) % 36] += c * c;
  }
  if (chroma < 0.08) return "0 0%";
  const smooth = bins.map((v, i) => v + 0.6 * (bins[(i + 1) % 36] + bins[(i + 35) % 36]));
  const top = smooth.indexOf(Math.max(...smooth));
  let x = 0;
  let y = 0;
  for (let k = -2; k <= 2; k++) {
    const bin = (top + k + 36) % 36;
    x += bins[bin] * Math.cos(((bin * 10 + 5) * Math.PI) / 180);
    y += bins[bin] * Math.sin(((bin * 10 + 5) * Math.PI) / 180);
  }
  return `${Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360)} ${chroma < 0.25 ? 55 : 75}%`;
}

const knownTints = {};
try {
  for (const [, id, tint] of (await readFile(TINTS, "utf8")).matchAll(/"([\w-]{11})":\s*"([^"]+)"/g)) knownTints[id] = tint;
} catch {}
const tints = {};
for (const id of ids) {
  if (knownTints[id] && !all) {
    tints[id] = knownTints[id];
    continue;
  }
  try {
    tints[id] = await fetchTint(id);
  } catch (e) {
    if (knownTints[id]) tints[id] = knownTints[id];
    console.log("NO TINT", id, e.message);
  }
}

const result = {};
for (const id of ids) {
  if (known[id] && !all) {
    result[id] = known[id];
    continue;
  }
  try {
    result[id] = await fetchSpec(id);
    console.log("ok     ", id);
  } catch (e) {
    if (known[id]) result[id] = known[id];
    console.log("FAILED ", id, e.message, known[id] ? "(kept the old one)" : "");
  }
  await new Promise((r) => setTimeout(r, 400));
}

await writeFile(
  OUT,
  `// lib/storyboard-data.ts
// Generated by scripts/storyboards.mjs (npm run storyboards): don't edit. Each video's YouTube storyboard, read by
// lib/storyboard.ts, which loads this file only when a progress bar is first hovered or dragged.
export const storyboards: Record<string, string> = {
${Object.entries(result).map(([id, spec]) => `  "${id}": "${spec}",`).join("\n")}
};
`
);
await writeFile(
  TINTS,
  `// lib/thumb-tints.ts
// Generated by scripts/storyboards.mjs (npm run storyboards): don't edit. The main colour of each video's thumbnail
// (hue and saturation): a related video's row takes it on hover, as on YouTube (components/related-videos.tsx).
export const thumbTints: Record<string, string> = {
${Object.entries(tints).map(([id, tint]) => `  "${id}": "${tint}",`).join("\n")}
};
`
);

const shortIds = [...(await readFile(SHORTS, "utf8")).matchAll(/\b(?:videoId|id):\s*"([\w-]{11})"/g)].map((m) => m[1]);
const knownCaptions = {};
try {
  for (const [, id, list] of (await readFile(CAPTIONS, "utf8")).matchAll(/"([\w-]{11})":\s*"([^"]*)"/g)) knownCaptions[id] = list;
} catch {}
const captions = {};
for (const id of new Set([...ids, ...shortIds])) {
  if (id in knownCaptions && !all) {
    captions[id] = knownCaptions[id];
    continue;
  }
  try {
    captions[id] = await fetchCaptions(id);
    console.log("captions", id, captions[id] || "none");
  } catch (e) {
    if (id in knownCaptions) captions[id] = knownCaptions[id];
    console.log("NO CAPTIONS", id, e.message);
  }
  await new Promise((r) => setTimeout(r, 700));
}
await writeFile(
  CAPTIONS,
  `// lib/caption-data.ts
// Generated by scripts/storyboards.mjs (npm run storyboards): don't edit. The captions each video has on YouTube: their
// languages, YouTube's choice first ("a." before one that YouTube wrote itself); "" for none. Read by lib/captions.ts.
export const captionData: Record<string, string> = {
${Object.entries(captions).map(([id, list]) => `  "${id}": "${list}",`).join("\n")}
};
`
);
// The shape of each short's first frame (YouTube's frame0.jpg)
const { default: sharp } = await import("sharp");
const ratios = {};
for (const id of shortIds) {
  try {
    const res = await fetch(`https://i.ytimg.com/vi/${id}/frame0.jpg`);
    const { width, height } = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
    if (res.ok && Math.abs(width / height - 9 / 16) > 0.02) ratios[id] = Math.round((width / height) * 100) / 100;
  } catch (e) {
    console.log("NO SHAPE", id, e.message);
  }
}
const oldRatios = await readFile(RATIOS, "utf8");
await writeFile(RATIOS, oldRatios.replace(/= \{\n[^}]*\};/, `= {\n${Object.entries(ratios).map(([id, r]) => `  "${id}": ${r},`).join("\n")}\n};`));

// When each was published, and whether YouTube has a 1280x720 picture of it
const oldMeta = await readFile(META, "utf8");
const knownMeta = Object.fromEntries([...oldMeta.matchAll(/"([\w-]{11})":\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]));
const meta = {};
for (const id of new Set([...ids, ...shortIds])) {
  if (knownMeta[id] && !all) {
    meta[id] = knownMeta[id];
    continue;
  }
  try {
    const date = (await fetchPage(id)).match(/"(?:uploadDate|publishDate)":"([^"]+)"/)?.[1];
    if (!date) throw new Error("no date on its page");
    const large = (await fetch(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`, { method: "HEAD" })).ok;
    meta[id] = date + (large ? "" : " small");
  } catch (e) {
    if (knownMeta[id]) meta[id] = knownMeta[id];
    console.log("NO DATE", id, e.message);
  }
  await new Promise((r) => setTimeout(r, 700));
}
await writeFile(META, oldMeta.replace(/= \{\n[^}]*\};/, `= {\n${Object.entries(meta).map(([id, m]) => `  "${id}": "${m}",`).join("\n")}\n};`));

console.log(`${Object.keys(captions).length} videos and shorts, ${Object.values(captions).filter(Boolean).length} with captions`);
console.log(`${Object.keys(result).length} of ${ids.length} videos have a storyboard, ${Object.keys(tints).length} a colour`);
