// app/more/about/page.tsx
import { ExternalLink, Globe, Heart, Info, Shield, Users } from "lucide-react";
import { BOX } from "@/components/page-layout";
import { TextBox, TextPage } from "@/components/text-page";
import { cn } from "@/lib/utils";

export default function AboutPage() {
  return (
    <TextPage title="About Deeni.tube" subtitle="Your trusted platform for authentic Islamic content" icon={Info} parent="/more" backLabel="Back to More">
      <div className="space-y-4">
        <TextBox icon={Globe} title="Our mission">
          Deeni.tube is dedicated to making authentic Islamic knowledge
          accessible to everyone, everywhere. We aggregate lectures from
          trusted scholars across multiple languages — English, Bangla,
          Arabic, and Urdu — so you can learn from the best, all in one
          place. Our goal is to connect people with reliable Islamic
          teachings without distractions, ads, or algorithmic noise.
        </TextBox>
        <TextBox icon={Users} title="Who we serve">
          Whether you&apos;re a student of knowledge, a busy professional
          seeking spiritual reminders, or someone exploring Islam for the
          first time — Deeni.tube is built for you. Our platform serves a
          global audience with content carefully selected from verified
          scholars known for their authenticity and adherence to the Qur&apos;an
          and Sunnah.
        </TextBox>
        <TextBox icon={Shield} title="Our commitment">
          We are committed to providing a clean, distraction‑free
          experience. No accounts required. No data sold. No ads. Just
          authentic Islamic content, carefully organized by scholar,
          category, and language — available whenever you need it. All
          content is sourced from publicly available channels and remains
          the property of the respective scholars.
        </TextBox>
        <TextBox icon={Heart} title="Built with care">
          Deeni.tube is developed and maintained by Deeni Info Tech, a
          small team passionate about using technology to serve the Ummah.
          Every feature — from the multilingual search to the curated
          scholar pages — is designed with the user&apos;s spiritual growth in
          mind. We rely on community support to keep the platform running
          and improving.
        </TextBox>

        <dl className={cn(BOX, "divide-y px-4 text-sm")}>
          <div className="flex items-center justify-between py-3">
            <dt className="font-medium">Version</dt>
            <dd className="text-muted-foreground">1.0.0</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="font-medium">Released</dt>
            <dd className="text-muted-foreground">June 2025</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="font-medium">Developer</dt>
            <dd>
              <a href="https://www.deeniinfotech.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#065fd4] dark:text-[#3ea6ff]">
                Deeni Info Tech
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </dd>
          </div>
        </dl>
      </div>
    </TextPage>
  );
}
