// lib/connection.ts
// Whether the device is online, for the message along the bottom (components/connection-notice.tsx) and the players.
import { useSyncExternalStore } from "react";

/** "back": online again a moment ago */
export type Connection = "online" | "offline" | "back";
const BACK_MS = 3000;

let state: Connection = "online";
let timer: ReturnType<typeof setTimeout> | undefined;
let listening = false;
const listeners = new Set<() => void>();
const returns = new Set<() => void>();
const set = (next: Connection) => {
  clearTimeout(timer);
  state = next;
  listeners.forEach((l) => l());
};
function start() {
  if (listening) return;
  listening = true;
  if (!navigator.onLine) state = "offline";
  window.addEventListener("offline", () => set("offline"));
  window.addEventListener("online", () => {
    if (state !== "offline") return;
    set("back");
    timer = setTimeout(() => set("online"), BACK_MS);
    returns.forEach((r) => r());
  });
}
const subscribe = (l: () => void) => {
  start();
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const useConnection = () => useSyncExternalStore(subscribe, () => state, () => "online" as Connection);
/** Called when the connection is back */
export function onBackOnline(call: () => void) {
  start();
  returns.add(call);
  return () => void returns.delete(call);
}
