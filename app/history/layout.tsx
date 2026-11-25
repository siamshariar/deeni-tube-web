import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Watch history",
  description: "The videos and Shorts you watched on Deeni.tube, on this device.",
  path: "/history",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
