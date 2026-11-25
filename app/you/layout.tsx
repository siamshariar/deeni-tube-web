import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "You",
  description: "Your account, history, playlists, Watch later and liked videos on Deeni.tube.",
  path: "/you",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
