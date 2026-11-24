// app/help/terms/page.tsx
import { AlertTriangle, FileText, Globe, Scale, Users } from "lucide-react";
import { TextBox, TextPage } from "@/components/text-page";

export default function TermsPage() {
  return (
    <TextPage title="Terms of service" subtitle="Please read our terms and conditions carefully" icon={FileText} parent="/help" backLabel="Back to Help">
      <div className="space-y-4">
        <TextBox icon={Scale} title="Acceptance of terms">
          By accessing and using Deeni.tube, you agree to be bound by these Terms of Service.
          If you do not agree with any part of these terms, you may choose not to use our platform.
          These terms may be updated periodically, and continued use constitutes acceptance of changes.
        </TextBox>
        <TextBox icon={Globe} title="Content & intellectual property">
          Deeni.tube aggregates publicly available Islamic educational content from trusted scholars.
          All video content remains the property of the respective content creators and is displayed
          through YouTube&apos;s embed services. We respect intellectual property rights and comply with
          all applicable laws.
        </TextBox>
        <TextBox icon={Users} title="User conduct">
          Users agree to use Deeni.tube for lawful, educational purposes only. Any misuse of the
          platform, including but not limited to harassment, spreading misinformation, or attempting
          to disrupt the service, is strictly prohibited and may result in restricted access.
        </TextBox>
        <TextBox icon={AlertTriangle} title="Disclaimer">
          Deeni.tube is provided &quot;as is&quot; without warranties of any kind. We strive to provide
          authentic and beneficial Islamic content, but we do not guarantee the accuracy, completeness,
          or suitability of any content for any particular purpose. Users are encouraged to verify
          information with qualified scholars.
        </TextBox>
      </div>
    </TextPage>
  );
}
