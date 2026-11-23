// app/you/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Tv,
  LogOut,
  Check,
  ChevronRight,
  History,
  ListVideo,
  Settings,
  HelpCircle,
  MoreHorizontal,
  Heart,
  User as UserIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OptionSelect } from "@/components/playlist-fields";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { mockLanguages } from "@/lib/mock-data";
import { signOutKeepingLanguages, updateLanguagePrefs } from "@/lib/language-prefs";

const preferredLanguageOptions = mockLanguages.filter((l) => l.code !== "en");

export default function YouPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("User Name");
  const [userEmail, setUserEmail] = useState("user@example.com");
  const [userInitials, setUserInitials] = useState("UN");
  const [userAvatar, setUserAvatar] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>(["ar", "bn", "hi"]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [isGuest, setIsGuest] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem("deeni-user-data");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after hydration
        setUserName(parsed.name || "User Name");
        setUserEmail(parsed.email || "user@example.com");
        setUserInitials(parsed.initials || "UN");
        setUserAvatar(parsed.avatar || "");
      } catch {}
    }
    const prefs = localStorage.getItem("deeni-lang-prefs");
    if (prefs) {
      try {
        const parsed = JSON.parse(prefs);
        setIsGuest(parsed.isGuest !== false);
        if (parsed.languages) setPreferredLanguages(parsed.languages);
        if (parsed.default) setDefaultLanguage(parsed.default);
      } catch {}
    }
  }, []);

  const [prefSaved, setPrefSaved] = useState(false);
  const savePreferences = () => {
    updateLanguagePrefs({ languages: preferredLanguages, default: defaultLanguage });
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 2500);
  };

  const togglePreferredLanguage = (code: string) => {
    setPreferredLanguages((prev) =>
      prev.includes(code)
        ? prev.length > 1 ? prev.filter((l) => l !== code) : prev
        : [...prev, code]
    );
  };

  const handleSignOut = () => {
    signOutKeepingLanguages();
    router.push("/signin");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="px-3 md:px-6 py-4 md:py-6 mt-14 md:mt-16 max-w-3xl mx-auto">
          {/* Desktop title skeleton */}
          <div className="mb-6">
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>

          {/* Profile card skeleton */}
          <div className="mb-6 rounded-xl border p-4 flex items-center gap-4">
            <Skeleton className="h-14 w-14 md:h-16 md:w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>

          {/* Language card skeleton */}
          <div className="mb-6 rounded-xl border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <Skeleton className="h-10 w-full sm:w-44 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-10 w-full sm:w-auto rounded-full" />
            </div>
          </div>

          {/* Channel card skeleton */}
          <div className="rounded-xl border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-3 md:px-6 py-4 md:py-6 mt-14 md:mt-16 max-w-3xl mx-auto">
        <div className="mb-5 md:mb-6">
          <h1 className="text-xl font-bold md:text-2xl">You</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your profile and preferences
          </p>
        </div>

        {/* User Profile Card */}
        <div className="mb-6 overflow-hidden rounded-2xl border">
          <div className="flex items-center gap-4 p-4 md:gap-5 md:p-6">
            <Avatar className="h-16 w-16 flex-shrink-0 md:h-20 md:w-20">
              {userAvatar && !isGuest ? (
                <AvatarImage src={userAvatar} alt={userName} />
              ) : (
                <AvatarFallback className="bg-muted text-xl font-semibold text-foreground">
                  {isGuest ? <UserIcon className="h-8 w-8 text-muted-foreground" /> : userInitials}
                </AvatarFallback>
              )}
            </Avatar>
            {isGuest ? (
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold leading-6 md:text-xl">You&apos;re browsing as a guest</p>
                <p className="mt-1 text-sm text-muted-foreground">Sign in to sync your playlists and preferences.</p>
                <Link
                  href="/signin"
                  className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium text-[#065fd4] transition-colors hover:border-transparent hover:bg-[#def1ff] dark:text-[#3ea6ff] dark:hover:bg-[#263850]"
                >
                  <UserIcon className="h-5 w-5" /> Sign in
                </Link>
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <p className="truncate text-lg font-bold leading-6 md:text-xl">{userName}</p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{userEmail}</p>
                <button
                  type="button"
                  onClick={() => setShowSignOutDialog(true)}
                  className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Library Section — visible on mobile only; web screen uses sidebar links */}
        <div className="mb-6 overflow-hidden rounded-2xl border md:hidden">
          {[
            { href: "/history", icon: History, label: "History", desc: "Your watch history" },
            // { href: "/liked-videos", icon: ThumbsUp, label: "Liked Videos", desc: "Videos you've liked" },
            // { href: "/watch-later", icon: Clock, label: "Watch Later", desc: "Saved for later" },
            { href: "/playlists", icon: ListVideo, label: "Playlists", desc: "Your playlists" },
          ].map(({ href, icon: Icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center justify-between border-b px-4 py-3 transition-colors last:border-0 hover:bg-muted active:bg-accent"
            >
              <div className="flex items-center gap-4">
                <Icon className="h-6 w-6 flex-shrink-0" />
                <div>
                  <p className="text-[15px] font-medium leading-5">{label}</p>
                  <p className="text-[13px] leading-[18px] text-muted-foreground">{desc}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>

        {/* Language Preference Card */}
        <div className="mb-6 overflow-hidden rounded-2xl border">
          <div className="flex items-center gap-3 border-b px-4 py-3.5 md:px-5">
            <Globe className="h-5 w-5" />
            <h2 className="text-base font-medium">Language preference</h2>
          </div>
          <div className="space-y-5 p-4 md:p-5">
            {/* Default language */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-[15px] font-medium">Default language</p>
                <p className="text-[13px] text-muted-foreground">Used across the app</p>
              </div>
              <OptionSelect
                label="Language"
                value={defaultLanguage}
                onChange={setDefaultLanguage}
                options={mockLanguages.map((lang) => ({
                  value: lang.code,
                  label: lang.name,
                  description: lang.native !== lang.name ? lang.native : undefined,
                }))}
                className="sm:w-60"
              />
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Preferred languages */}
            <div>
              <p className="text-[15px] font-medium">Preferred languages</p>
              <p className="mb-3 text-[13px] text-muted-foreground">
                Select languages for content in your feed
              </p>
              <div className="border rounded-xl divide-y overflow-hidden">
                {preferredLanguageOptions.map((lang) => {
                  const isSelected = preferredLanguages.includes(lang.code);
                  return (
                    <button
                      key={lang.code}
                      onClick={() => togglePreferredLanguage(lang.code)}
                      type="button"
                      role="checkbox"
                      aria-checked={isSelected}
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted"
                    >
                      <span className="text-[15px]">{lang.name}</span>
                      <span
                        className={cn(
                          "h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Save button */}
            <div className="flex justify-end items-center gap-3">
              <Button
                onClick={savePreferences}
                className="h-10 rounded-full px-6 font-medium"
              >
                {prefSaved ? "Saved preferences" : "Save preferences"}
              </Button>
            </div>
          </div>
        </div>

        {/* Settings & More Section — visible on mobile only; web screen uses sidebar links */}
        <div className="mb-6 overflow-hidden rounded-2xl border md:hidden">
          {[
            { href: "/settings", icon: Settings, label: "Settings", desc: "App preferences" },
            { href: "/donate", icon: Heart, label: "Donate", desc: "Support the platform" },
            { href: "/help", icon: HelpCircle, label: "Help & Support", desc: "Get help, guidelines" },
            { href: "/more", icon: MoreHorizontal, label: "More", desc: "About, feedback & more" },
          ].map(({ href, icon: Icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center justify-between border-b px-4 py-3 transition-colors last:border-0 hover:bg-muted active:bg-accent"
            >
              <div className="flex items-center gap-4">
                <Icon className="h-6 w-6 flex-shrink-0" />
                <div>
                  <p className="text-[15px] font-medium leading-5">{label}</p>
                  <p className="text-[13px] leading-[18px] text-muted-foreground">{desc}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>

        {/* Channel Preference Card */}
        <div className="overflow-hidden rounded-2xl border">
          <div className="flex items-center gap-3 border-b px-4 py-3.5 md:px-5">
            <Tv className="h-5 w-5" />
            <h2 className="text-base font-medium">Channel preference</h2>
          </div>
          <Link
            href="/channels"
            className="group flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-muted md:px-5"
          >
            <div>
              <p className="text-[15px] font-medium">Manage channels</p>
              <p className="text-[13px] text-muted-foreground">Customise your channel feed</p>
            </div>
            <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Sign Out Dialog */}
      <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign out</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out? Your preferences will be saved.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              onClick={() => setShowSignOutDialog(false)}
              className="flex-1 rounded-full"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSignOut}
              className="flex-1 rounded-full"
            >
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
