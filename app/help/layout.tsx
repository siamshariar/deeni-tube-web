import { ogCard, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Help",
  description: "Help with Deeni.tube: getting started, community guidelines, privacy and safety, the terms of use and how to contact us.",
  path: "/help",
  image: ogCard("help", "Deeni.tube help"),
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
