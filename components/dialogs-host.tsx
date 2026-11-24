// components/dialogs-host.tsx
// Keeps the app's Share, Report and Send feedback dialogs (lib/dialogs.ts). Their code is loaded when one first opens.
"use client";

import { useEffect, useState } from "react";
import { useDialogState } from "@/lib/dialogs";

type Dialogs = typeof import("@/components/dialogs").default;

export default function DialogsHost() {
  const state = useDialogState();
  const [Dialogs, setDialogs] = useState<{ component: Dialogs } | null>(null);
  const wanted = state !== null;
  useEffect(() => {
    if (!wanted) return;
    let mounted = true;
    void import("@/components/dialogs").then((m) => {
      if (mounted) setDialogs({ component: m.default });
    });
    return () => {
      mounted = false;
    };
  }, [wanted]);
  if (!state || !Dialogs) return null;
  return <Dialogs.component key={state.opened} open={state.open} request={state.request} />;
}
