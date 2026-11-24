// app/you/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Tv,
  LogOut,
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { LinkBox, LinkRow } from "@/components/link-row";
import { BOX, BOX_TITLE, PAGE, PAGE_NARROW, PAGE_SUBTITLE, PAGE_TITLE } from "@/components/page-layout";
import { Tick } from "@/components/tick";
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
    setIsLoading(false);
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

  return (
    <div className="min-h-screen bg-background">
      <div className={cn(PAGE, PAGE_NARROW)}>
        <div className="mb-6">
          <h1 className={PAGE_TITLE}>You</h1>
          <p className={PAGE_SUBTITLE}>Manage your profile and preferences</p>
        </div>

        {/* User Profile Card */}
        <div className={cn(BOX, "mb-6 overflow-hidden")}>
          <div className="flex min-h-[152px] items-center gap-4 p-4 max-[399px]:min-h-[226px] max-[399px]:flex-col max-[399px]:justify-center max-[399px]:gap-3 max-[399px]:text-center md:min-h-[148px] md:gap-5 md:p-6">
            {isLoading ? (
              <>
                <Skeleton className="h-16 w-16 flex-shrink-0 rounded-full md:h-20 md:w-20" />
                <div className="flex-1 space-y-2.5 max-[399px]:flex max-[399px]:flex-none max-[399px]:flex-col max-[399px]:items-center">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-9 w-24 rounded-full" />
                </div>
              </>
            ) : (
            <>
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
              <div className="min-w-0 flex-1 max-[399px]:w-full max-[399px]:flex-none">
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
              <div className="min-w-0 flex-1 max-[399px]:w-full max-[399px]:flex-none">
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
            </>
            )}
          </div>
        </div>

        {/* Library — phones only; the web's sidebar has these */}
        <LinkBox className="mb-6 md:hidden">
          <LinkRow href="/history" icon={History} label="History" description="Your watch history" />
          <LinkRow href="/playlists" icon={ListVideo} label="Playlists" description="Your playlists" />
        </LinkBox>

        {/* Language Preference Card */}
        <div className={cn(BOX, "mb-6 overflow-hidden")}>
          <div className="flex items-center gap-3 border-b px-4 py-3.5 md:px-5">
            <Globe className="h-5 w-5" />
            <h2 className={BOX_TITLE}>Language preferences</h2>
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
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors active:bg-accent can-hover:hover:bg-muted/60"
                    >
                      <span className="text-[15px]">{lang.name}</span>
                      <Tick checked={isSelected} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Save button */}
            <div className="flex justify-end items-center gap-3">
              <Button onClick={savePreferences} className="px-6">
                {prefSaved ? "Preferences saved" : "Save preferences"}
              </Button>
            </div>
          </div>
        </div>

        {/* Settings and more — phones only; the web's sidebar has these */}
        <LinkBox className="mb-6 md:hidden">
          <LinkRow href="/settings" icon={Settings} label="Settings" description="App preferences" />
          <LinkRow href="/donate" icon={Heart} label="Donate" description="Support the platform" />
          <LinkRow href="/help" icon={HelpCircle} label="Help & support" description="Get help, guidelines" />
          <LinkRow href="/more" icon={MoreHorizontal} label="More" description="About, feedback and more" />
        </LinkBox>

        <LinkBox>
          <LinkRow href="/channels" icon={Tv} label="Channel preferences" description="Choose the channels on your Home feed" />
        </LinkBox>
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
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSignOutDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleSignOut}>Sign out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
