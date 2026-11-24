import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center pt-14 md:pt-16">
      <EmptyState as="h1" icon={SearchX} title="Page not found" description="The page you're looking for doesn't exist or may have been moved.">
        <Button asChild>
          <Link href="/">Go to Home</Link>
        </Button>
      </EmptyState>
    </div>
  );
}
