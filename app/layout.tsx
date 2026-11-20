// app/layout.tsx
import type React from "react";
import "@/app/globals.css";
import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import AppHeader from "@/components/app-header";
import DesktopSidebar from "@/components/desktop-sidebar";
import MobileNav from "@/components/mobile-nav";
import AppShell from "@/components/app-shell";
import MobileSearchModal from "@/components/mobile-search-modal";
import { HeaderProvider } from "@/app/contexts/header-context";
import { Toaster } from "@/components/ui/sonner";

// Roboto, as on YouTube. Bangla/Arabic/Urdu titles fall back to the system's font for those scripts.
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Deeni.tube - Authentic Islamic Videos",
    template: "%s - Deeni.tube",
  },
  description:
    "Watch authentic Islamic videos from trusted scholars. Browse channels, scholars, and categories for the best Islamic content.",
  generator: "v0.app",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-y-scroll">
      <head>
        {/* Apply the saved sidebar state before first paint (see globals.css) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("sidebar-collapsed")==="true")document.documentElement.dataset.sidebar="collapsed"}catch(e){}`,
          }}
        />
      </head>
      <body className={`${roboto.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <style>{`\n            @keyframes sidebarOpen {\n              from { transform: translateX(-100%); }\n              to { transform: translateX(0); }\n            }\n            @keyframes fadeIn {\n              from { opacity: 0; }\n              to { opacity: 1; }\n            }\n            .animate-sidebar-open { animation: sidebarOpen 0.3s ease-out; }\n            .animate-fade-in { animation: fadeIn 0.3s ease-out; }\n          `}</style>
          <HeaderProvider>
            <AppHeader />
            <DesktopSidebar />
            <AppShell>
              {children}
            </AppShell>
            <MobileNav />
            <MobileSearchModal />
          </HeaderProvider>
          {/* Mobile offset clears the 56px bottom nav */}
          <Toaster position="bottom-center" mobileOffset={{ bottom: 72 }} />
        </ThemeProvider>
      </body>
    </html>
  );
}