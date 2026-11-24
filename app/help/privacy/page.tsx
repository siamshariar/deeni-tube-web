// app/help/privacy/page.tsx
import { Database, Eye, Lock, Shield, UserCheck } from "lucide-react";
import { TextBox, TextPage } from "@/components/text-page";

export default function PrivacyPage() {
  return (
    <TextPage title="Privacy & safety" subtitle="How we handle your data and keep you safe" icon={Shield} parent="/help" backLabel="Back to Help">
      <div className="space-y-4">
        <TextBox icon={Database} title="Data we collect">
          Deeni.tube collects minimal data to provide a personalized experience. This includes your
          language preferences, watch history, and saved playlists. All data is stored locally on your
          device. We do not collect any personally identifiable information without your consent.
        </TextBox>
        <TextBox icon={Lock} title="Data security">
          Your preferences and watch history are stored securely in your browser&apos;s local storage.
          No data is transmitted to external servers without your explicit permission. You can clear
          your data at any time from the Settings page or by clearing your browser data.
        </TextBox>
        <TextBox icon={Eye} title="Content visibility">
          Deeni.tube aggregates publicly available Islamic lectures from trusted scholars. All content
          displayed on the platform is sourced from publicly accessible channels. We do not host or
          store video content on our servers.
        </TextBox>
        <TextBox icon={UserCheck} title="Your rights">
          You have full control over your data. You can delete your watch history, clear preferences,
          and reset all settings at any time. No account is required to use the platform – you can
          browse as a guest with full access to all features.
        </TextBox>
      </div>
    </TextPage>
  );
}
