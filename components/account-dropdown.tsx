// components/account-dropdown.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  ChevronRight,
  LogOut,
  Moon,
  Globe,
  Settings,
  HelpCircle,
  MessageSquare,
  User,
  Users,
  Monitor,
  Sun,
  Check,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LanguagePrompt from "@/components/language-prompt";
import { openFeedback } from "@/lib/dialogs";
import { notify } from "@/lib/notify";
import { readLanguagePrefs, signOutKeepingLanguages, updateLanguagePrefs } from "@/lib/language-prefs";
import { mockLanguages } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

type ThemeMode = "system" | "light" | "dark";

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Monitor }[] = [
  { value: "system", label: "Use device theme", icon: Monitor },
  { value: "dark", label: "Dark theme", icon: Moon },
  { value: "light", label: "Light theme", icon: Sun },
];

export default function AccountDropdown() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  // YouTube-style in-place sub-page instead of a side submenu (works the same on phones)
  const [view, setView] = useState<"main" | "appearance">("main");
  const [userData, setUserData] = useState({
    name: "Guest",
    email: "",
    avatar: "",
    initials: "G",
  });
  const [languageLabel, setLanguageLabel] = useState("English");
  const [showLanguagePrompt, setShowLanguagePrompt] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("deeni-user-data");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after hydration
        setUserData({
          name: parsed.name || "Guest",
          email: parsed.email || "",
          avatar: parsed.avatar || "",
          initials: parsed.initials || getInitials(parsed.name || "Guest"),
        });
      }
    } catch {}
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      const codes = readLanguagePrefs().languages ?? ["en"];
      const names = codes.map((c) => mockLanguages.find((l) => l.code === c)?.name ?? c.toUpperCase());
      setLanguageLabel(names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", "));
    } else {
      setView("main");
    }
  };

  const handleSignOut = () => {
    signOutKeepingLanguages();
    setOpen(false);
    router.push("/signin");
  };

  const handleNavigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const currentTheme = THEME_OPTIONS.find((o) => o.value === theme) ?? THEME_OPTIONS[0];
  const themeLabel = currentTheme.value === "system" ? "Device theme" : currentTheme.label;

  const avatar = (size: string, text: string) => (
    <Avatar className={size}>
      {userData.avatar ? (
        <AvatarImage src={userData.avatar} alt="" />
      ) : (
        <AvatarFallback className={cn("bg-[#5c6bc0] text-white font-medium", text)}>
          {userData.initials}
        </AvatarFallback>
      )}
    </Avatar>
  );

  return (
    <>
      <DropdownMenu open={open} onOpenChange={handleOpenChange} closeOnScroll={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className="flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {avatar("h-8 w-8", "text-sm")}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={4}
          className="yt-scrollbar w-[300px] max-w-[calc(100vw-16px)] max-h-[calc(100dvh-72px)] overflow-y-auto rounded-xl py-2"
        >
          {view === "main" ? (
            <>
              {/* Profile header */}
              <div className="flex gap-4 px-4 pb-3 pt-2">
                {avatar("h-10 w-10 flex-shrink-0", "text-base")}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium leading-[22px]">{userData.name}</p>
                  {userData.email && (
                    <p className="truncate text-sm leading-5 text-muted-foreground">{userData.email}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => handleNavigate("/you")}
                    className="mt-2 text-sm font-medium text-[#065fd4] dark:text-[#3ea6ff]"
                  >
                    View your account
                  </button>
                </div>
              </div>

              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => handleNavigate("/you")}>
                  <User /> Your account
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleNavigate("/channels")}>
                  <Users /> Channel preferences
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleSignOut}>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setView("appearance"); }}>
                  <currentTheme.icon />
                  <span className="flex-1 truncate">Appearance: {themeLabel}</span>
                  <ChevronRight className="text-muted-foreground" />
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { setOpen(false); setShowLanguagePrompt(true); }}>
                  <Globe />
                  <span className="flex-1 truncate">Language: {languageLabel}</span>
                  <ChevronRight className="text-muted-foreground" />
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem onSelect={() => handleNavigate("/settings")}>
                <Settings /> Settings
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => handleNavigate("/help")}>
                  <HelpCircle /> Help
                </DropdownMenuItem>
                <DropdownMenuItem afterClose={openFeedback}>
                  <MessageSquare /> Send feedback
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : (
            <>
              {/* Appearance sub-page */}
              <div className="flex items-center gap-2 px-2 pb-2">
                <button
                  type="button"
                  aria-label="Back"
                  onClick={() => setView("main")}
                  className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <span className="text-base">Appearance</span>
              </div>
              <DropdownMenuSeparator className="mb-2" />
              <p className="px-4 pb-2 text-xs text-muted-foreground">Setting applies to this browser only</p>
              {THEME_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  role="menuitemradio"
                  aria-checked={theme === opt.value}
                  onSelect={(e) => { e.preventDefault(); setTheme(opt.value); setView("main"); }}
                >
                  <opt.icon />
                  <span className="flex-1">{opt.label}</span>
                  {theme === opt.value && <Check className="text-[#065fd4] dark:text-[#3ea6ff]" />}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Language Prompt */}
      <LanguagePrompt
        open={showLanguagePrompt}
        onSave={(langs) => {
          updateLanguagePrefs({ languages: langs });
          notify("Languages updated");
          setShowLanguagePrompt(false);
        }}
        onSkip={() => setShowLanguagePrompt(false)}
        initialSelected={showLanguagePrompt ? readLanguagePrefs().languages ?? ["en"] : ["en"]}
      />
    </>
  );
}