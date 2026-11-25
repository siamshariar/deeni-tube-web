import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Liked videos",
  description: "The videos and Shorts you liked on Deeni.tube, on this device.",
  path: "/liked-videos",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
