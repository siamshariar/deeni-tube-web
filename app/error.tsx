// app/error.tsx — shown in the page's place when it breaks; the header and menus stay
"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[80vh] items-center justify-center pt-14 md:pt-16">
      <EmptyState as="h1" icon={TriangleAlert} title="Something went wrong" description="Please try again. If it keeps happening, let us know from Help.">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Go to Home</Link>
        </Button>
      </EmptyState>
    </div>
  );
}
