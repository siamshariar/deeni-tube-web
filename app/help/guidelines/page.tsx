// app/help/guidelines/page.tsx
import { Heart, HelpCircle, MessageSquare, Shield, Users } from "lucide-react";
import { TextBox, TextPage } from "@/components/text-page";

export default function GuidelinesPage() {
  return (
    <TextPage title="Community guidelines" subtitle="Rules and expectations for our community" icon={HelpCircle} parent="/help" backLabel="Back to Help">
      <div className="space-y-4">
        <TextBox icon={Heart} title="Respect & kindness">
          Deeni.tube is a platform dedicated to authentic Islamic knowledge. We expect all users to
          treat each other with respect, kindness, and good manners (adab). Constructive discussions
          are encouraged, but personal attacks, harassment, or disrespectful behavior will not be tolerated.
        </TextBox>
        <TextBox icon={Shield} title="Authenticity">
          We are committed to providing authentic Islamic content from verified scholars. Users should
          refrain from sharing unverified information, false claims, or content that contradicts
          established Islamic teachings from recognized scholars.
        </TextBox>
        <TextBox icon={MessageSquare} title="Constructive feedback">
          We welcome feedback and suggestions to improve the platform. When providing feedback,
          please be specific and constructive. Use the Contact Support form in the Help section
          to report issues, suggest features, or seek assistance.
        </TextBox>
        <TextBox icon={Users} title="Unity & brotherhood">
          As a community of learners seeking Islamic knowledge, we emphasize unity and brotherhood
          (ukhuwwah). Content that promotes division, sectarianism, or unnecessary disputes is
          discouraged. Our goal is to bring people closer to authentic Islamic teachings.
        </TextBox>
      </div>
    </TextPage>
  );
}
