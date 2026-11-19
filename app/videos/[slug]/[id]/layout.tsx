import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { videoData } from "@/lib/video-data";

// Links use the YouTube id; older links use the internal id
const findVideo = (id: string) => {
  const key = decodeURIComponent(id);
  return videoData.find((v) => v.videoId === key || v.id === key);
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const video = findVideo(id);
  return video ? { title: video.title, description: video.description.slice(0, 160) } : { title: "Video not found" };
}

export default async function VideoLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!findVideo(id)) notFound();
  return children;
}
