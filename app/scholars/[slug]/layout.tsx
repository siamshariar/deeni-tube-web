import type { Metadata } from "next";
import { pageTitle } from "@/lib/page-title";
import { notFound } from "next/navigation";
import { scholarData } from "@/lib/scholar-data";

const findScholar = (slug: string) => scholarData.find((s) => s.slug === decodeURIComponent(slug));

// Pre-rendered at build time (with the about page) so links prefetch them in full and they open instantly
export function generateStaticParams() {
  return scholarData.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: pageTitle(findScholar(slug)?.name ?? "Scholar not found") };
}

// Unknown scholars get the not-found page (covers the about page too)
export default async function ScholarLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!findScholar(slug)) notFound();
  return children;
}
