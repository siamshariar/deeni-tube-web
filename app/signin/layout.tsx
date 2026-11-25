import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Sign in",
  description: "Sign in to Deeni.tube to keep your history, playlists and settings.",
  path: "/signin",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
