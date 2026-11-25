import { ogCard, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Suggest a feature",
  description: "Suggest a feature, channel or scholar for Deeni.tube, and help make authentic Islamic knowledge easier to find.",
  path: "/more/suggest",
  image: ogCard("default", "Suggest to Deeni.tube"),
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
