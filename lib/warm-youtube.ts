// lib/warm-youtube.ts
// Opens connections to YouTube's servers as soon as a visitor points at or touches a video/short card,
// so the player on the page they open starts loading without waiting for DNS and TLS (lite-youtube does the
// same). Runs once per page load.
import { preconnect } from "react-dom";

let warmed = false;

export function warmYouTube() {
  if (warmed) return;
  warmed = true;
  preconnect("https://www.youtube.com"); // Shorts
  preconnect("https://www.youtube-nocookie.com"); // video and playlist pages
  preconnect("https://www.google.com");
  preconnect("https://i.ytimg.com");
}
