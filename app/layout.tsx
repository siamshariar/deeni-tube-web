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
import SaveCardHost from "@/components/save-card-host";
import DialogsHost from "@/components/dialogs-host";
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
        {/* Focus rings only while the visitor uses Tab; a click or touch removes them (html[data-keyboard], globals.css) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(d){addEventListener("keydown",function(e){if(e.key==="Tab")d.dataset.keyboard=""},true);addEventListener("pointerdown",function(){delete d.dataset.keyboard},true)})(document.documentElement)`,
          }}
        />
        {/* A reloaded Home starts at the top, as on YouTube: until it has loaded, the browser's return to the old place
            (partway down, with the chips out of sight) is undone, unless the visitor scrolls. Back keeps its place. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(location.pathname!=="/"||performance.getEntriesByType("navigation")[0].type!=="reload")return;var on=true,by=["wheel","touchstart","pointerdown","keydown"];function top(){if(on)scrollTo(0,0)}function stop(){on=false;removeEventListener("scroll",top);by.forEach(function(e){removeEventListener(e,stop,true)})}addEventListener("scroll",top);by.forEach(function(e){addEventListener(e,stop,true)});addEventListener("load",function(){setTimeout(top,0);setTimeout(stop,200)})}catch(e){}})()`,
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
          {/* Messages: at the bottom left, as on YouTube. Above the phone's bottom nav when it shows, else near the bottom edge (--toast-bottom, globals.css) */}
          <Toaster position="bottom-left" offset={{ bottom: "var(--toast-bottom)", left: "calc(16px + var(--sal))" }} mobileOffset={{ bottom: "var(--toast-bottom)" }} />
          <SaveCardHost />
          <DialogsHost />
        </ThemeProvider>
      </body>
    </html>
  );
}