// components/notification-dropdown.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  Settings,
} from "lucide-react";
import { MoreButton } from "@/components/more-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DropdownMenu as SubDropdownMenu,
  DropdownMenuContent as SubDropdownContent,
  DropdownMenuItem as SubDropdownItem,
  DropdownMenuTrigger as SubDropdownTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { videoPathForId } from "@/lib/video-url";

// ── Notification Data ──
interface Notification {
  id: string;
  channelName: string;
  channelAvatar: string;
  message: string;
  timeAgo: string;
  thumbnail?: string;
  link: string;
  isUnread: boolean;
  type: "upload" | "short" | "post" | "recommended" | "live";
}

const notifications: Notification[] = [
  {
    id: "n1",
    channelName: "Dr. Mohammad Monzur-E-Elahi",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_lLp3SxQeehJxSmd_QCmSxpFBj4k-7X-brif7v9Jz0rBg=s160-c-k-c0x00ffffff-no-rj",
    message: "uploaded: ইসলামিক হালাকা : শেষ জামানার ফিতনা",
    timeAgo: "2 hours ago",
    thumbnail: "https://img.youtube.com/vi/XVscS6piz9A/hqdefault.jpg",
    link: videoPathForId("XVscS6piz9A"),
    isUnread: true,
    type: "upload",
  },
  {
    id: "n2",
    channelName: "Dr. Khandaker Abdullah Jahangir Rh.",
    channelAvatar: "https://yt3.googleusercontent.com/stJnVilfKhMtBiIq_hXTu-9DnanUT0GNtmsRePmQvLAi6c7bhXoIIHGlYL0HqUrdEjrL0KFs7Q=s160-c-k-c0x00ffffff-no-rj",
    message: "uploaded: জীবন ঘনিষ্ঠ গুরুত্বপূর্ণ কিছু প্রশ্নোত্তর",
    timeAgo: "5 hours ago",
    thumbnail: "https://img.youtube.com/vi/908GzCFuysY/hqdefault.jpg",
    link: videoPathForId("908GzCFuysY"),
    isUnread: true,
    type: "upload",
  },
  {
    id: "n3",
    channelName: "Dr Zakir Naik",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_kgWD-o3akIt5SI_BWvWHc6mHyPRm3BA5t69TAZlqQcpIF6=s176-c-k-c0x00ffffff-no-rj-mo",
    message: "uploaded: How to Enter Paradise in the Eyes of Islam",
    timeAgo: "1 day ago",
    thumbnail: "https://img.youtube.com/vi/XNojvAddjL8/hqdefault.jpg",
    link: videoPathForId("XNojvAddjL8"),
    isUnread: true,
    type: "upload",
  },
  {
    id: "n4",
    channelName: "Dr. Mohammad Monzur-E-Elahi",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_lLp3SxQeehJxSmd_QCmSxpFBj4k-7X-brif7v9Jz0rBg=s160-c-k-c0x00ffffff-no-rj",
    message: "uploaded: তরুণদের জন্য কুরআন-সুন্নাহ নির্দেশনা (পর্ব-১)",
    timeAgo: "2 days ago",
    thumbnail: "https://img.youtube.com/vi/UugARckPloo/hqdefault.jpg",
    link: videoPathForId("UugARckPloo"),
    isUnread: false,
    type: "upload",
  },
  {
    id: "n5",
    channelName: "Dr. Khandaker Abdullah Jahangir Rh.",
    channelAvatar: "https://yt3.googleusercontent.com/stJnVilfKhMtBiIq_hXTu-9DnanUT0GNtmsRePmQvLAi6c7bhXoIIHGlYL0HqUrdEjrL0KFs7Q=s160-c-k-c0x00ffffff-no-rj",
    message: "uploaded: আত্মার তৃপ্তি কোথায়?",
    timeAgo: "3 days ago",
    thumbnail: "https://img.youtube.com/vi/rtVnA9EA0xg/hqdefault.jpg",
    link: videoPathForId("rtVnA9EA0xg"),
    isUnread: false,
    type: "upload",
  },
  {
    id: "n6",
    channelName: "Dr Zakir Naik",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_kgWD-o3akIt5SI_BWvWHc6mHyPRm3BA5t69TAZlqQcpIF6=s176-c-k-c0x00ffffff-no-rj-mo",
    message: "uploaded: খ্রিস্টান শিক্ষক VS ডাঃ জাকির নায়েক",
    timeAgo: "4 days ago",
    thumbnail: "https://img.youtube.com/vi/wli20ZZztF4/hqdefault.jpg",
    link: videoPathForId("wli20ZZztF4"),
    isUnread: false,
    type: "upload",
  },
  {
    id: "n7",
    channelName: "Dr. Mohammad Monzur-E-Elahi",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_lLp3SxQeehJxSmd_QCmSxpFBj4k-7X-brif7v9Jz0rBg=s160-c-k-c0x00ffffff-no-rj",
    message: "uploaded: প্রকৃত ঈমানদার ও তাকওয়াবান ব্যক্তির গুণাবলি",
    timeAgo: "5 days ago",
    thumbnail: "https://img.youtube.com/vi/gZ3C_UO_tZM/hqdefault.jpg",
    link: videoPathForId("gZ3C_UO_tZM"),
    isUnread: false,
    type: "upload",
  },
  {
    id: "n8",
    channelName: "Dr. Khandaker Abdullah Jahangir Rh.",
    channelAvatar: "https://yt3.googleusercontent.com/stJnVilfKhMtBiIq_hXTu-9DnanUT0GNtmsRePmQvLAi6c7bhXoIIHGlYL0HqUrdEjrL0KFs7Q=s160-c-k-c0x00ffffff-no-rj",
    message: "posted: একটি গুরুত্বপূর্ণ বার্তা",
    timeAgo: "6 days ago",
    thumbnail: undefined,
    link: "/channels/abdullah-jahangir",
    isUnread: false,
    type: "post",
  },
  {
    id: "n9",
    channelName: "Dr. Mohammad Monzur-E-Elahi",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_lLp3SxQeehJxSmd_QCmSxpFBj4k-7X-brif7v9Jz0rBg=s160-c-k-c0x00ffffff-no-rj",
    message: "uploaded: জুমু'আর খুতবাহ : কুরআন মুখী জীবন",
    timeAgo: "1 week ago",
    thumbnail: "https://img.youtube.com/vi/EtlK09Ikq4o/hqdefault.jpg",
    link: videoPathForId("EtlK09Ikq4o"),
    isUnread: false,
    type: "upload",
  },
];

