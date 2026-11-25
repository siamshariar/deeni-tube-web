import { ogCard, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Community guidelines",
  description: "The community guidelines of Deeni.tube: what is welcome, what is not allowed, and how to report a video, channel or comment.",
  path: "/help/guidelines",
  image: ogCard("help", "Deeni.tube help"),
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
