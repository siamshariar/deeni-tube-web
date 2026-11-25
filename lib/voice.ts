// lib/voice.ts
// Voice search's listening, with the browser's Web Speech API (Chrome, Edge, Safari). One session for the whole app, outside
// React: it starts inside the press on a microphone (Safari only allows it there) and only once (an effect started it twice
// on the dev server). components/voice-search.tsx shows it. The language (English or Bangla) is kept per device.
import { useSyncExternalStore } from "react";

// TypeScript's DOM types only include the result types of the Web Speech API
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
function recognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const VOICE_LANGUAGES = [
  { code: "en-US", label: "English" },
  { code: "bn-BD", label: "বাংলা" },
];
const LANG_KEY = "deeni-voice-lang";
function savedLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && VOICE_LANGUAGES.some((l) => l.code === saved)) return saved;
  } catch {}
  return navigator.language?.toLowerCase().startsWith("bn") ? "bn-BD" : "en-US";
}

export type VoiceProblem = "no-speech" | "denied" | "no-mic" | "network" | "error" | "unsupported";
export interface Voice {
  open: boolean;
  /** "asking": the browser is asking for the microphone */
  status: "asking" | "listening" | VoiceProblem;
  /** What was heard so far */
  text: string;
  lang: string;
}
const CLOSED: Voice = { open: false, status: "listening", text: "", lang: "en-US" };
let state = CLOSED;
const listeners = new Set<() => void>();
const set = (next: Partial<Voice>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const useVoice = () => useSyncExternalStore(subscribe, () => state, () => CLOSED);

// Nothing asks for this long: the microphone is allowed already
const ASKING_AFTER_MS = 700;
// "Listening..." stays at least this long, so trying again can be seen when it fails at once
const SHOWN_AT_LEAST_MS = 900;
// Waits this long for someone to speak. The browser gives up sooner (Chrome after 8 seconds): it is asked again meanwhile
const LISTEN_MS = 20_000;

// Whether the device has a microphone at all (browsers say that without asking): without one, say so at once rather than
// after "Listening..."
let microphone: boolean | null = null;
async function lookForMicrophone() {
  try {
    microphone = (await navigator.mediaDevices.enumerateDevices()).some((d) => d.kind === "audioinput");
  } catch {
    microphone = null;
  }
  // One was connected while the card said there was none
  if (microphone && state.open && state.status === "no-mic") listen();
}
let looking = false;
/** Once, when the app starts */
export function watchMicrophone() {
  if (looking || !navigator.mediaDevices?.enumerateDevices) return;
  looking = true;
  void lookForMicrophone();
  navigator.mediaDevices.addEventListener?.("devicechange", () => void lookForMicrophone());
}

let current: SpeechRecognitionLike | null = null;
let onText: (text: string) => void = () => {};
// The microphone in the card was pressed: no more listening
let stopped = false;
let timers: ReturnType<typeof setTimeout>[] = [];

function drop() {
  timers.forEach(clearTimeout);
  timers = [];
  const r = current;
  current = null;
  if (!r) return;
  r.onstart = r.onresult = r.onerror = r.onend = null;
  try {
    r.abort();
  } catch {}
}

function problemFor(error: string): VoiceProblem {
  if (error === "not-allowed" || error === "service-not-allowed") return "denied";
  if (error === "audio-capture") return "no-mic";
  if (error === "network") return "network";
  return error === "no-speech" ? "no-speech" : "error";
}

/** Call inside the press on the microphone. `since`: it goes on listening (nothing was said yet) */
function listen(again = false, since?: number) {
  drop();
  if (since === undefined) set({ status: "listening", text: "" });
  const startedAt = since ?? performance.now();
  const fail = (problem: VoiceProblem) => {
    drop();
    timers.push(setTimeout(() => set({ status: problem }), Math.max(0, SHOWN_AT_LEAST_MS - (performance.now() - startedAt))));
  };
  const Recognition = recognitionCtor();
  if (!Recognition) return set({ status: "unsupported" });
  if (microphone === false) {
    void lookForMicrophone(); // it may have been turned on since
    return set({ status: "no-mic" });
  }
  if (!navigator.onLine) return fail("network");
  const r = new Recognition();
  current = r;
  r.lang = state.lang;
  r.interimResults = true;
  r.continuous = false;
  r.maxAlternatives = 1;
  let heard = "";
  stopped = false;
  if (since === undefined) timers.push(setTimeout(() => set({ status: "asking" }), ASKING_AFTER_MS));
  r.onstart = () => {
    timers.forEach(clearTimeout);
    timers = [];
    set({ status: "listening" });
  };
  r.onresult = (e) => {
    // All of them each time (Android's Chrome repeats earlier ones)
    heard = Array.from(e.results, (result) => result[0].transcript).join("").trim();
    set({ status: "listening", text: heard });
  };
  // Nothing said yet: go on listening, up to LISTEN_MS
  const nothing = () => (performance.now() - startedAt < LISTEN_MS ? listen(again, startedAt) : fail("no-speech"));
  r.onerror = (e) => {
    if (current !== r) return;
    if (e.error === "no-speech") return nothing();
    // (Safari may not let it go on by itself)
    if (since !== undefined && e.error === "not-allowed") return fail("no-speech");
    // The browser itself broke it off (another tab used the microphone, it was asked twice): once more
    if (e.error === "aborted" && !again) return listen(true, since);
    fail(problemFor(e.error));
  };
  r.onend = () => {
    if (current !== r) return;
    if (!heard) return stopped ? fail("no-speech") : nothing();
    const search = onText;
    closeVoice();
    search(heard);
  };
  try {
    r.start();
  } catch {
    fail(since === undefined ? "error" : "no-speech");
  }
}

/** Inside a press on a microphone. `search`: what to do with the words */
export function openVoice(search: (text: string) => void) {
  onText = search;
  set({ open: true, lang: savedLang() });
  listen();
}
export function closeVoice() {
  drop();
  set({ open: false });
}
/** The microphone in the card: stop now and search what was heard so far, or listen again */
export function pressVoice() {
  if (state.status === "unsupported") return;
  if (current) {
    stopped = true;
    current.stop();
  } else listen();
}
export function setVoiceLang(code: string) {
  if (code === state.lang) return;
  try {
    localStorage.setItem(LANG_KEY, code);
  } catch {}
  set({ lang: code });
  listen();
}
