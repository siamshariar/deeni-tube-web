import { ogCard, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "About Deeni.tube",
  description: "Deeni.tube brings authentic Islamic videos from trusted scholars and channels together in one place, in Bangla and English.",
  path: "/more/about",
  image: ogCard("default", "About Deeni.tube"),
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
