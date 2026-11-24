// app/more/suggest/page.tsx
"use client";

import { useState } from "react";
import { Check, Lightbulb, Send } from "lucide-react";
import { FormField } from "@/components/form-field";
import { BulletList, DoneNote, TextBox, TextPage } from "@/components/text-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function SuggestPage() {
  const [form, setForm] = useState({ feature: "", description: "" });
  const [errors, setErrors] = useState<{ feature?: string; description?: string }>({});
  const [submitted, setSubmitted] = useState(false);

  const change = (field: "feature" | "description", value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const submit = () => {
    const next: typeof errors = {};
    if (!form.feature.trim()) next.feature = "Please describe your idea";
    if (!form.description.trim()) next.description = "Please add some details";
    else if (form.description.trim().length < 10) next.description = "Please add at least 10 characters";
    setErrors(next);
    if (Object.keys(next).length === 0) setSubmitted(true);
  };

  return (
    <TextPage title="Suggest a feature" subtitle="Help us improve Deeni.tube with your ideas" icon={Lightbulb} parent="/more" backLabel="Back to More">
      {submitted ? (
        <DoneNote icon={Check} title="Suggestion received">
          JazakAllahu Khayran for helping us improve. We review every suggestion carefully.
        </DoneNote>
      ) : (
        <>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            We&apos;re always looking for ways to make Deeni.tube better. Whether it&apos;s a new feature, a scholar you&apos;d like to see, or a language
            you&apos;d like us to support — we want to hear from you. Every suggestion is read and considered by our team.
          </p>
          <div className="space-y-4">
            <FormField label="Your idea" required error={errors.feature}>
              <Input placeholder="For example, support Urdu lectures" value={form.feature} onChange={(e) => change("feature", e.target.value)} />
            </FormField>
            <FormField label="Tell us more" required error={errors.description}>
              <Textarea
                placeholder="Describe how it would work and why it would be helpful"
                value={form.description}
                onChange={(e) => change("description", e.target.value)}
                className="min-h-[120px] resize-none"
              />
            </FormField>
            <p className="text-xs text-muted-foreground">* Required fields</p>
            <Button onClick={submit} className="h-11 w-full text-[15px]">
              <Send /> Submit suggestion
            </Button>
          </div>
          <TextBox title="Ideas we'd love to hear" className="mt-10">
            <BulletList
              items={[
                "New scholars or channels to add",
                "Additional language support",
                "Features that would help you learn better",
                "Ways to improve the browsing experience",
                "Any bugs or issues you've encountered",
              ]}
            />
          </TextBox>
        </>
      )}
    </TextPage>
  );
}
