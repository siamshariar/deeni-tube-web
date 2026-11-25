// components/captions-dialog.tsx
// Shorts' captions: off, their languages, and Auto-translate with its own list, as on YouTube (the watch player has the
// same in its settings). The choice is the one of every video and short (lib/captions).
"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { chooseCaptions, setCaptionsOn, trackName, translateCaptions, translationLanguages, type CaptionChoice, type CaptionTrack, type ReportedCaptions } from "@/lib/captions";
import { cn } from "@/lib/utils";

const ROW = "flex min-h-11 w-full items-center gap-4 px-4 py-2 text-left text-[15px] transition-colors hover:bg-accent active:bg-accent md:min-h-10 md:rounded-lg md:text-sm";

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick} className={ROW}>
      <Check className={cn("h-5 w-5 flex-shrink-0", !on && "invisible")} />
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

export function CaptionsDialog({
  open,
  onOpenChange,
  tracks,
  choice,
  on,
  reported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tracks: CaptionTrack[];
  choice: CaptionChoice | null;
  on: boolean;
  reported?: ReportedCaptions;
}) {
  const [translating, setTranslating] = useState(false);
  const change = (next: boolean) => {
    onOpenChange(next);
    if (!next) setTranslating(false);
  };
  const pick = (choose: () => void) => {
    choose();
    change(false);
  };
  return (
    <ResponsiveDialog open={open} onOpenChange={change} title={translating ? "Auto-translate" : "Captions"} className="max-w-[320px]">
      {/* Each list starts at its top */}
      <div key={String(translating)} role="radiogroup" aria-label={translating ? "Auto-translate" : "Captions"} className="yt-scrollbar -mx-4 min-h-0 overflow-y-auto pb-2 md:mx-0 md:max-h-[min(440px,60vh)]">
        {translating ? (
          <>
            <button type="button" onClick={() => setTranslating(false)} className={ROW}>
              <ChevronLeft className="h-5 w-5 flex-shrink-0" /> Back
            </button>
            {translationLanguages(reported?.languages, choice).map((l) => (
              <Choice key={l.code} on={on && choice?.to?.code === l.code} onClick={() => pick(() => translateCaptions(l.code, choice?.track.code))}>
                {l.name}
              </Choice>
            ))}
          </>
        ) : (
          <>
            <Choice on={!on} onClick={() => pick(() => setCaptionsOn(false))}>
              Off
            </Choice>
            {tracks.map((t) => (
              <Choice key={t.code} on={on && !choice?.to && choice?.track.code === t.code} onClick={() => pick(() => chooseCaptions(t.code))}>
                {trackName(t)}
              </Choice>
            ))}
            <button type="button" onClick={() => setTranslating(true)} className={ROW}>
              <Check className={cn("h-5 w-5 flex-shrink-0", !(on && choice?.to) && "invisible")} />
              <span className="min-w-0 flex-1">Auto-translate</span>
              <span className="truncate text-muted-foreground">{on ? choice?.to?.name : null}</span>
              <ChevronRight className="h-5 w-5 flex-shrink-0" />
            </button>
          </>
        )}
      </div>
    </ResponsiveDialog>
  );
}
