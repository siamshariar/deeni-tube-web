// app/scholars/[slug]/about/page.tsx — the scholar's About page. Same view as the profile (see
// ../scholar-view.tsx), so the About tab can switch to it instantly; this route serves direct links and reloads.
import ScholarView from "../scholar-view";

export default function ScholarAboutPage() {
  return <ScholarView />;
}
