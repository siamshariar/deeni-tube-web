import type { Metadata } from "next";
import { pageTitle } from "@/lib/page-title";

export const metadata: Metadata = { title: pageTitle("Privacy & safety") };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
