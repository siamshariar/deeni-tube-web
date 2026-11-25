import type { Metadata } from "next";
import { pageTitle } from "@/lib/page-title";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbsJson, listJson, ogCard, pageMeta, plainText } from "@/lib/seo";
import { categoryData, videoData } from "@/lib/video-data";

const findCategory = (slug: string) => categoryData.find((c) => c.slug === decodeURIComponent(slug));

// Pre-rendered at build time so links prefetch them in full and they open instantly
export function generateStaticParams() {
  return categoryData.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = findCategory(slug);
  if (!category) return { title: pageTitle("Category not found") };
  return pageMeta({
    title: `${category.name} videos`,
    description: plainText(`${category.name}: ${category.description} Watch ${category.videoCount} authentic Islamic ${category.videoCount === 1 ? "video" : "videos"} on Deeni.tube.`),
    path: `/categories/${category.slug}`,
    image: ogCard(`category-${category.slug}`, `${category.name} on Deeni.tube`),
  });
}

// Unknown categories get the not-found page instead of an empty titled page
export default async function CategoryLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = findCategory(slug);
  if (!category) notFound();
  const path = `/categories/${category.slug}`;
  return (
    <>
      <JsonLd data={[
        listJson(`${category.name} videos`, path, videoData.filter((v) => v.category === category.name).map((v) => v.id)),
        breadcrumbsJson([["Home", "/"], ["Categories", "/categories"], [category.name, path]]),
      ]} />
      {children}
    </>
  );
}
