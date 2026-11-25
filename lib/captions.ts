// lib/captions.ts
// Captions (subtitles) on the watch pages and Shorts. YouTube draws them in its own frame; this is what we know and
// tell it:
// - which ones a video has (lib/caption-data.ts), so a video without any says so, as on YouTube;
// - the visitor's choice, kept for the next video and the next visit, as on YouTube: on or off, the language, and
//   whether YouTube should translate into it. Saved in localStorage ('deeni-captions');
// - where to draw them. Our frames reach past the visible video (that cuts YouTube's own title bar, "More videos" and
//   logo off, see components/youtube-player.tsx), and captions stand at the bottom of the frame, so they were cut off too;
//   showing the whole frame for them brought YouTube's buttons back and put the captions under our controls. The embed's
//   `track` option takes a `position`, a box for the captions as parts of the frame: ours is the visible video, moved up
//   while the controls are there.
import { useMemo } from "react";
import { captionData } from "@/lib/caption-data";
import { createLocalStore, useLocalStore } from "@/lib/local-store";

/** A language of a video's captions; `auto`: YouTube wrote them itself */
export type CaptionTrack = { code: string; auto: boolean };
export type CaptionLanguage = { code: string; name: string };
/** `lang`: the visitor's language, none until they choose one. `translate`: also by having YouTube translate, `from` this one */
type CaptionPrefs = { on: boolean; lang?: string; translate?: boolean; from?: string };
/** The captions to show: a track, translated into `to` if set */
export type CaptionChoice = { track: CaptionTrack; to?: CaptionLanguage };

const OFF: CaptionPrefs = { on: false };
const store = createLocalStore<CaptionPrefs>("deeni-captions", () => OFF);
export const useCaptionPrefs = () => useLocalStore(store, OFF);
export const captionPrefs = store.get;
export const setCaptionsOn = (on: boolean) => store.set((p) => ({ ...p, on }));
export const chooseCaptions = (lang: string) => store.set(() => ({ on: true, lang }));
export const translateCaptions = (lang: string, from?: string) => store.set(() => ({ on: true, lang, translate: true, from }));

/** Captions in the cards' previews: on until switched off, as on YouTube (the language is the visitor's choice above) */
const previewStore = createLocalStore<{ on: boolean }>("deeni-preview-captions", () => ({ on: true }));
export const PREVIEW_CAPTIONS_ON = { on: true };
export const usePreviewCaptions = () => useLocalStore(previewStore, PREVIEW_CAPTIONS_ON).on;
export const setPreviewCaptions = (on: boolean) => previewStore.set(() => ({ on }));

/** The video's captions, YouTube's choice first; undefined for a video that isn't in the data */
export function captionTracks(videoId: string): CaptionTrack[] | undefined {
  const list = captionData[videoId];
  if (list === undefined) return undefined;
  return list ? list.split(" ").map((t) => (t.startsWith("a.") ? { code: t.slice(2), auto: true } : { code: t, auto: false })) : [];
}

let names: Intl.DisplayNames | null = null;
/** "Bangla", "English (United States)": YouTube's names */
export function languageName(code: string) {
  // YouTube still writes Hebrew's old code
  const id = code === "iw" ? "he" : code;
  let name: string | undefined = id;
  try {
    names ??= new Intl.DisplayNames(["en"], { type: "language", languageDisplay: "standard" });
    name = names.of(id);
  } catch {}
  return name && name !== id ? name : RARE[code] ?? code;
}
export const trackName = ({ code, auto }: CaptionTrack) => `${languageName(code)}${auto ? " (auto-generated)" : ""}`;
export const choiceName = ({ track, to }: CaptionChoice) => (to ? `${languageName(track.code)} >> ${to.name}` : trackName(track));

const base = (code: string) => code.split("-")[0];
/** What to show of these captions: the visitor's language if it's there (or translated, if they asked for that), else YouTube's choice */
export function pickCaptions(tracks: CaptionTrack[], { lang, translate, from }: CaptionPrefs, reported?: string): CaptionChoice | null {
  if (!tracks.length) return null;
  const first = (code: string) => tracks.find((t) => t.code === code) ?? tracks.find((t) => base(t.code) === base(code));
  const usual = (from && first(from)) || (reported && first(reported)) || tracks[0];
  if (!lang) return { track: usual };
  const same = first(lang);
  if (same) return { track: same };
  return translate ? { track: usual, to: { code: lang, name: languageName(lang) } } : { track: usual };
}

