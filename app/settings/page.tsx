// app/settings/page.tsx
"use client";

import { useEffect, useId, useState } from "react";
import type React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  FileText,
  Globe,
  Info,
  Mail,
  Monitor,
  Moon,
  Shield,
  Smartphone,
  Sun,
  UserRound,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { readLanguagePrefs, updateLanguagePrefs } from "@/lib/language-prefs";
import { useHydrated } from "@/lib/local-store";
import { mockLanguages } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// Same list as the language prompt (lib/mock-data), so Turkish is included here too
const settingsLanguages = mockLanguages.map((l) => ({ code: l.code, label: l.name, native: l.native }));

const NOTIFICATIONS_KEY = "deeni-notification-prefs";

type NotificationKey = "all" | "email" | "push";
type ThemeValue = "system" | "light" | "dark";

const THEME_OPTIONS: { value: ThemeValue; label: string; icon: React.ElementType }[] = [
  { value: "system", label: "Device", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const NOTIFICATION_ROWS: { key: NotificationKey; label: string; description: string; icon: React.ElementType }[] = [
  { key: "all", label: "All notifications", description: "New videos, replies and updates from Deeni.tube", icon: Bell },
  { key: "email", label: "Email", description: "Get a summary of new videos by email", icon: Mail },
  { key: "push", label: "Push notifications", description: "Alerts on this device when channels you follow upload", icon: Smartphone },
];

// YouTube-style blue for "on" states, in both themes
const SWITCH_ON = "data-[state=checked]:bg-[#065fd4] dark:data-[state=checked]:bg-[#3ea6ff] [&>span]:bg-white";

const languageLabel = (code: string) => settingsLanguages.find((l) => l.code === code)?.label ?? code;

export default function SettingsPage() {
  const { theme: rawTheme, setTheme } = useTheme();
  // next-themes only knows the theme on the client; render the server's default until hydrated
  const hydrated = useHydrated();
  const theme = hydrated ? rawTheme : undefined;

  const [notifications, setNotifications] = useState<Record<NotificationKey, boolean>>({
    all: true,
    email: false,
    push: true,
  });

  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  // Saved choice (shown in the row) vs. the draft being edited in the dialog
  const [savedLanguages, setSavedLanguages] = useState<string[]>(["en"]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["en"]);

  useEffect(() => {
    const langs = readLanguagePrefs().languages;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after hydration
    if (langs?.length) setSavedLanguages(langs);
    try {
      const stored = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "null");
      if (stored) setNotifications((prev) => ({ ...prev, ...stored }));
    } catch {}
  }, []);

  const handleThemeChange = (next: ThemeValue) => {
    setTheme(next);
    toast.success(next === "system" ? "Using your device theme" : `${next === "light" ? "Light" : "Dark"} theme on`);
  };

  const openLanguageDialog = () => {
    setSelectedLanguages(savedLanguages);
    setShowLanguageDialog(true);
  };

  const toggleDraftLanguage = (code: string) => {
    setSelectedLanguages((prev) => {
      if (!prev.includes(code)) return [...prev, code];
      // Keep at least one language selected
      return prev.length > 1 ? prev.filter((l) => l !== code) : prev;
    });
  };

  const handleLanguageSave = () => {
    setSavedLanguages(selectedLanguages);
    updateLanguagePrefs({ languages: selectedLanguages });
    toast.success("Language preferences updated");
    setShowLanguageDialog(false);
  };

  const setNotification = (key: NotificationKey, value: boolean) => {
    const next = { ...notifications, [key]: value };
    setNotifications(next);
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next));
    } catch {}
    const label = NOTIFICATION_ROWS.find((r) => r.key === key)?.label ?? key;
    toast.success(`${label} turned ${value ? "on" : "off"}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto mt-14 w-full max-w-3xl px-4 pb-16 pt-5 md:mt-16 md:px-6 md:pt-6">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose how Deeni.tube looks and what it shows you.
          </p>
        </header>

        <div className="space-y-10">
          {/* Appearance */}
          <SettingsSection
            id="appearance"
            title="Appearance"
            description="Device follows your phone or computer's light or dark setting."
          >
            <fieldset className="p-3 sm:p-4">
              <legend className="sr-only">Theme</legend>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
                  const selected = theme === value;
                  return (
                    <label
                      key={value}
                      className={cn(
                        "flex cursor-pointer flex-col gap-2 rounded-xl border-2 p-2 transition-colors",
                        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
                        selected
                          ? "border-[#065fd4] bg-[#065fd4]/5 dark:border-[#3ea6ff] dark:bg-[#3ea6ff]/10"
                          : "border-transparent bg-muted/60 hover:bg-muted"
                      )}
                    >
                      <input
                        type="radio"
                        name="theme"
                        value={value}
                        checked={selected}
                        onChange={() => handleThemeChange(value)}
                        className="sr-only"
                      />
                      <ThemePreview variant={value} />
                      <span className="flex items-center justify-center gap-1 px-0.5 pb-0.5 sm:justify-between">
                        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="truncate">{label}</span>
                        </span>
                        <span
                          aria-hidden="true"
                          className={cn(
                            // Phones only have room for the label; the border shows the choice there
                            "hidden h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 sm:flex",
                            selected
                              ? "border-[#065fd4] bg-[#065fd4] text-white dark:border-[#3ea6ff] dark:bg-[#3ea6ff] dark:text-[#0f0f0f]"
                              : "border-muted-foreground/50"
                          )}
                        >
                          {selected && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </SettingsSection>

          {/* Language & content */}
          <SettingsSection
            id="language"
            title="Language & content"
            description="Your home feed shows videos in these languages."
          >
            <div className="flex items-start gap-4 px-4 py-4">
              <RowIcon>
                <Globe />
              </RowIcon>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-5">Content languages</p>
                <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Selected languages">
                  {savedLanguages.map((code) => (
                    <li
                      key={code}
                      className="rounded-full bg-muted px-2.5 py-0.5 text-[13px] font-medium leading-5"
                    >
                      {languageLabel(code)}
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0 rounded-full px-4 font-medium"
                onClick={openLanguageDialog}
                aria-haspopup="dialog"
              >
                Change
              </Button>
            </div>
          </SettingsSection>

          {/* Notifications */}
          <SettingsSection
            id="notifications"
            title="Notifications"
            description="Choose which updates you want to receive."
          >
            {NOTIFICATION_ROWS.map(({ key, label, description, icon: Icon }) => (
              <SwitchRow
                key={key}
                icon={<Icon />}
                label={label}
                description={description}
                checked={notifications[key]}
                onCheckedChange={(value) => setNotification(key, value)}
              />
            ))}
          </SettingsSection>

          {/* Account & privacy */}
          <SettingsSection id="account" title="Account & privacy">
            <LinkRow href="/you" icon={<UserRound />} label="Account" description="Your profile, history and playlists" />
            <LinkRow href="/help/privacy" icon={<Shield />} label="Privacy & safety" description="How Deeni.tube handles your data" />
          </SettingsSection>

          {/* Help & about */}
          <SettingsSection id="help" title="Help & about">
            <LinkRow href="/help" icon={<CircleHelp />} label="Help & support" description="Get answers or contact us" />
            <LinkRow href="/help/terms" icon={<FileText />} label="Terms of service" description="The rules for using Deeni.tube" />
            <LinkRow href="/more/about" icon={<Info />} label="About Deeni.tube" description="Version 1.0.0" />
          </SettingsSection>
        </div>
      </div>

      {/* Language dialog */}
      <Dialog open={showLanguageDialog} onOpenChange={setShowLanguageDialog}>
        <DialogContent className="w-[calc(100%-2rem)] gap-0 rounded-xl p-0 sm:max-w-md">
          <DialogHeader className="px-6 pb-4 pt-6 text-left">
            <DialogTitle className="text-lg font-medium">Content languages</DialogTitle>
            <DialogDescription className="text-[13px]">
              Choose one or more languages for your home feed.
            </DialogDescription>
          </DialogHeader>
          <div role="group" aria-label="Languages" className="max-h-[50vh] overflow-y-auto px-3">
            {settingsLanguages.map((lang) => {
              const checked = selectedLanguages.includes(lang.code);
              const isLast = checked && selectedLanguages.length === 1;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  aria-disabled={isLast || undefined}
                  title={isLast ? "Keep at least one language" : undefined}
                  onClick={() => toggleDraftLanguage(lang.code)}
                  className="flex w-full items-center gap-4 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                      checked
                        ? "border-[#065fd4] bg-[#065fd4] text-white dark:border-[#3ea6ff] dark:bg-[#3ea6ff] dark:text-[#0f0f0f]"
                        : "border-muted-foreground/60"
                    )}
                  >
                    {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] leading-5">{lang.label}</span>
                    {lang.native !== lang.label && (
                      <span className="block text-[13px] leading-5 text-muted-foreground">{lang.native}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <DialogFooter className="flex-row justify-end gap-2 border-t px-6 py-4 sm:space-x-0">
            <Button variant="ghost" className="rounded-full" onClick={() => setShowLanguageDialog(false)}>
              Cancel
            </Button>
            <Button className="rounded-full px-6" onClick={handleLanguageSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Building blocks ──────────────────────────────────────────────────────────

function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`}>
      <div className="mb-3 px-1">
        <h2 id={`${id}-heading`} className="text-base font-medium leading-6">
          {title}
        </h2>
        {description && <p className="text-[13px] leading-5 text-muted-foreground">{description}</p>}
      </div>
      <div className="divide-y overflow-hidden rounded-xl border bg-card">{children}</div>
    </section>
  );
}

