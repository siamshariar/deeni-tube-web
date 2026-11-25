import { ogCard, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Channels",
  description: "Browse trusted Islamic channels on Deeni.tube and choose which ones show on your Home feed: lectures, Quran, hadith, fiqh and reminders.",
  path: "/channels",
  image: ogCard("channels", "Islamic channels on Deeni.tube"),
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
