import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Settings",
  description: "Your settings on Deeni.tube: languages, playback, notifications and appearance.",
  path: "/settings",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
