// Makes the pictures shared links show (public/og, 1200x630) and the app's icons (public/icons). Run it after adding a channel, a
// scholar or a category:  npm run og
// It draws them in Chrome (Playwright, already used for the tests), so names in any language come out right.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const data = async (path) => `data:image/png;base64,${(await readFile(new URL(path, root))).toString("base64")}`;
const logo = await data("public/DeeniTubeLogo-dark.png");

// name, slug and picture of the channels and scholars, as they stand in their files
const people = async (path) => [...(await read(path)).matchAll(/name:\s*"([^"]+)",\s*slug:\s*"([^"]+)",\s*avatar:\s*"([^"]+)"/g)].map(([, name, slug, avatar]) => ({ name, slug, avatar: avatar.replace(/=s\d+-/, "=s400-") }));
const categories = [...new Set([...(await read("lib/video-data.ts")).matchAll(/^\s+category:\s*"([^"]+)"/gm)].map((m) => m[1]))];

const cards = [
  { file: "default", title: "Authentic Islamic videos", sub: "From trusted scholars, in Bangla and English" },
  { file: "shorts", title: "Islamic Shorts", sub: "Short reminders from trusted scholars" },
  { file: "channels", title: "Islamic channels", sub: "Lectures, Quran, hadith and more" },
  { file: "scholars", title: "Islamic scholars", sub: "Their lectures, Shorts and playlists" },
  { file: "categories", title: "Browse by topic", sub: "Quran, hadith, dua, fiqh, aqeedah and more" },
  { file: "playlists", title: "Islamic playlists", sub: "Series to watch in order" },
  { file: "donate", title: "Support Deeni.tube", sub: "Help bring authentic knowledge to more people" },
  { file: "help", title: "Deeni.tube help", sub: "Getting started, guidelines, privacy and terms" },
  ...categories.map((c) => ({ file: `category-${c.toLowerCase().replace(/\s+/g, "-")}`, title: c, sub: "Authentic Islamic videos" })),
  ...(await people("lib/channel-data.ts")).map((p) => ({ file: `channel-${p.slug}`, title: p.name, sub: "Channel on Deeni.tube", avatar: p.avatar })),
  ...(await people("lib/scholar-data.ts")).map((p) => ({ file: `scholar-${p.slug}`, title: p.name, sub: "Scholar on Deeni.tube", avatar: p.avatar })),
];

const html = ({ title, sub, avatar }) => `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Noto+Sans+Bengali:wght@400;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0 }
  body { width: 1200px; height: 630px; font-family: Roboto, "Noto Sans Bengali", sans-serif; color: #fff; background: radial-gradient(900px 600px at 100% 0, #17795c 0, transparent 70%), linear-gradient(135deg, #0c3b2e, #06231b); display: flex; flex-direction: column; justify-content: space-between; padding: 72px }
  main { flex: 1; display: flex; align-items: center; gap: 56px }
  img.a { width: 280px; height: 280px; border-radius: 50%; object-fit: cover; border: 8px solid rgba(255, 255, 255, .14); flex: none }
  h1 { font-weight: 700; font-size: ${avatar ? (title.length > 28 ? 62 : 74) : 92}px; line-height: 1.12; letter-spacing: -.01em; text-wrap: balance }
  p { font-size: 36px; line-height: 1.35; margin-top: 22px; color: rgba(255, 255, 255, .82) }
  footer { display: flex; align-items: center; justify-content: space-between }
  footer img { height: 64px }
  footer span { width: 160px; height: 8px; border-radius: 4px; background: #e8b33c }
</style>
<main>${avatar ? `<img class="a" src="${avatar}">` : ""}<div><h1>${title}</h1><p>${sub}</p></div></main>
<footer><img src="${logo}"><span></span></footer>`;

await mkdir(new URL("public/og/", root), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const card of cards) {
  await page.setContent(html(card), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (card.avatar && !(await page.evaluate(() => document.querySelector("img.a").naturalWidth))) throw new Error(`no picture for ${card.file}`);
  await writeFile(new URL(`public/og/${card.file}.jpg`, root), await sharp(await page.screenshot()).jpeg({ quality: 84, mozjpeg: true }).toBuffer());
}

// The icons: the mark of the logo
const MARK = { left: 0, top: 0, width: 238, height: 170 };
const mark = await sharp(new URL("public/DeeniTubeLogo.png", root).pathname).extract(MARK).png().toBuffer();
const icon = async (file, size, share) => {
  const art = await sharp(mark).resize(Math.round(size * share), Math.round(size * share), { fit: "contain", kernel: "lanczos3", background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: "#ffffff" } }).composite([{ input: art, gravity: "centre" }]).png({ compressionLevel: 9 }).toFile(new URL(`public/icons/${file}`, root).pathname);
};
await mkdir(new URL("public/icons/", root), { recursive: true });
await icon("icon-192.png", 192, 0.86);
await icon("icon-512.png", 512, 0.86);
await icon("icon-maskable-512.png", 512, 0.62);
await browser.close();
console.log(`${cards.length} cards`);
