// components/connection-notice.tsx
// "You're offline" along the bottom while there's no connection, and "Back online" for a moment when it returns, as in
// YouTube's app; above the phone's bottom nav. Pictures that couldn't load meanwhile are left out (not shown broken) and
// loaded again. Also sets up the page for opening the site without a connection (public/sw.js, public/offline.html).
"use client";

import { useEffect } from "react";
import { onBackOnline, useConnection } from "@/lib/connection";
import { cn } from "@/lib/utils";

export default function ConnectionNotice() {
  const connection = useConnection();

  useEffect(() => {
    const onError = (e: Event) => {
      if (e.target instanceof HTMLImageElement && !navigator.onLine) e.target.dataset.offline = "";
    };
    const onLoad = (e: Event) => {
      if (e.target instanceof HTMLImageElement) delete e.target.dataset.offline;
    };
    document.addEventListener("error", onError, true);
    document.addEventListener("load", onLoad, true);
    const off = onBackOnline(() => {
      document.querySelectorAll<HTMLImageElement>("img[data-offline]").forEach((img) => {
        img.src = img.getAttribute("src") ?? img.src;
      });
    });
    return () => {
      document.removeEventListener("error", onError, true);
      document.removeEventListener("load", onLoad, true);
      off();
    };
  }, []);

  // Only on the built site: the dev server changes all the time
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => void navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") {
      const timer = setTimeout(register, 3000);
      return () => clearTimeout(timer);
    }
    let timer: ReturnType<typeof setTimeout>;
    const onLoad = () => { timer = setTimeout(register, 3000); };
    window.addEventListener("load", onLoad);
    return () => {
      window.removeEventListener("load", onLoad);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (connection === "online") delete html.dataset.connection;
    else html.dataset.connection = connection;
  }, [connection]);

  return (
    <div role="status" aria-live="polite" className="connection-bar pointer-events-none fixed inset-x-0 z-[45]">
      {connection !== "online" && (
        <p className={cn("animate-in slide-in-from-bottom-2 fade-in-0 px-3 text-center text-xs font-medium leading-6 text-white", connection === "back" ? "bg-[#0b8043]" : "bg-[#212121] dark:bg-[#3d3d3d]")}>
          {connection === "back" ? "Back online" : "You're offline. Check your connection."}
        </p>
      )}
    </div>
  );
}
