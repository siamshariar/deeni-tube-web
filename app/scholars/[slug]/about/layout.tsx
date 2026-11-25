import type { Metadata } from "next";
import { scholarData } from "@/lib/scholar-data";
import { ogCard, pageMeta, plainText } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const scholar = scholarData.find((s) => s.slug === decodeURIComponent(slug));
  if (!scholar) return {};
  return pageMeta({
    title: `About ${scholar.name}`,
    description: plainText(`${scholar.name}, ${scholar.designation}. ${scholar.description ?? ""} Lectures, languages and more about this scholar on Deeni.tube.`),
    path: `/scholars/${scholar.slug}/about`,
    image: ogCard(`scholar-${scholar.slug}`, scholar.name),
    type: "profile",
  });
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
