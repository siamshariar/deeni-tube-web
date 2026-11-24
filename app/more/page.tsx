// app/more/page.tsx
import { Info, MessageSquare, Star } from "lucide-react";
import { LinkBox, LinkRow } from "@/components/link-row";
import { PAGE, PAGE_NARROW, PAGE_SUBTITLE, PAGE_TITLE } from "@/components/page-layout";
import { cn } from "@/lib/utils";

export default function MorePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className={cn(PAGE, PAGE_NARROW)}>
        <div className="mb-6">
          <h1 className={PAGE_TITLE}>More</h1>
          <p className={PAGE_SUBTITLE}>Additional features and information</p>
        </div>

        <LinkBox>
          <LinkRow href="/more/rate" icon={Star} label="Rate the app" description="If you find this beneficial, please rate us" />
          <LinkRow href="/more/suggest" icon={MessageSquare} label="Suggest a feature" description="Help us improve with your ideas" />
          <LinkRow href="/more/about" icon={Info} label="About Deeni.tube" description="Version 1.0.0" />
        </LinkBox>

        <p className="py-8 text-center text-xs leading-[18px] text-muted-foreground">
          Powered by Deeni Info Tech <span aria-hidden="true">•</span> Version 1.0.0
        </p>
      </div>
    </div>
  );
}
