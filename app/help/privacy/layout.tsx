import { ogCard, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Privacy & safety",
  description: "How Deeni.tube handles your data and keeps you safe: what is stored on your device, what is not, and the choices you have.",
  path: "/help/privacy",
  image: ogCard("help", "Deeni.tube help"),
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
