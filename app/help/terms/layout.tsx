import { ogCard, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Terms of use",
  description: "The terms of use of Deeni.tube: using the site, content and copyright, your responsibilities, and how the terms can change.",
  path: "/help/terms",
  image: ogCard("help", "Deeni.tube help"),
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
