import { ogCard, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Categories",
  description: "Browse authentic Islamic videos by topic: lectures, Quran, dua, dawah, aqeedah, fiqh, hadith and more, on Deeni.tube.",
  path: "/categories",
  image: ogCard("categories", "Islamic video categories on Deeni.tube"),
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
