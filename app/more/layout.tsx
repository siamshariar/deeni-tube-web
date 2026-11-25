import { ogCard, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "More",
  description: "More from Deeni.tube: about us, rate the site, suggest a channel or scholar, donate, and help.",
  path: "/more",
  image: ogCard("default", "Deeni.tube"),
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
