import { ogCard, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Scholars",
  description: "Find lectures, Shorts and playlists by trusted Islamic scholars, in Bangla and English, on Deeni.tube.",
  path: "/scholars",
  image: ogCard("scholars", "Islamic scholars on Deeni.tube"),
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
