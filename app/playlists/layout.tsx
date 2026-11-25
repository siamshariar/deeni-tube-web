import { ogCard, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Playlists",
  description: "Islamic video playlists: series of lectures, Quran recitation and reminders to watch in order on Deeni.tube.",
  path: "/playlists",
  image: ogCard("playlists", "Islamic playlists on Deeni.tube"),
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
