// components/language-prompt.tsx
"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tick } from "@/components/tick";
import { mockLanguages } from "@/lib/mock-data";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

interface LanguagePromptProps {
  open: boolean;
  onSave: (languages: string[]) => void;
  onClose?: () => void;
  canDismiss?: boolean;
  onSkip?: () => void;
  initialSelected?: string[];
}

export default function LanguagePrompt({
  open,
  onSave,
  onClose,
  canDismiss = false,
  initialSelected = ["en"],
}: LanguagePromptProps) {
  const fallback = initialSelected.length > 0 ? initialSelected : ["en"];
  const [selected, setSelected] = useState<string[]>(fallback);
  const isMobile = useMediaQuery("(max-width: 767px)");

  // Start from the caller's current choice every time the prompt opens
  const initialKey = fallback.join(",");
  const [synced, setSynced] = useState({ open, initialKey });
  if (open !== synced.open || initialKey !== synced.initialKey) {
    setSynced({ open, initialKey });
    if (open) setSelected(initialKey.split(","));
  }

  const toggle = (code: string) => {
    setSelected((prev) =>
      prev.includes(code)
        ? prev.length > 1
          ? prev.filter((l) => l !== code)
          : prev
        : [...prev, code]
    );
  };

  const handleContinue = () => {
    onSave(selected);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && canDismiss && onClose) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent
        className={cn(
          "p-0 gap-0 overflow-hidden flex flex-col bg-background",
          isMobile
            ? "h-[100dvh] max-h-none w-full max-w-full rounded-none border-0"
            : "sm:max-w-md max-h-[90vh] overflow-y-auto",
          !canDismiss && "[&>button:first-of-type]:hidden"
        )}
        onPointerDownOutside={(e) => { if (!canDismiss) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (!canDismiss) e.preventDefault(); }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-12 pb-6 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Globe className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold mb-2">
            Choose your language
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Select one or more languages to personalize your content. You can
            change this later in Settings.
          </DialogDescription>
        </div>

        {/* Language list */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          <div className="border rounded-xl divide-y overflow-hidden">
            {mockLanguages.map((lang) => {
              const isSelected = selected.includes(lang.code);
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  onClick={() => toggle(lang.code)}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors active:bg-accent can-hover:hover:bg-muted/60"
                >
                  <span className="text-[15px]">{lang.name}</span>
                  <Tick checked={isSelected} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer – Continue button */}
        <div className="flex-shrink-0 px-6 pb-8 pt-4 bg-background">
          <Button
            onClick={handleContinue}
            className="w-full h-12 rounded-full text-base font-semibold"
          >
            Continue
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            At least one language is required.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}