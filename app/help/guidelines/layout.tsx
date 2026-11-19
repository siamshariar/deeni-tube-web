import type { Metadata } from "next";
import { pageTitle } from "@/lib/page-title";

export const metadata: Metadata = { title: pageTitle("Community guidelines") };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
