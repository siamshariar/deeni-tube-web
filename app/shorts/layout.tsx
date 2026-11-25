import { ogCard, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Shorts",
  description: "Short Islamic videos and reminders from trusted scholars, in Bangla and English. Swipe through authentic Islamic Shorts on Deeni.tube.",
  path: "/shorts",
  image: ogCard("shorts", "Islamic Shorts on Deeni.tube"),
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
