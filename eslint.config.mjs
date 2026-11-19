import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next.js recommended rules (flat config). `next lint` was removed in Next 16; run `npm run lint`.
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**", "out/**", "build/**", "next-env.d.ts", "test-results/**", "playwright-report/**",
    // Generated shadcn/ui code (and its helper hooks) is kept as shipped by the CLI
    "components/ui/**", "hooks/use-toast.ts", "hooks/use-mobile.tsx",
  ]),
]);