/** What a player says about its captions, once that part of it has loaded. `key`: to notice changes */
export type ReportedCaptions = { key: string; tracks: CaptionTrack[]; code?: string; languages: { languageCode: string; languageName: string }[] };
/** From a player's `info.captions`. (YouTube leaves its own transcripts out of the list, but names the one it would show.) */
export function reportedCaptions(info: { tracklist?: unknown; track?: unknown; translationLanguages?: unknown }): ReportedCaptions {
  const own = info.track as { languageCode?: string; kind?: string } | undefined;
  const list = [...((info.tracklist ?? []) as { languageCode: string; kind?: string }[]), ...(own?.languageCode ? [own] : [])];
  const tracks = list.map((t) => ({ code: t.languageCode as string, auto: t.kind === "asr" }));
  return {
    key: `${own?.languageCode ?? ""} ${tracks.length}`,
    code: own?.languageCode,
    tracks: tracks.filter((t, i) => tracks.findIndex((x) => x.code === t.code) === i),
    languages: (info.translationLanguages ?? []) as ReportedCaptions["languages"],
  };
}

// Into what YouTube can translate, until the player says (it does once captions are on): its list, in its order. The app's
// languages come first.
const OWN = ["bn", "en", "ar", "ur", "hi"];
const TRANSLATIONS =
  "ab aa af ak sq am ar hy as ay az bn ba eu be bho bs br bg my ca ceb zh-Hans zh-Hant co hr cs da dv nl dz en eo et ee fo fj fil fi fr gaa gl lg ka de el gn gu ht ha haw iw hi hmn hu is ig id iu ga it ja jv kl kn kk kha km rw ko kri ku ky lo la lv ln lt lua luo lb mk mg ms ml mt gv mi mr mn mfe ne new nso no ny oc or om os pam ps fa pl pt pt-PT pa qu ro rn ru sm sg sa gd sr crs sn sd si sk sl so st es su sw ss sv tg ta tt te th bo ti to ts tn tum tr tk uk ur ug uz ve vi war cy fy wo xh yi yo zu";
// YouTube's names of the ones browsers have none for
const RARE: Record<string, string> = {
  ab: "Abkhazian", aa: "Afar", ba: "Bashkir", dz: "Dzongkha", fj: "Fijian", gaa: "Ga", iu: "Inuktitut", kl: "Kalaallisut", kha: "Khasi", lua: "Luba-Lulua", luo: "Luo", gv: "Manx", mfe: "Morisyen",
  new: "Newari", os: "Ossetic", pam: "Pampanga", rn: "Rundi", sg: "Sango", crs: "Seselwa Creole French", ss: "Swati", bo: "Tibetan", tum: "Tumbuka", ve: "Venda", war: "Waray",
};
export function translationLanguages(reported: { languageCode: string; languageName: string }[] | undefined, choice: CaptionChoice | null): CaptionLanguage[] {
  const all = reported?.length ? reported.map((l) => ({ code: l.languageCode, name: l.languageName })) : TRANSLATIONS.split(" ").map((code) => ({ code, name: languageName(code) }));
  const rank = (code: string) => (OWN.includes(code) ? OWN.indexOf(code) : OWN.length);
  return all.filter((l) => base(l.code) !== base(choice?.track.code ?? "")).sort((a, b) => rank(a.code) - rank(b.code));
}

// ─── Where they are drawn ─────────────────────────────────────────────────────

const WIDE = 16 / 9;
/** Captions end this far above the bottom of their box, YouTube's: 2% of its height */
const BOTTOM = 0.02;
/** Captions YouTube wrote itself begin this far from the left of their box (text of its usual size) */
const ROLLUP_LEFT = 0.212;

type CaptionLayout = { position: { top: number; left: number; bottom: number; right: number }; fontSize: number };

/**
 * How YouTube shows captions (all measured on its own pages): `times` its text size of 16px in a player 360px high, by the
 * embed's `steps` of a quarter (YouTube moves its own captions to the left for those); the px
 * it keeps free under them (beside the 2%) and at their right; `edge`: around them, a clear border we can't draw. They don't
 * move for the controls where `stays`.
 */
