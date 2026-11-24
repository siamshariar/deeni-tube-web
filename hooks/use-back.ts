// hooks/use-back.ts
"use client";

import { useRouter } from "next/navigation";

/** Back, as the browser's own; for a page opened straight from a link (nothing to go back to), its parent page. */
export function useBack(parent: string | (() => string)) {
  const router = useRouter();
  return () => {
    if (window.history.length > 1) router.back();
    else router.push(typeof parent === "string" ? parent : parent());
  };
}
