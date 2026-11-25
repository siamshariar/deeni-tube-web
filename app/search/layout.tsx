import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Search",
  description: "Search authentic Islamic videos, scholars and channels on Deeni.tube, by text or by voice.",
  path: "/search",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