export type CaptionStyle = { times: number; steps: number; up: number; right: number; edge: number; stays?: boolean };
const mobile = { steps: 2, up: 16, right: 48, edge: 8 };
/** youtube.com, also on an iPad */
export const DESKTOP_CAPTIONS: CaptionStyle = { times: 1, steps: 0, up: 0, right: 0, edge: 0 };
/** m.youtube.com: phones and Android tablets */
export const MOBILE_CAPTIONS: CaptionStyle = { ...mobile, times: 1.5, stays: true };
/** The previews in cards (a few visitors' phones have 1.125 times) */
export const CARD_CAPTIONS: CaptionStyle = { ...mobile, times: 1.5 };

/** Which site this device gets from YouTube (an iPad says it's a Mac) */
export const captionStyle = (canHover: boolean) => (canHover || /Macintosh/.test(navigator.userAgent) ? DESKTOP_CAPTIONS : MOBILE_CAPTIONS);

/** For 2 seconds after it has loaded a caption file YouTube writes a note at the top of their box ("Click ⚙ for settings"): gone
 *  this long after the last time they were asked for */
export const CAPTION_NOTE_MS = 2500;

/** The frame and the visible box around it, as they are on the screen now, and the box's place as YouTube takes it */
function measure(frame: HTMLElement, box: HTMLElement, ratio: number) {
  const f = frame.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  const [w, h] = [frame.offsetWidth, frame.offsetHeight];
  if (!w || !h || !f.width || !b.width) return null;
  // All in the frame's own px (a short's frame is drawn larger and scaled down)
  const scale = f.width / w;
  const videoH = Math.min(h, w / ratio);
  const videoW = Math.min(w, h * ratio);
  const x = (px: number) => (px - f.left) / scale;
  const y = (px: number) => (px - f.top) / scale;
  // YouTube takes the box's place from the frame's size, and its own size from the video's
  const position = (x0: number, x1: number, top: number, bottom: number) => ({
    top: top / h,
    left: x0 / w,
    bottom: 1 - top / h - (bottom - top) / videoH,
    right: 1 - x0 / w - (x1 - x0) / videoW,
  });
  // YouTube's text size: by the height of a box that is wider than high (360 → 16px), by the width of a higher one
  // (480 → 16px when it is 1.3 times as high, else 640). This wide, a high box has text of this size
  const widthFor = (text: number) => (text / 16) * 480 * (videoW / w);
  const heightOver = (width: number) => Math.max(width * 1.05, width * (w / videoW) * 1.35 * (videoH / h));
  return { b, w, scale, videoH, x, y, position, widthFor, heightOver };
}

/**
 * The captions' box and text size in a player or a card, as YouTube's (`style`). `ratio`: the video's width over its height.
 * `lift`: px to keep free under them instead, while our controls show. `far`: a box of the same text that reaches far above
 * the video, for as long as YouTube's note may be there: it's out of sight (`rollup`: YouTube's own captions, which stand at
 * the left; others are in the middle. Some visitors get YouTube's new style, where its own are in the middle too).
 */
export function captionLayout(
  frame: HTMLElement,
  box: HTMLElement,
  { ratio = WIDE, style = DESKTOP_CAPTIONS, lift = 0, far = false, rollup = true }: { ratio?: number; style?: CaptionStyle; lift?: number; far?: boolean; rollup?: boolean } = {}
): CaptionLayout | null {
  const m = measure(frame, box, ratio);
  if (!m) return null;
  const { b, w, scale } = m;
  const seen = Math.min(b.height / scale, m.videoH);
  const text = (seen / 360) * 16 * style.times;
  const left = Math.max(0, m.x(b.left));
  const right = Math.min(w, m.x(b.right - style.right));
  const edge = style.edge / scale;
  const bottom = m.y(b.bottom - (lift || style.up + style.edge));
  // (a box of another height ends its captions at another place: 2% of it)
  if (!far) {
    const height = (text / (1 + 0.25 * style.steps) / 16) * 360;
    const end = bottom + BOTTOM * (height - seen);
    return { position: m.position(left + edge, right - edge, end - height, end), fontSize: style.steps };
  }
  // Never wider than the place they have, or captions in the middle (YouTube's new style, others' captions) leave the box:
  // its text in larger steps needs a narrower box
  const room = right - left - 2 * edge;
  const steps = [style.steps, 4].find((n) => m.widthFor(text / (1 + 0.25 * n)) <= room) ?? 4;
  const width = m.widthFor(text / (1 + 0.25 * steps));
  const height = Math.max(m.heightOver(width), (bottom - m.y(b.top) + 130 / scale) / (1 - BOTTOM));
  const x0 = left + edge + (room - width) * (rollup && !steps ? ROLLUP_LEFT : 0.5);
  const end = bottom + BOTTOM * (height - seen);
  return { position: m.position(x0, x0 + width, end - height, end), fontSize: steps };
}

