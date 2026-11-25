import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Watch later",
  description: "The videos and Shorts you saved to watch later on Deeni.tube, on this device.",
  path: "/watch-later",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
