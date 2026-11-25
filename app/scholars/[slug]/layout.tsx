import type { Metadata } from "next";
import { pageTitle } from "@/lib/page-title";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { scholarData } from "@/lib/scholar-data";
import { aboutDescription, breadcrumbsJson, ogCard, pageMeta, profileJson } from "@/lib/seo";

const findScholar = (slug: string) => scholarData.find((s) => s.slug === decodeURIComponent(slug));

// Pre-rendered at build time (with the about page) so links prefetch them in full and they open instantly
export function generateStaticParams() {
  return scholarData.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const scholar = findScholar(slug);
  if (!scholar) return { title: pageTitle("Scholar not found") };
  return pageMeta({
    title: `${scholar.name}, Islamic scholar`,
    description: aboutDescription(scholar.description, `Lectures, Shorts and playlists by the Islamic scholar ${scholar.name}, on Deeni.tube.`),
    path: `/scholars/${scholar.slug}`,
    image: ogCard(`scholar-${scholar.slug}`, scholar.name),
    type: "profile",
  });
}

// Unknown scholars get the not-found page (covers the about page too)
export default async function ScholarLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const scholar = findScholar(slug);
  if (!scholar) notFound();
  return (
    <>
      <JsonLd data={[profileJson("Person", scholar, `/scholars/${scholar.slug}`), breadcrumbsJson([["Home", "/"], ["Scholars", "/scholars"], [scholar.name, `/scholars/${scholar.slug}`]])]} />
      {children}
    </>
  );
}
