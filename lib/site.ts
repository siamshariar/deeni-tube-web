// lib/site.ts
// The site's own address and name, for search engines and shared links. The address: NEXT_PUBLIC_SITE_URL if it is set, else
// the project's production domain on Vercel (so it changes by itself when deeni.tube is connected there), else, for a build made
// anywhere else, the site's current public address; in development, this computer's.
const url =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.NODE_ENV === "production"
      ? "https://deeni-tube-web.vercel.app"
      : "http://localhost:3000");
export const SITE_URL = url.replace(/\/+$/, "");
export const SITE_NAME = "Deeni.tube";
export const SITE_TITLE = "Deeni.tube - Authentic Islamic Videos";
export const SITE_DESCRIPTION = "Watch authentic Islamic videos, lectures, Quran recitation and Shorts from trusted scholars and channels, in Bangla and English. Free on Deeni.tube.";
/** Search engines: only the production site, not Vercel's previews of it */
export const INDEXED = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production";
export const absoluteUrl = (path: string) => new URL(path, SITE_URL).href;
