// app/help/get-started/page.tsx
import { BookOpen, Clock, Heart, Play, Search } from "lucide-react";
import { TextBox, TextPage } from "@/components/text-page";

export default function GetStartedPage() {
  return (
    <TextPage title="Get started" subtitle="Learn the basics of using the platform" icon={BookOpen} parent="/help" backLabel="Back to Help">
      <div className="space-y-4">
        <TextBox icon={Play} title="Watching videos">
          Browse through the home feed to discover authentic Islamic lectures from trusted scholars.
          Click any video to open the watch page where you can play, pause, and control playback.
          Related videos appear on the right side so you can continue exploring similar content.
        </TextBox>
        <TextBox icon={Search} title="Searching content">
          Use the search bar at the top of the page to find specific lectures, scholars, or topics.
          You can filter results by language (English, Bangla, Arabic, Urdu) and by specific scholars
          or channels to narrow down your search.
        </TextBox>
        <TextBox icon={Heart} title="Saving & playlists">
          Click the three‑dot menu on any video card to save it to your Watch later list or create
          custom playlists. The Playlists page lets you organize lectures by topic, scholar, or
          personal preference. Watch later is always pinned at the top for quick access.
        </TextBox>
        <TextBox icon={Clock} title="History & preferences">
          Your watch history is automatically saved so you can resume lectures where you left off.
          You can customize your language preferences and manage which channels appear in your feed
          from the Settings and Channels pages.
        </TextBox>
      </div>
    </TextPage>
  );
}
