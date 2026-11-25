import { ogCard, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Rate the app",
  description: "Tell us what you think of Deeni.tube and help us make it better for everyone who wants to learn about Islam.",
  path: "/more/rate",
  image: ogCard("default", "Rate Deeni.tube"),
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