// ─── Shorts ───────────────────────────────────────────────────────────────────

/** Text under this size only in a short this narrow (a phone held sideways) is made larger */
const NARROW_SHORT = 280;
const NARROW_TEXT = 11;

/**
 * A short's captions: YouTube's text (16px in a short 480px wide, a square one too), right under our buttons (`head`: px from
 * its top). YouTube's own Shorts show them at the top, and its embed gets one of two files, which nothing tells the page: most
 * visitors' place them at the bottom of their box, some visitors' at its top (as its own pages). So the box is as low as that
 * text allows (its largest step): both stand in the short's upper part, and neither is out of sight. `far`: while YouTube's note
 * ("Click ⚙ for settings", not on its own Shorts) may be there, a box that ends its captions in the same place and reaches far
 * above the short: the note is out of sight (and those at the top until it's gone).
 */
export function shortCaptionLayout(frame: HTMLElement, box: HTMLElement, { ratio = 9 / 16, head = 0, far = false } = {}): CaptionLayout | null {
  const m = measure(frame, box, ratio);
  if (!m) return null;
  const { b, scale } = m;
  const text = Math.max(b.width / 30, b.width < NARROW_SHORT ? NARROW_TEXT : 0);
  const steps = 4;
  const low = ((text / (1 + 0.25 * steps)) * 360) / 16;
  const top = b.top + head;
  // (four fifths of the width: their lines break where YouTube's do)
  if (!far) return { position: m.position(m.x(b.left + 0.1 * b.width), m.x(b.right - 0.1 * b.width), m.y(top), m.y(top + low)), fontSize: steps };
  const end = m.y(top + low * (1 - BOTTOM));
  const width = m.widthFor(text / scale);
  const height = Math.max(m.heightOver(width), (end - m.y(b.top) + 130 / scale) / (1 - BOTTOM));
  const middle = m.x(b.left + b.width / 2);
  const bottom = end + BOTTOM * height;
  return { position: m.position(middle - width / 2, middle + width / 2, bottom - height, bottom), fontSize: 0 };
}

type Command = [func: string, args: unknown[]];
// The text size each frame was told (it keeps it)
const sizes = new WeakMap<HTMLElement, number>();
/** What to tell a player so it shows these captions (its `captions` part must have loaded: say it again when it has) */
export function showCaptionsCommands({ track, to }: CaptionChoice, layout: CaptionLayout | null): Command[] {
  return [
    ["loadModule", ["captions"]],
    ["setOption", ["captions", "track", { languageCode: track.code, ...(to && { translationLanguage: { languageCode: to.code, languageName: to.name } }), ...(layout && { position: layout.position }) }]],
    // (a size told before its captions part had loaded can get lost: told again each time)
    ...(layout ? [["setOption", ["captions", "fontSize", layout.fontSize]] as Command] : []),
  ];
}
/** Move captions that are showing (a track without a language leaves them as they are) */
export function moveCaptionsCommands(frame: HTMLElement | null | undefined, layout: CaptionLayout | null): Command[] {
  if (!layout || !frame) return [];
  const commands: Command[] = [["setOption", ["captions", "track", { position: layout.position }]]];
  if (layout.fontSize !== (sizes.get(frame) ?? 0)) commands.push(["setOption", ["captions", "fontSize", layout.fontSize]]);
  sizes.set(frame, layout.fontSize);
  return commands;
}
export const HIDE_CAPTIONS: Command = ["setOption", ["captions", "track", {}]];

/** The video's captions and the visitor's choice for them; `reported`: what its player says it has (a video not in the data) */
export function useCaptions(videoId: string, reported?: Pick<ReportedCaptions, "tracks" | "code">) {
  const prefs = useCaptionPrefs();
  const tracks = useMemo(() => {
    const known = captionTracks(videoId);
    return known?.length ? known : reported?.tracks.length ? reported.tracks : known ?? [];
  }, [videoId, reported]);
  const choice = useMemo(() => pickCaptions(tracks, prefs, reported?.code), [tracks, prefs, reported]);
  return { tracks, choice, on: prefs.on && choice !== null, available: tracks.length > 0 };
}
