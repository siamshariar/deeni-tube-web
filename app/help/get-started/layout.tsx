import type { Metadata } from "next";
import { pageTitle } from "@/lib/page-title";

export const metadata: Metadata = { title: pageTitle("Get started") };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