// Count unread notifications
const unreadCount = notifications.filter(n => n.isUnread).length;

const importantNotifications = notifications.filter(n => n.isUnread);
const moreNotifications = notifications.filter(n => !n.isUnread);

// ── Skeleton ──
function NotificationSkeleton() {
  return (
    <div className="flex gap-3 pl-6 pr-4 py-3">
      <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-[52px] w-[86px] rounded-lg flex-shrink-0" />
      <div className="w-8 flex-shrink-0" />
    </div>
  );
}

// ── Main Component ──
export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const router = useRouter();

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 400);
    }
    setOpen(isOpen);
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpen} closeOnScroll={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full relative"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <Bell className="h-6 w-6" />
          {/* Notification count badge */}
          {unreadCount > 0 && (
            <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[calc(100vw-16px)] max-w-[480px] sm:w-[440px] md:w-[480px] p-0 py-0 overflow-hidden"
        align="end"
        sideOffset={isMobile ? 4 : 8}
        alignOffset={isMobile ? 8 : 0}
      >
        {/* Header */}
        <div className="flex h-12 items-center justify-between border-b pl-4 pr-2">
          <h2 className="text-base font-medium leading-[22px]">Notifications</h2>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent transition-colors"
            aria-label="Notification settings"
            onClick={() => { setOpen(false); router.push("/settings"); }}
          >
            <Settings className="h-6 w-6" />
          </button>
        </div>

        {/* Content: a fixed height from the first frame, so the panel opens at full size (as on YouTube)
            and the placeholder rows fill it while loading, instead of growing afterwards */}
        <div className="yt-scrollbar h-[min(560px,calc(100dvh-120px))] overflow-y-auto overscroll-contain py-2">
          {isLoading ? (
            <div aria-busy="true" aria-label="Loading notifications">
              {Array.from({ length: 8 }).map((_, i) => (
                <NotificationSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              {/* Important section */}
              {importantNotifications.length > 0 && (
                <div>
                  <h3 className="px-4 pb-1 pt-2 text-base font-medium">Important</h3>
                  {importantNotifications.map((notif) => (
                    <NotificationItem key={notif.id} notification={notif} onNavigate={() => setOpen(false)} />
                  ))}
                </div>
              )}

              {/* More notifications section */}
              {moreNotifications.length > 0 && (
                <div>
                  <h3 className="mt-2 border-t px-4 pb-1 pt-4 text-base font-medium">More notifications</h3>
                  {moreNotifications.map((notif) => (
                    <NotificationItem key={notif.id} notification={notif} onNavigate={() => setOpen(false)} />
                  ))}
                </div>
              )}

              {/* Empty state */}
              {notifications.length === 0 && (
                <div className="text-center py-14 px-4">
                  <Bell className="h-14 w-14 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No notifications yet
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    New notifications will appear here
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Hidden or muted during this visit: gone the next time the panel opens
const dismissed = new Set<string>();

// ── Notification Item (YouTube style) ──
// onNavigate closes the panel, which stays mounted across client-side navigation
function NotificationItem({ notification, onNavigate }: { notification: Notification; onNavigate: () => void }) {
  const [goneBefore] = useState(() => dismissed.has(notification.id));
  const [gone, setGone] = useState<null | "hidden" | "muted">(null);
  const dismiss = (how: "hidden" | "muted") => {
    dismissed.add(notification.id);
    setGone(how);
  };

  if (goneBefore) return null;
  // The row itself says so, with Undo
  if (gone)
    return (
      <div role="status" className="flex min-h-[72px] items-center justify-between gap-3 py-3 pl-6 pr-4 text-sm text-muted-foreground">
        <span className="min-w-0">{gone === "hidden" ? "Notification hidden" : `Notifications from ${notification.channelName} are off`}</span>
        <button
          type="button"
          onClick={() => {
            dismissed.delete(notification.id);
            setGone(null);
          }}
          className="h-9 flex-shrink-0 rounded-full px-4 font-medium text-foreground transition-colors hover:bg-accent active:bg-accent"
        >
          Undo
        </button>
      </div>
    );

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 pl-6 pr-2 py-3 hover:bg-muted transition-colors group cursor-pointer"
      )}
    >
      {/* Unread dot */}
      {notification.isUnread && (
        <span aria-label="Unread" className="absolute left-2 top-[36px] -translate-y-1/2 w-1.5 h-1.5 bg-[#065fd4] dark:bg-[#3ea6ff] rounded-full flex-shrink-0" />
      )}

      {/* Clickable link area */}
      <Link href={notification.link} onClick={onNavigate} className="flex gap-3 flex-1 min-w-0">
        {/* Channel Avatar */}
        <Avatar className="h-12 w-12 flex-shrink-0 ring-1 ring-border/50">
          <AvatarImage src={notification.channelAvatar} alt={notification.channelName} />
          <AvatarFallback className="text-xs bg-muted">
            {notification.channelName.charAt(0)}
          </AvatarFallback>
        </Avatar>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug line-clamp-2 text-foreground/90">
            <span className="font-medium text-foreground">{notification.channelName}</span>
            <span className="text-muted-foreground"> {notification.message}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {notification.timeAgo}
          </p>
        </div>

        {/* Thumbnail — always visible */}
        {notification.thumbnail ? (
          <div className="relative w-[86px] h-[52px] rounded-lg overflow-hidden flex-shrink-0 bg-muted">
            <Image
              src={notification.thumbnail}
              alt=""
              fill
              className="object-cover"
              sizes="86px"
            />
            {/* Play icon overlay for upload type */}
            {notification.type === "upload" && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
                <div className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white fill-white">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Placeholder for non-video notifications */
          <div className="w-[86px] flex-shrink-0" />
        )}
      </Link>

      {/* Three-dot menu button — always visible */}
      <SubDropdownMenu>
        <SubDropdownTrigger asChild>
          <MoreButton onClick={(e) => e.stopPropagation()} />
        </SubDropdownTrigger>
        <SubDropdownContent align="end" className="w-48 rounded-xl">
          <SubDropdownItem
            className="cursor-pointer py-2.5"
            onClick={() => dismiss("hidden")}
          >
            Hide this notification
          </SubDropdownItem>
          <SubDropdownItem
            className="cursor-pointer py-2.5"
            onClick={() => dismiss("muted")}
          >
            Mute from {notification.channelName}
          </SubDropdownItem>
        </SubDropdownContent>
      </SubDropdownMenu>
    </div>
  );
}