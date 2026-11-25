import { ogCard, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Donate",
  description: "Support Deeni.tube and help bring authentic Islamic videos from trusted scholars to more people, free for everyone.",
  path: "/donate",
  image: ogCard("donate", "Donate to Deeni.tube"),
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
