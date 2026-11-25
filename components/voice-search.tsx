// components/voice-search.tsx
// Voice search's card, as on YouTube (measured): over the search box at the top of the page (592x440, 8px down), on phones a
// page of its own; a red microphone with a ring that spreads while it listens, the words as they are recognised, then the
// search. One for the whole app (in app/layout.tsx); opened with openVoice (lib/voice.ts, which does the listening).
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { MicIcon } from "@/components/icons/action-icons";
import { closeVoice, pressVoice, setVoiceLang, useVoice, VOICE_LANGUAGES, watchMicrophone, type VoiceProblem } from "@/lib/voice";
import { cn } from "@/lib/utils";

const MESSAGES: Record<VoiceProblem | "asking", { title: string; hint?: string }> = {
  asking: { title: "Waiting for permission", hint: "Allow microphone access to search with your voice" },
  "no-speech": { title: "Didn't hear that. Try again." },
  denied: { title: "Search with your voice", hint: "To search by voice, go to your browser settings and allow access to microphone" },
  "no-mic": { title: "No microphone found", hint: "Connect a microphone, or turn it on in your device's sound settings, then try again" },
  network: { title: "You're offline", hint: "Check your connection, then try again" },
  error: { title: "Voice search didn't work" },
  unsupported: { title: "Voice search isn't supported in this browser", hint: "Try Chrome, Edge or Safari" },
};

export default function VoiceSearch() {
  const { open, status, text, lang } = useVoice();
  // Not over another page (the phone's Back)
  const pathname = usePathname();
  useEffect(() => closeVoice, [pathname]);
  useEffect(watchMicrophone, []);
  const listening = status === "listening";
  const supported = status !== "unsupported";
  const failed = !listening && status !== "asking";
  const message = status === "listening" ? null : MESSAGES[status];
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next) closeVoice(); }}>
      <DialogPrimitive.Portal>
        {/* z-[70]: also above the full-screen phone search (z-60) */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-black/30 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="yt-scrollbar fixed inset-0 z-[70] overflow-y-auto bg-background text-foreground outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 max-md:pl-[var(--sal)] max-md:pr-[var(--sar)] md:inset-auto md:left-[calc(50%-296px)] md:top-2 md:h-[440px] md:max-h-[calc(100dvh-16px)] md:w-[592px] md:shadow-[0_16px_24px_2px_rgba(0,0,0,0.14),0_6px_30px_5px_rgba(0,0,0,0.12),0_8px_10px_-5px_rgba(0,0,0,0.4)] dark:bg-[#212121]"
        >
          <div className="relative flex min-h-full flex-col p-7 md:p-0 md:pl-8 low:!p-4 low:!pl-8">
            <DialogPrimitive.Title className="sr-only">Search with your voice</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <button type="button" aria-label="Close" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent active:bg-accent md:absolute md:right-2 md:top-2 low:absolute low:right-2 low:top-2">
                <X className="h-6 w-6" />
              </button>
            </DialogPrimitive.Close>

            {/* What it heard, or what is wrong */}
            <div className="px-2 pt-14 md:px-0 md:pr-14 md:pt-12 low:!px-0 low:!pr-14 low:!pt-2">
              <p aria-live="polite" className="text-2xl leading-[30px] [overflow-wrap:anywhere] md:font-bold md:leading-8">
                {message ? message.title : text || "Listening..."}
              </p>
              {message?.hint && <p className="mt-6 text-sm leading-5 text-muted-foreground low:mt-2">{message.hint}</p>}
              {supported && (
                <div className="mt-6 flex items-center gap-2 low:mt-3" role="group" aria-label="Voice search language">
                  {VOICE_LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      aria-pressed={lang === l.code}
                      onClick={() => setVoiceLang(l.code)}
                      className={cn(
                        "h-8 rounded-lg px-3 text-sm font-medium transition-colors",
                        lang === l.code ? "bg-foreground text-background" : "bg-muted hover:bg-accent dark:bg-white/10 dark:hover:bg-white/20"
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-auto flex flex-col items-center pb-2 pt-8 md:pb-10 low:!pb-0 low:!pt-2">
              <button
                type="button"
                onClick={pressVoice}
                disabled={!supported}
                aria-label={failed ? "Try again" : "Stop listening"}
                className={cn(
                  "relative flex h-20 w-20 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 md:h-[68px] md:w-[68px] low:!h-14 low:!w-14",
                  listening ? "bg-[#e1002d] text-white" : "bg-black/[0.36] hover:bg-black/[0.42] dark:bg-white/[0.36] dark:hover:bg-white/[0.42]"
                )}
              >
                {listening && <span aria-hidden="true" className="absolute inset-0 animate-[voice-ring_1.5s_ease-out_infinite] rounded-full border border-black/20 motion-reduce:hidden dark:border-white/30" />}
                <MicIcon className="relative h-12 w-12 md:h-10 md:w-10 low:!h-8 low:!w-8" />
              </button>
              <p className="mt-4 min-h-6 text-center text-sm leading-6 text-muted-foreground low:!mt-1">{failed && supported && status !== "denied" ? "Tap microphone to try again" : ""}</p>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
