import type { Metadata } from "next";
import { pageTitle } from "@/lib/page-title";
import { notFound } from "next/navigation";
import { categoryData } from "@/lib/video-data";

const findCategory = (slug: string) => categoryData.find((c) => c.slug === decodeURIComponent(slug));

// Pre-rendered at build time so links prefetch them in full and they open instantly
export function generateStaticParams() {
  return categoryData.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: pageTitle(findCategory(slug)?.name ?? "Category not found") };
}

// Unknown categories get the not-found page instead of an empty titled page
export default async function CategoryLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!findCategory(slug)) notFound();
  return children;
}
