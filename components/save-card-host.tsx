// components/save-card-host.tsx
// Keeps the one "Save to..." card of the app (lib/save-card.ts). The card itself is loaded when it's first opened.
"use client";

import { useEffect, useState } from "react";
import { trackPresses, useSaveCard } from "@/lib/save-card";

type Card = typeof import("@/components/save-card").default;

export default function SaveCardHost() {
  const state = useSaveCard();
  const [Card, setCard] = useState<{ component: Card } | null>(null);
  useEffect(() => trackPresses(), []);
  const wanted = state !== null;
  useEffect(() => {
    if (!wanted) return;
    let mounted = true;
    void import("@/components/save-card").then((m) => {
      if (mounted) setCard({ component: m.default });
    });
    return () => {
      mounted = false;
    };
  }, [wanted]);
  if (!state || !Card) return null;
  return <Card.component key={state.opened} {...state} />;
}
