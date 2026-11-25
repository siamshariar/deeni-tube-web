import { ogCard, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Get started",
  description: "How to use Deeni.tube: find Islamic videos and Shorts, search by voice, save to playlists, and choose your languages and channels.",
  path: "/help/get-started",
  image: ogCard("help", "Deeni.tube help"),
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
