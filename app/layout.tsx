// app/layout.tsx
import type React from "react";
import "@/app/globals.css";
import type { Metadata, Viewport } from "next";
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
import VoiceSearch from "@/components/voice-search";
import ConnectionNotice from "@/components/connection-notice";
import { Toaster } from "@/components/ui/sonner";
import { JsonLd } from "@/components/json-ld";
import { pageMeta, websiteJson } from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";

// Roboto, as on YouTube. Bangla/Arabic/Urdu titles fall back to the system's font for those scripts.
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  ...pageMeta({ title: SITE_TITLE, description: SITE_DESCRIPTION, path: "/" }),
  metadataBase: new URL(SITE_URL),
  // (a page's own title is whole, see pageMeta; this is for the not-found page)
  title: { default: SITE_TITLE, template: "%s - Deeni.tube" },
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: { title: SITE_NAME, capable: true, statusBarStyle: "default" },
  formatDetection: { telephone: false, email: false, address: false },
  category: "religion",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-y-scroll">
      <head>
        <JsonLd data={websiteJson()} />
        {/* First of all: a browser that blocks storage (all cookies blocked, some in-app browsers) throws at every use of
            it, which took the whole page down. There it is kept in memory instead, until the page is closed */}
        <script
          dangerouslySetInnerHTML={{
            __html: `["localStorage","sessionStorage"].forEach(function(n){try{var s=window[n];s.setItem("deeni-test","1");s.removeItem("deeni-test")}catch(e){var m=new Map();try{Object.defineProperty(window,n,{configurable:true,value:{getItem:function(k){k=String(k);return m.has(k)?m.get(k):null},setItem:function(k,v){m.set(String(k),String(v))},removeItem:function(k){m.delete(String(k))},clear:function(){m.clear()},key:function(i){return Array.from(m.keys())[i]||null},get length(){return m.size}}})}catch(e){}}})`,
          }}
        />
        {/* Apply the saved sidebar state before first paint (see globals.css) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("sidebar-collapsed")==="true")document.documentElement.dataset.sidebar="collapsed"}catch(e){}`,
          }}
        />
        {/* …and theater mode, so the watch page doesn't jump (lib/theater) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("deeni-theater")==="true")document.documentElement.dataset.theater=""}catch(e){}`,
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
          {/* …and its header, dark over the player (components/app-header.tsx) */}
          <script
            dangerouslySetInnerHTML={{
              __html: `try{if("theater" in document.documentElement.dataset&&/^\\/(videos|search)\\/[^/]+\\/|^\\/playlists\\/[^/]/.test(location.pathname)&&matchMedia("(min-width: 768px) and (hover: hover) and (pointer: fine)").matches)document.querySelector(".app-bar").classList.add("dark")}catch(e){}`,
            }}
          />
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
          <VoiceSearch />
          <ConnectionNotice />
        </ThemeProvider>
      </body>
    </html>
  );
}