function RowIcon({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground [&_svg]:h-5 [&_svg]:w-5"
    >
      {children}
    </span>
  );
}

function LinkRow({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <RowIcon>{icon}</RowIcon>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-5">{label}</span>
        <span className="block truncate text-[13px] leading-5 text-muted-foreground">{description}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

function SwitchRow({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  const id = useId();
  return (
    // The whole row is the switch's label, so clicking anywhere toggles it
    <label htmlFor={id} className="flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/60">
      <RowIcon>{icon}</RowIcon>
      <span className="min-w-0 flex-1">
        <span id={`${id}-label`} className="block text-[15px] leading-5">
          {label}
        </span>
        <span id={`${id}-desc`} className="block text-[13px] leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-desc`}
        className={SWITCH_ON}
      />
    </label>
  );
}

/** Small drawing of the app in each theme; fixed colours so it reads the same in any theme. */
function ThemePreview({ variant }: { variant: ThemeValue }) {
  const pane = (dark: boolean) => (
    <div className={cn("flex h-full w-full flex-col gap-1 p-1.5", dark ? "bg-[#0f0f0f]" : "bg-white")}>
      <div className={cn("h-1.5 w-1/2 rounded-full", dark ? "bg-[#3f3f3f]" : "bg-[#e5e5e5]")} />
      <div className="grid flex-1 grid-cols-2 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn("rounded-[3px]", dark ? "bg-[#272727]" : "bg-[#f2f2f2]")} />
        ))}
      </div>
    </div>
  );
  return (
    <div aria-hidden="true" className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
      {variant === "system" ? (
        <>
          <div className="absolute inset-0">{pane(false)}</div>
          <div className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]">{pane(true)}</div>
        </>
      ) : (
        pane(variant === "dark")
      )}
    </div>
  );
}
