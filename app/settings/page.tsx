// app/settings/page.tsx
"use client";

import { useEffect, useId, useState } from "react";
import type React from "react";
import { useTheme } from "next-themes";
import {
  Bell,
  Check,
  CircleHelp,
  FileText,
  Globe,
  Info,
  Mail,
  Monitor,
  Moon,
  MonitorPlay,
  Shield,
  SkipForward,
  Smartphone,
  Sun,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { LinkBox, LinkRow, RowIcon } from "@/components/link-row";
import { BOX_TITLE, PAGE, PAGE_NARROW, PAGE_SUBTITLE, PAGE_TITLE } from "@/components/page-layout";
import { Tick } from "@/components/tick";
import { Switch } from "@/components/ui/switch";
import { notify } from "@/lib/notify";
import { readLanguagePrefs, updateLanguagePrefs } from "@/lib/language-prefs";
import { useHydrated } from "@/lib/local-store";
import { setFeedPlayback, useFeedPlaybackSetting } from "@/lib/feed-playback";
import { mockLanguages } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// Same list as the language prompt (lib/mock-data), so Turkish is included here too
const settingsLanguages = mockLanguages.map((l) => ({ code: l.code, label: l.name, native: l.native }));

const NOTIFICATIONS_KEY = "deeni-notification-prefs";
// The watch player's Autoplay switch (components/youtube-player.tsx), saved per device
const AUTOPLAY_KEY = "deeni-autoplay";

type NotificationKey = "all" | "email" | "push";
type ThemeValue = "system" | "light" | "dark";

const THEME_OPTIONS: { value: ThemeValue; label: string; icon: React.ElementType }[] = [
  { value: "system", label: "Device", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const NOTIFICATION_ROWS: { key: NotificationKey; label: string; description: string; icon: LucideIcon }[] = [
  { key: "all", label: "All notifications", description: "New videos, replies and updates from Deeni.tube", icon: Bell },
  { key: "email", label: "Email", description: "Get a summary of new videos by email", icon: Mail },
  { key: "push", label: "Push notifications", description: "Alerts on this device when channels you follow upload", icon: Smartphone },
];

// YouTube-style blue for "on" states, in both themes
const SWITCH_ON = "data-[state=checked]:bg-[#065fd4] dark:data-[state=checked]:bg-[#3ea6ff] [&>span]:bg-white";

const listLabels = (codes: string[]) => settingsLanguages.filter((l) => codes.includes(l.code)).map((l) => l.label).join(", ");

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

  const feedPlayback = useFeedPlaybackSetting();

  // The Home feed's languages, chosen right in the list (no pop-up to open or scroll)
  const [languages, setLanguages] = useState<string[]>(["en"]);
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    const langs = readLanguagePrefs().languages;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after hydration
    if (langs?.length) setLanguages(langs);
    try {
      const stored = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "null");
      if (stored) setNotifications((prev) => ({ ...prev, ...stored }));
      if (localStorage.getItem(AUTOPLAY_KEY) === "false") setAutoplay(false);
    } catch {}
  }, []);

  const handleThemeChange = (next: ThemeValue) => {
    setTheme(next);
  };

  const toggleLanguage = (code: string) => {
    const on = languages.includes(code);
    if (on && languages.length === 1) {
      notify("Keep at least one language");
      return;
    }
    const next = on ? languages.filter((l) => l !== code) : [...languages, code];
    setLanguages(next);
    updateLanguagePrefs({ languages: next });
  };

  const changeAutoplay = (on: boolean) => {
    setAutoplay(on);
    try {
      localStorage.setItem(AUTOPLAY_KEY, String(on));
    } catch {}
  };

  const setNotification = (key: NotificationKey, value: boolean) => {
    const next = { ...notifications, [key]: value };
    setNotifications(next);
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next));
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background">
      <div className={cn(PAGE, PAGE_NARROW, "pb-16 md:pb-16")}>
        <header className="mb-6">
          <h1 className={PAGE_TITLE}>Settings</h1>
          <p className={PAGE_SUBTITLE}>Choose how Deeni.tube looks and what it shows you</p>
        </header>

        <div className="space-y-8">
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
                          <Icon className="h-4 w-4 shrink-0 max-[359px]:hidden" aria-hidden="true" />
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

          {/* Language & content: tick the languages right here (a list, not a pop-up, so nothing to scroll inside) */}
          <SettingsSection
            id="language"
            title="Language & content"
            description="Your Home feed shows videos in the languages you tick."
          >
            <div className="flex items-center gap-4 px-4 py-3">
              <RowIcon icon={Globe} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] leading-5">Content languages</span>
                <span className="block text-[13px] leading-5 text-muted-foreground" aria-live="polite">
                  {hydrated ? listLabels(languages) : "\u00a0"}
                </span>
              </span>
            </div>
            <div role="group" aria-labelledby="language-heading">
              {settingsLanguages.map((lang) => {
                const checked = languages.includes(lang.code);
                return (
                  <button
                    key={lang.code}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggleLanguage(lang.code)}
                    className="flex min-h-[48px] w-full items-center gap-4 px-4 py-2.5 text-left transition-colors can-hover:hover:bg-muted/60 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    {/* Lines up with the text above (under the 40px icon) */}
                    <span className="w-10 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1 text-[15px] leading-5">
                      {lang.label}
                      {lang.native !== lang.label && <span className="ml-2 text-[13px] text-muted-foreground">{lang.native}</span>}
                    </span>
                    <Tick checked={checked} />
                  </button>
                );
              })}
            </div>
          </SettingsSection>

          {/* Playback */}
          <SettingsSection id="playback" title="Playback" description="How videos play on this device.">
            <SwitchRow
              icon={MonitorPlay}
              label="Playback in feeds"
              description="Videos play muted in their cards as you scroll, or when you point at one with a mouse"
              checked={feedPlayback}
              onCheckedChange={setFeedPlayback}
            />
            <SwitchRow
              icon={SkipForward}
              label="Autoplay"
              description="When a video ends, the next one starts after a short countdown"
              checked={autoplay}
              onCheckedChange={changeAutoplay}
            />
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
                icon={Icon}
                label={label}
                description={description}
                checked={notifications[key]}
                onCheckedChange={(value) => setNotification(key, value)}
              />
            ))}
          </SettingsSection>

          {/* Account & privacy */}
          <SettingsSection id="account" title="Account & privacy">
            <LinkRow href="/you" icon={UserRound} label="Account" description="Your profile, history and playlists" />
            <LinkRow href="/help/privacy" icon={Shield} label="Privacy & safety" description="How Deeni.tube handles your data" />
          </SettingsSection>

          {/* Help & about */}
          <SettingsSection id="help" title="Help & about">
            <LinkRow href="/help" icon={CircleHelp} label="Help & support" description="Get answers or contact us" />
            <LinkRow href="/help/terms" icon={FileText} label="Terms of service" description="The rules for using Deeni.tube" />
            <LinkRow href="/more/about" icon={Info} label="About Deeni.tube" description="Version 1.0.0" />
          </SettingsSection>
        </div>
      </div>

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
      <div className="mb-3">
        <h2 id={`${id}-heading`} className={BOX_TITLE}>
          {title}
        </h2>
        {description && <p className="text-[13px] leading-5 text-muted-foreground">{description}</p>}
      </div>
      <LinkBox>{children}</LinkBox>
    </section>
  );
}

function SwitchRow({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  const id = useId();
  return (
    // The whole row is the switch's label, so clicking anywhere toggles it
    <label htmlFor={id} className="flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/60">
      <RowIcon icon={icon} />
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
