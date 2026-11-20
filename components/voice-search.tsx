// components/voice-search.tsx
// Voice search, as on YouTube: the mic button opens a dialog that listens (red pulsing mic), shows the words
// as they are recognised, and searches when the speaker stops. Uses the browser's Web Speech API (Chrome,
// Edge, Safari); other browsers get a "not supported" message. The recognition language (English or
// Bangla) is remembered per device in localStorage ('deeni-voice-lang').
"use client";

import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Mic, X } from "lucide-react";
import { cn } from "@/lib/utils";

// TypeScript's DOM types only include the result types of the Web Speech API
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: { resultIndex: number; results: SpeechRecognitionResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function recognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const LANGUAGES = [
  { code: "en-US", label: "English" },
  { code: "bn-BD", label: "বাংলা" },
];
const LANG_KEY = "deeni-voice-lang";

function initialLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && LANGUAGES.some((l) => l.code === saved)) return saved;
  } catch {}
  return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("bn") ? "bn-BD" : "en-US";
}

type Problem = "no-speech" | "denied" | "no-mic" | "network" | "error" | "unsupported";

const PROBLEMS: Record<Problem, { title: string; hint: string }> = {
  "no-speech": { title: "Didn't hear that. Try again.", hint: "Tap the microphone and speak" },
  denied: { title: "Permission to use the microphone is blocked", hint: "Allow the microphone for this site from your browser's address bar, then try again" },
  "no-mic": { title: "No microphone found", hint: "Check your microphone and try again" },
  network: { title: "Voice search needs an internet connection", hint: "Check your connection and try again" },
  error: { title: "Voice search didn't work", hint: "Tap the microphone to try again" },
  unsupported: { title: "Voice search isn't supported in this browser", hint: "Try Chrome, Edge or Safari" },
};

function problemFor(error: string): Problem {
  if (error === "not-allowed" || error === "service-not-allowed") return "denied";
  if (error === "audio-capture") return "no-mic";
  if (error === "network") return "network";
  if (error === "no-speech" || error === "aborted") return "no-speech";
  return "error";
}

export function VoiceSearchDialog({
  open,
  onOpenChange,
  onResult,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the recognised text; the caller searches and closes the dialog */
  onResult: (text: string) => void;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* z-[70]: also above the full-screen phone search (z-60) */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[70] w-[calc(100%-32px)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background text-foreground shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {/* Mounted per opening, so every opening starts a fresh listening session */}
          <VoiceSearchSession onResult={onResult} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function VoiceSearchSession({ onResult }: { onResult: (text: string) => void }) {
  const [supported] = useState(() => recognitionCtor() !== null);
  const [lang, setLang] = useState(initialLang);
  const [attempt, setAttempt] = useState(0);
  const [problem, setProblem] = useState<Problem | null>(supported ? null : "unsupported");
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  });

  useEffect(() => {
    const Recognition = recognitionCtor();
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    let finalText = "";
    let failed = false;
    recognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      setTranscript((finalText + interim).trim());
    };
    recognition.onerror = (e) => {
      failed = true;
      setProblem(problemFor(e.error));
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      const text = finalText.trim();
      if (text && !failed) onResultRef.current(text);
      else if (!failed) setProblem("no-speech");
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // start() only throws if a session is already running; errors are reported through onerror
    }
    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [lang, attempt]);

  const listening = problem === null;

  const restart = () => {
    setProblem(null);
    setTranscript("");
    setAttempt((n) => n + 1);
  };

  const chooseLang = (code: string) => {
    if (code === lang) return;
    try { localStorage.setItem(LANG_KEY, code); } catch {}
    setLang(code);
    setProblem(null);
    setTranscript("");
  };

  const onMicClick = () => {
    if (!supported) return;
    if (listening) recognitionRef.current?.stop(); // stop now and search what was heard so far
    else restart();
  };

  const message = problem ? PROBLEMS[problem] : null;

  return (
    <div className="flex min-h-[340px] flex-col sm:min-h-[380px]">
      <div className="flex items-start justify-between gap-2 py-2 pl-6 pr-2">
        <DialogPrimitive.Title className="sr-only">Search with your voice</DialogPrimitive.Title>
        <p aria-live="polite" className="min-w-0 pt-3 text-xl leading-8 [overflow-wrap:anywhere] sm:text-2xl">
          {message ? message.title : transcript || "Listening..."}
        </p>
        <DialogPrimitive.Close asChild>
          <button type="button" aria-label="Close" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent">
            <X className="h-6 w-6" />
          </button>
        </DialogPrimitive.Close>
      </div>

      <div className="flex flex-1 flex-col items-center justify-end gap-4 px-6 pb-6 pt-8">
        <button
          type="button"
          onClick={onMicClick}
          disabled={!supported}
          aria-label={listening ? "Stop listening" : "Try again"}
          className={cn(
            "relative flex h-16 w-16 items-center justify-center rounded-full transition-colors disabled:opacity-50 sm:h-20 sm:w-20",
            listening ? "bg-[#ff0000] text-white" : "bg-muted text-foreground hover:bg-accent"
          )}
        >
          {listening && <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-[#ff0000]/40" />}
          <Mic className="relative h-8 w-8 sm:h-9 sm:w-9" />
        </button>
        <p className="min-h-5 text-center text-sm text-muted-foreground">{message ? message.hint : "Speak now"}</p>
        {supported && (
          <div className="flex items-center gap-2" role="group" aria-label="Voice search language">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                aria-pressed={lang === l.code}
                onClick={() => chooseLang(l.code)}
                className={cn(
                  "h-8 rounded-lg px-3 text-sm font-medium transition-colors",
                  lang === l.code ? "bg-foreground text-background" : "bg-muted hover:bg-accent"
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
