// app/help/page.tsx
"use client";

import { useState } from "react";
import { BookOpen, Check, FileText, HelpCircle, MessageCircle, Send, Shield } from "lucide-react";
import { FormField } from "@/components/form-field";
import { LinkBox, LinkRow } from "@/components/link-row";
import { BOX, PAGE, PAGE_NARROW, PAGE_SUBTITLE, PAGE_TITLE } from "@/components/page-layout";
import { DoneNote, IconCircle } from "@/components/text-page";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const helpTopics = [
  { icon: BookOpen, label: "Get started", description: "Learn the basics of using the platform", href: "/help/get-started" },
  { icon: Shield, label: "Privacy & safety", description: "How we handle your data and keep you safe", href: "/help/privacy" },
  { icon: FileText, label: "Terms of service", description: "Read our terms and conditions", href: "/help/terms" },
  { icon: HelpCircle, label: "Community guidelines", description: "Rules and expectations for our community", href: "/help/guidelines" },
];

export default function HelpPage() {
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [supportForm, setSupportForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!supportForm.name.trim()) newErrors.name = "Name is required";
    if (!supportForm.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportForm.email))
      newErrors.email = "Please enter a valid email";
    if (!supportForm.subject.trim()) newErrors.subject = "Subject is required";
    if (!supportForm.message.trim())
      newErrors.message = "Message is required";
    else if (supportForm.message.trim().length < 10)
      newErrors.message = "Message must be at least 10 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitSupport = () => {
    if (validateForm()) {
      setIsSubmitted(true);
      setTimeout(() => {
        setShowSupportDialog(false);
        setIsSubmitted(false);
        setSupportForm({ name: "", email: "", subject: "", message: "" });
        setErrors({});
      }, 1500);
    }
  };

  const change = (field: keyof typeof supportForm, value: string) => {
    setSupportForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className={cn(PAGE, PAGE_NARROW)}>
        <div className="mb-6">
          <h1 className={PAGE_TITLE}>Help &amp; support</h1>
          <p className={PAGE_SUBTITLE}>Find answers or contact our support team</p>
        </div>

        <LinkBox className="mb-6">
          {helpTopics.map((topic) => (
            <LinkRow key={topic.href} {...topic} />
          ))}
        </LinkBox>

        <section className={cn(BOX, "flex flex-col items-center p-6 text-center md:p-8")}>
          <IconCircle icon={MessageCircle} className="mb-4 h-16 w-16 [&_svg]:h-8 [&_svg]:w-8" />
          <h2 className="text-lg font-semibold leading-7">Still need help?</h2>
          <p className="mb-5 mt-1 text-sm leading-5 text-muted-foreground">Our support team is here to assist you.</p>
          <Button onClick={() => setShowSupportDialog(true)}>Contact support</Button>
        </section>

        <p className="py-8 text-center text-xs leading-[18px] text-muted-foreground">Deeni.tube <span aria-hidden="true">•</span> Version 1.0.0</p>
      </div>

      <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contact support</DialogTitle>
            <DialogDescription>Fill out the form and we&apos;ll get back to you within 24-48 hours.</DialogDescription>
          </DialogHeader>
          {isSubmitted ? (
            <DoneNote icon={Check} title="Message sent">
              We&apos;ll get back to you soon.
            </DoneNote>
          ) : (
            <>
              <div className="space-y-4">
                <FormField label="Your name" required error={errors.name}>
                  <Input type="text" autoComplete="name" value={supportForm.name} onChange={(e) => change("name", e.target.value)} />
                </FormField>
                <FormField label="Your email" required error={errors.email}>
                  <Input type="email" autoComplete="email" value={supportForm.email} onChange={(e) => change("email", e.target.value)} />
                </FormField>
                <FormField label="Subject" required error={errors.subject}>
                  <Input type="text" value={supportForm.subject} onChange={(e) => change("subject", e.target.value)} />
                </FormField>
                <FormField label="Describe your issue" required error={errors.message}>
                  <Textarea value={supportForm.message} onChange={(e) => change("message", e.target.value)} className="min-h-[120px] resize-none" />
                </FormField>
                <p className="text-xs text-muted-foreground">* Required fields</p>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowSupportDialog(false)}>Cancel</Button>
                <Button onClick={handleSubmitSupport}>
                  <Send /> Send message
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
