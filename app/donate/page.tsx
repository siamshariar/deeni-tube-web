// app/donate/page.tsx
"use client";

import { useState } from "react";
import { Calendar, Check, Coffee, CreditCard, Heart } from "lucide-react";
import { BOX, BOX_TITLE } from "@/components/page-layout";
import { BulletList, DoneNote, IconCircle, TextBox, TextHero, TextPage } from "@/components/text-page";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const supportOptions = [
  { id: "monthly-small", title: "Monthly supporter", amount: "$5 / month", description: "Support us with a small monthly contribution", icon: Calendar },
  { id: "monthly-medium", title: "Monthly partner", amount: "$10 / month", description: "Help us grow and reach more people", icon: Calendar },
  { id: "one-time-small", title: "One-time coffee", amount: "$5", description: "Buy us a coffee and support our work", icon: Coffee },
  { id: "one-time-medium", title: "One-time supporter", amount: "$25", description: "Make a one-time contribution to the platform", icon: Heart },
];

export default function DonatePage() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleDonate = () => {
    if (!selectedOption) return; // the button is disabled until one is chosen
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setSelectedOption(null);
    }, 2000);
  };

  return (
    <TextPage ownHeading title="Donate" icon={Heart} parent="/you">
      <TextHero icon={Heart} title="Support Deeni.tube">
        Your support helps us continue providing authentic Islamic content from trusted scholars. Every contribution makes a difference.
      </TextHero>

      <TextBox title="Why donate?" className="mb-6">
        <BulletList
          items={[
            "Keep the platform free and accessible for everyone",
            "Support authentic Islamic content creation",
            "Help us maintain and improve the app",
            "Earn rewards for ongoing charity (Sadaqah Jariyah)",
          ]}
        />
      </TextBox>

      <section className="mb-6">
        <h2 className={cn(BOX_TITLE, "mb-3")}>Choose your support</h2>
        <div role="radiogroup" aria-label="Choose your support" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {supportOptions.map((option) => {
            const selected = selectedOption === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSelectedOption(option.id)}
                className={cn(BOX, "flex items-start gap-3 p-4 text-left transition-colors active:bg-accent can-hover:hover:bg-muted/50", selected && "border-foreground ring-1 ring-foreground")}
              >
                <IconCircle icon={option.icon} className="h-10 w-10 [&_svg]:h-5 [&_svg]:w-5" />
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium leading-5">{option.title}</span>
                  <span className="mt-0.5 block text-sm font-semibold leading-5">{option.amount}</span>
                  <span className="mt-0.5 block text-[13px] leading-[18px] text-muted-foreground">{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={cn(BOX, "mb-6 p-4")}>
        <h2 className={cn(BOX_TITLE, "mb-3 flex items-center gap-2")}>
          <CreditCard className="h-5 w-5" aria-hidden="true" /> Payment method
        </h2>
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <span className="h-5 w-8 rounded bg-blue-600" aria-hidden="true" />
          <span className="text-sm">Visa ending in 4242</span>
        </div>
      </section>

      {showSuccess ? (
        <DoneNote icon={Check} title="Thank you">
          Your support means the world to us.
        </DoneNote>
      ) : (
        <Button onClick={handleDonate} className="h-11 w-full text-[15px] [&_svg]:size-5" disabled={!selectedOption}>
          <Heart /> Donate now
        </Button>
      )}
    </TextPage>
  );
}
