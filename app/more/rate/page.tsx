// app/more/rate/page.tsx
"use client";

import { useState } from "react";
import { Heart, Star } from "lucide-react";
import { BulletList, DoneNote, TextBox, TextHero, TextPage } from "@/components/text-page";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WORDS = ["Tap a star to rate", "Needs improvement", "It's okay", "Good", "Great", "Excellent"];

export default function RatePage() {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  return (
    <TextPage ownHeading title="Rate the app" icon={Star} parent="/more" backLabel="Back to More">
      <TextHero icon={Star} title="Enjoying Deeni.tube?">
        Your rating helps others discover authentic Islamic content and motivates us to keep improving the platform.
      </TextHero>

      {submitted ? (
        <DoneNote icon={Heart} title="JazakAllahu Khayran">
          May Allah reward you for your support.
        </DoneNote>
      ) : (
        <div className="flex flex-col items-center">
          <div role="radiogroup" aria-label="Your rating" className="flex gap-1 max-[319px]:gap-0">
            {[1, 2, 3, 4, 5].map((star) => {
              const on = star <= (hoveredRating || rating);
              return (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={rating === star}
                  aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="flex h-14 w-[min(3.5rem,17vw)] items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Star className={cn("h-10 w-10 transition-colors", on ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground")} />
                </button>
              );
            })}
          </div>
          <p className="my-4 text-sm text-muted-foreground" aria-live="polite">{WORDS[rating]}</p>
          <Button onClick={() => setSubmitted(true)} className="h-11 px-8 text-[15px]" disabled={rating === 0}>
            Submit rating
          </Button>
        </div>
      )}

      <TextBox title="Why your rating matters" className="mt-10">
        <BulletList
          items={[
            "Helps other Muslims discover authentic content",
            "Encourages us to keep the app free and ad-free",
            "Supports our mission of spreading beneficial knowledge",
            "Takes less than 10 seconds",
          ]}
        />
      </TextBox>
    </TextPage>
  );
}
