// app/shorts/page.tsx
"use client"

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useId, useSyncExternalStore, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import { imagePriorityProps } from "@/lib/image-priority"
import {
  ChevronUp,
  ChevronDown,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Flag,
  Volume2,
  VolumeX,
  Pause,
  Play,
  List,
  MessageSquare,
  X,
  ThumbsUp,
  ThumbsDown,
  Send,
  Eye,
  Clock,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { MoreVertIcon } from "@/components/icons/more-vert-icon"

import { cn } from "@/lib/utils"
import Link from "next/link"
import { DescriptionText, hashtagHref } from "@/components/description-text"
import { ReportDialog } from "@/components/report-dialog"
import { toast } from "sonner"
import { useMediaQuery } from "@/hooks/use-media-query"
import { openShareIntent } from "@/lib/share"
import { recordWatch } from "@/hooks/useWatchHistory"
import { useLikedVideos } from "@/hooks/useLikedVideos"
import { useWatchLater } from "@/hooks/useWatchLater"
import { allowHostSound, armHost, attachHost, detachHost, hostCommand, hostFrame, hostInfo, hostLoad, hostReady, hostShowing, hostSoundAllowed, hostWanted, revealHost, setHostCropped, setHostVisible } from "@/lib/player-host"

import type { CommentReply, VideoComment } from "@/lib/types"
// ============ SHORTS DATA ============
// Shorts that aren't 9:16 videos (measured from YouTube's original-shape thumbnails, oar2.jpg): YouTube shows
// them letterboxed in the 9:16 player, so their thumbnail is framed the same way (see the poster below)
const SHORT_SHAPE: Record<string, "square" | "wide"> = {
  PUwTf64igQk: "square",
  ihdO_G6Yk0E: "square",
  _zCnmnCd7CU: "square",
  "hHpoYE-v6og": "wide",
  "Kk1_-T-8MFU": "wide",
  rTrh9VHgdwo: "wide",
}

const shortsData = [
  {
    id: "s1",
    videoId: "MBxDbbkk0gQ",
    title: "একমাত্র আল্লাহর রাজত্বই চিরস্থায়ী",
    channel: "Dr. Mohammad Monzur-E-Elahi",
    channelId: "monzur",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_lLp3SxQeehJxSmd_QCmSxpFBj4k-7X-brif7v9Jz0rBg=s160-c-k-c0x00ffffff-no-rj",
    thumbnail: "https://img.youtube.com/vi/MBxDbbkk0gQ/hqdefault.jpg",
    likes: "15K",
    comments: "1.2K",
    isSubscribed: false,
    description: `প্রফেসর ড. মোহাম্মদ মানজুরে ইলাহী
পিএইচডি, শারী'আহ অনুষদ, মদীনা ইসলামী বিশ্ববিদ্যালয়

অফিসিয়াল ইউটিউব চ্যানেল : https://www.youtube.com/@DrMohammadMonzurEElahi
অফিসিয়াল ওয়েবসাইট লিংক : https://www.monzureelahi.com/
অফিসিয়াল ফেসবুক পেইজ লিংক : https://www.facebook.com/drmonzureelahiofficial
অফিসিয়াল টেলিগ্রাম চ্যানেল লিংক : https://t.me/monzureelahi
গুরুত্বপূর্ণ আলোচনার অডিওসমূহ : https://drive.google.com/drive/u/8/folders/1MpmM1kponF81E8giNkkDPehprqk_Eflu
হোয়াটসঅ্যাপ চ্যানেল : https://whatsapp.com/channel/0029Vafrb5Q6rsQkw6IVV510

অর্গানাইজেশনসমূহ :
ইমাম বুখারী ট্রাস্ট : https://www.facebook.com/imambukharitrustbd
তাইবাহ একাডেমি : https://taibahacademy.com/
কুল্লিয়াতুল কুরআন : https://www.facebook.com/kulliyatulquran
তাইবাহ পাবলিসার্স : https://www.facebook.com/taibahpublishers`,
    views: "15,234",
    timeAgo: "2 weeks ago",
    hashtags: ["#monzureelahi", "#allah", "#islamicreminder"]
  },
  {
    id: "s2",
    videoId: "goHfO28fE-A",
    title: "যারা বলে আমাদের রব আল্লাহ",
    channel: "Dr. Mohammad Monzur-E-Elahi",
    channelId: "monzur",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_lLp3SxQeehJxSmd_QCmSxpFBj4k-7X-brif7v9Jz0rBg=s160-c-k-c0x00ffffff-no-rj",
    thumbnail: "https://img.youtube.com/vi/goHfO28fE-A/hqdefault.jpg",
    likes: "25K",
    comments: "2.1K",
    isSubscribed: true,
    description: `প্রফেসর ড. মোহাম্মদ মানজুরে ইলাহী
পিএইচডি, শারী'আহ অনুষদ, মদীনা ইসলামী বিশ্ববিদ্যালয়

অফিসিয়াল ইউটিউব চ্যানেল : https://www.youtube.com/@DrMohammadMonzurEElahi
অফিসিয়াল ওয়েবসাইট লিংক : https://www.monzureelahi.com/
অফিসিয়াল ফেসবুক পেইজ লিংক : https://www.facebook.com/drmonzureelahiofficial
অফিসিয়াল টেলিগ্রাম চ্যানেল লিংক : https://t.me/monzureelahi
গুরুত্বপূর্ণ আলোচনার অডিওসমূহ : https://drive.google.com/drive/u/8/folders/1MpmM1kponF81E8giNkkDPehprqk_Eflu
হোয়াটসঅ্যাপ চ্যানেল : https://whatsapp.com/channel/0029Vafrb5Q6rsQkw6IVV510

অর্গানাইজেশনসমূহ :
ইমাম বুখারী ট্রাস্ট : https://www.facebook.com/imambukharitrustbd
তাইবাহ একাডেমি : https://taibahacademy.com/
কুল্লিয়াতুল কুরআন : https://www.facebook.com/kulliyatulquran
তাইবাহ পাবলিসার্স : https://www.facebook.com/taibahpublishers`,
    views: "25,890",
    timeAgo: "3 days ago",
    hashtags: ["#monzureelahi", "#allah", "#islamiclecture"]
  },
  {
    id: "s3",
    videoId: "8YfQCDjlQsc",
    title: "ইমামের দূর্ব্যবহারের কারণে কেউ ওই মাসজিদে না গেলে কি অন্যায় হবে?",
    channel: "Dr. Mohammad Monzur-E-Elahi",
    channelId: "monzur",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_lLp3SxQeehJxSmd_QCmSxpFBj4k-7X-brif7v9Jz0rBg=s160-c-k-c0x00ffffff-no-rj",
    thumbnail: "https://img.youtube.com/vi/8YfQCDjlQsc/hqdefault.jpg",
    likes: "50K",
    comments: "3.5K",
    isSubscribed: false,
    description: "Dr. Mohammad Monzur-E-Elahi",
    views: "50,123",
    timeAgo: "1 week ago",
    hashtags: ["#monzureelahi", "#masjid", "#islamicqa"]
  },
  {
    id: "s4",
    videoId: "o38RKuY_AUU",
    title: "সিদ্দীকে আকবার রা.-এর দৃষ্টিতে প্রিয় নবী সা.",
    channel: "Dr. Mohammad Monzur-E-Elahi",
    channelId: "monzur",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_lLp3SxQeehJxSmd_QCmSxpFBj4k-7X-brif7v9Jz0rBg=s160-c-k-c0x00ffffff-no-rj",
    thumbnail: "https://img.youtube.com/vi/o38RKuY_AUU/hqdefault.jpg",
    likes: "18K",
    comments: "950",
    isSubscribed: false,
    description: "Dr. Mohammad Monzur-E-Elahi",
    views: "18,456",
    timeAgo: "5 days ago",
    hashtags: ["#monzureelahi", "#seerah", "#prophetmuhammad"]
  },
  {
    id: "s5",
    videoId: "oEWnPbRvOrY",
    title: "আল্লাহর পক্ষ থেকে তাওফীক প্রাপ্তি",
    channel: "Dr. Mohammad Monzur-E-Elahi",
    channelId: "monzur",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_lLp3SxQeehJxSmd_QCmSxpFBj4k-7X-brif7v9Jz0rBg=s160-c-k-c0x00ffffff-no-rj",
    thumbnail: "https://img.youtube.com/vi/oEWnPbRvOrY/hqdefault.jpg",
    likes: "22K",
    comments: "1.1K",
    isSubscribed: false,
    description: "Dr. Mohammad Monzur-E-Elahi",
    views: "22,789",
    timeAgo: "3 weeks ago",
    hashtags: ["#monzureelahi", "#tawfiq", "#islamicreminder"]
  },
  {
    id: "s6",
    videoId: "PUwTf64igQk",
    title: "এভাবে ঈমান নষ্ট করছেন নাতো?",
    channel: "Dr. Khandaker Abdullah Jahangir Rh.",
    channelId: "abdullah-jahangir",
    channelAvatar: "https://yt3.googleusercontent.com/stJnVilfKhMtBiIq_hXTu-9DnanUT0GNtmsRePmQvLAi6c7bhXoIIHGlYL0HqUrdEjrL0KFs7Q=s160-c-k-c0x00ffffff-no-rj",
    thumbnail: "https://img.youtube.com/vi/PUwTf64igQk/hqdefault.jpg",
    likes: "35K",
    comments: "2.8K",
    isSubscribed: true,
    description: `SunnahTrust
আস-সুন্নাহ ট্রাস্ট
Assunnah trust
Dr. Khandaker Abdullah Jahangir Rh Official`,
    views: "35,678",
    timeAgo: "4 days ago",
    hashtags: ["#abdullahjahangir", "#iman", "#islamicreminder"]
  },
  {
    id: "s7",
    videoId: "hHpoYE-v6og",
    title: "রোগ-ব্যাধিতে ধৈর্য ধারণ করা",
    channel: "Dr. Khandaker Abdullah Jahangir Rh.",
    channelId: "abdullah-jahangir",
    channelAvatar: "https://yt3.googleusercontent.com/stJnVilfKhMtBiIq_hXTu-9DnanUT0GNtmsRePmQvLAi6c7bhXoIIHGlYL0HqUrdEjrL0KFs7Q=s160-c-k-c0x00ffffff-no-rj",
    thumbnail: "https://img.youtube.com/vi/hHpoYE-v6og/hqdefault.jpg",
    likes: "28K",
    comments: "1.9K",
    isSubscribed: false,
    description: `SunnahTrust
আস-সুন্নাহ ট্রাস্ট
Assunnah trust
Dr. Khandaker Abdullah Jahangir Rh Official

ভিডিও লিংক: https://youtube.com/shorts/hHpoYE-v6og`,
    views: "28,901",
    timeAgo: "1 week ago",
    hashtags: ["#abdullahjahangir", "#sabr", "#patience"]
  },
  {
    id: "s8",
    videoId: "Kk1_-T-8MFU",
    title: "মহান আল্লাহ'র কাছে চাওয়ার নিয়ম",
    channel: "Dr. Khandaker Abdullah Jahangir Rh.",
    channelId: "abdullah-jahangir",
    channelAvatar: "https://yt3.googleusercontent.com/stJnVilfKhMtBiIq_hXTu-9DnanUT0GNtmsRePmQvLAi6c7bhXoIIHGlYL0HqUrdEjrL0KFs7Q=s160-c-k-c0x00ffffff-no-rj",
    thumbnail: "https://img.youtube.com/vi/Kk1_-T-8MFU/hqdefault.jpg",
    likes: "42K",
    comments: "3.2K",
    isSubscribed: false,
    description: "ড.খন্দকার আব্দুল্লাহ জাহাঙ্গীর (রঃ)",
    views: "42,345",
    timeAgo: "2 weeks ago",
    hashtags: ["#abdullahjahangir", "#dua", "#islamicdua"]
  },
  {
    id: "s9",
    videoId: "rTrh9VHgdwo",
    title: "ওজুতে ঘাড় মাসাহ করা সুন্নাহ নাকি বিদ'আত - Dr. Abu Bakar Muhammad Zakaria",
    channel: "Professor Dr. Abubakar Muhammad Zakaria",
    channelId: "abu-bakar-zakariya",
    channelAvatar: "https://yt3.googleusercontent.com/B5dEWmLpOG-j07FqzYJJW2snv2yep93R_AcnBx05lzn56r0CJdX8LtrEASS-FxW3r663GNzLHQ=s160-c-k-c0x00ffffff-no-rj",
    thumbnail: "https://img.youtube.com/vi/rTrh9VHgdwo/hqdefault.jpg",
    likes: "12K",
    comments: "850",
    isSubscribed: false,
    description: "ওজুতে ঘাড় মাসাহ করা সুন্নাহ নাকি বিদ'আত - Dr. Abu Bakar Muhammad Zakaria - Mizanur Rahman Azhari",
    views: "12,345",
    timeAgo: "1 week ago",
    hashtags: ["#abubakarzakaria", "#wudu", "#islamicqa"]
  },
  {
    id: "s10",
    videoId: "ihdO_G6Yk0E",
    title: "দুনিয়াতেই জান্নাত আছে আপনি কি জানেন? ✨ Abu Bakar Zakaria",
    channel: "Professor Dr. Abubakar Muhammad Zakaria",
    channelId: "abu-bakar-zakariya",
    channelAvatar: "https://yt3.googleusercontent.com/B5dEWmLpOG-j07FqzYJJW2snv2yep93R_AcnBx05lzn56r0CJdX8LtrEASS-FxW3r663GNzLHQ=s160-c-k-c0x00ffffff-no-rj",
    thumbnail: "https://img.youtube.com/vi/ihdO_G6Yk0E/hqdefault.jpg",
    likes: "28K",
    comments: "1.5K",
    isSubscribed: false,
    description: "দুনিয়াতে জান্নাতের স্বাদ পাওয়ার গোপন রহস্য! ✨🌿 | Abu Bakar Zakaria\n\nআমরা সবাই পরকালের জান্নাতের কথা জানি, কিন্তু আপনি কি জানেন এই দুনিয়াতেই জান্নাত বিদ্যমান?",
    views: "28,456",
    timeAgo: "3 days ago",
    hashtags: ["#abubakarzakaria", "#jannah", "#islamicshorts"]
  },
  {
    id: "s11",
    videoId: "_zCnmnCd7CU",
    title: "আদমসুমারির খাতায় মুসলমান, বাস্তবে ইমানের খাতায় নাম নাই || Dr. Mohammad Imam Hossain",
    channel: "Dr. Mohammad Imam Hossain",
    channelId: "imam-hossain",
    channelAvatar: "/placeholder.svg?height=48&width=48",
    thumbnail: "https://img.youtube.com/vi/_zCnmnCd7CU/hqdefault.jpg",
    likes: "18K",
    comments: "950",
    isSubscribed: false,
    description: "ড. মোহাম্মাদ ইমাম হোসাইন (হাফিযাহুল্লাহ্‌)\n-(পিএইচডি, ইসলামী বিশ্ববিদ্যালয়, কুষ্টিয়া)",
    views: "18,234",
    timeAgo: "5 days ago",
    hashtags: ["#imamhossain", "#iman", "#islamicreminder"]
  },
  {
    id: "s12",
    videoId: "Wgk2Hw5-m7Y",
    title: "The Quran is the Most Untranslatable Book - Dr Zakir Naik",
    channel: "Dr. Zakir Naik",
    channelId: "zakir-naik",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_kgWD-o3akIt5SI_BWvWHc6mHyPRm3BA5t69TAZlqQcpIF6=s160-c-k-c0x00ffffff-no-rj",
    thumbnail: "https://img.youtube.com/vi/Wgk2Hw5-m7Y/hqdefault.jpg",
    likes: "322",
    comments: "24",
    isSubscribed: false,
    description: "The Quran is the Most Untranslatable Book - Dr Zakir Naik\n\n#drzakirnaik #Quran",
    views: "7,959",
    timeAgo: "3 weeks ago",
    hashtags: ["#drzakirnaik", "#Quran"]
  },
  {
    id: "s17",
    videoId: "Qp4vZLEqizc",
    title: "Belief in Bad Omen is Shirk - Dr Zakir Naik",
    channel: "Dr. Zakir Naik",
    channelId: "zakir-naik",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_kgWD-o3akIt5SI_BWvWHc6mHyPRm3BA5t69TAZlqQcpIF6=s160-c-k-c0x00ffffff-no-rj",
    thumbnail: "https://img.youtube.com/vi/Qp4vZLEqizc/hqdefault.jpg",
    likes: "276",
    comments: "18",
    isSubscribed: false,
    description: "Belief in Bad Omen is Shirk - Dr Zakir Naik\n\n#drzakirnaik #BadOmen #Shirk",
    views: "4,630",
    timeAgo: "2 weeks ago",
    hashtags: ["#drzakirnaik", "#BadOmen", "#Shirk"]
  },
  {
    id: "s13",
    videoId: "0m1Mc6dX8XY",
    title: "Seek The Forgiveness of Allah #muftimenk",
    channel: "Mufti Menk",
    channelId: "mufti-menk",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_nFND09H6Vvk_P8L4djMdBusHPU8nIT6XuiRjL8M59hJsw=s160-c-k-c0x00ffffff-no-rj",
    thumbnail: "https://img.youtube.com/vi/0m1Mc6dX8XY/hqdefault.jpg",
    likes: "7.3K",
    comments: "3.2K",
    isSubscribed: false,
    description: "Seek The Forgiveness of Allah #muftimenk #motivation #dua #clean #faith",
    views: "94,721",
    timeAgo: "4 months ago",
    hashtags: ["#muftimenk", "#forgiveness", "#dua"]
  },
  {
    id: "s14",
    videoId: "HKRq0DE-GTo",
    title: "Just Don't Get Angry #muftimenk",
    channel: "Mufti Menk",
    channelId: "mufti-menk",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_nFND09H6Vvk_P8L4djMdBusHPU8nIT6XuiRjL8M59hJsw=s160-c-k-c0x00ffffff-no-rj",
    thumbnail: "https://img.youtube.com/vi/HKRq0DE-GTo/hqdefault.jpg",
    likes: "6.3K",
    comments: "1.1K",
    isSubscribed: false,
    description: "Just Don't Get Angry #muftimenk #motivation #respect #love #hadith #prophet #advice",
    views: "126,540",
    timeAgo: "1 month ago",
    hashtags: ["#muftimenk", "#anger", "#hadith"]
  },
  {
    id: "s15",
    videoId: "Tnb74r4VZaY",
    title: "Is it not permissible 2 get married in Muharram? assim al hakeem",
    channel: "Assim Al Hakeem",
    channelId: "assim-al-hakeem",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_nc1yIpeXxXdQ02ZRrAQr6HZU_gMrzljS5HFCRO4a95KH8=s160-c-k-c0x00ffffff-no-rj",
    thumbnail: "https://img.youtube.com/vi/Tnb74r4VZaY/hqdefault.jpg",
    likes: "32K",
    comments: "1.8K",
    isSubscribed: false,
    description: "Is it not permissible 2 get married in Muharram? #muharram #innovation #quran #halal assim al hakeem",
    views: "32,456",
    timeAgo: "3 days ago",
    hashtags: ["#assimalhakeem", "#muharram", "#islamicqa"]
  },
  {
    id: "s16",
    videoId: "yLMQmr7qjcM",
    title: "Read all duas of morning & evening adhkar or can we pick & choose? || assim al hakeem",
    channel: "Assim Al Hakeem",
    channelId: "assim-al-hakeem",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_nc1yIpeXxXdQ02ZRrAQr6HZU_gMrzljS5HFCRO4a95KH8=s160-c-k-c0x00ffffff-no-rj",
    thumbnail: "https://img.youtube.com/vi/yLMQmr7qjcM/hqdefault.jpg",
    likes: "25K",
    comments: "1.2K",
    isSubscribed: false,
    description: "Read all duas of morning & evening adhkar or can we pick & choose? || assim al hakeem",
    views: "25,890",
    timeAgo: "1 week ago",
    hashtags: ["#assimalhakeem", "#adhkar", "#dua"]
  },
]

// ============ COMMENTS DATA ============
const initialCommentsByVideo: Record<string, VideoComment[]> = {
  s1: [
    { id: "s1c1", user: "Ahmad Khan", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "2 hours ago", content: "MashaAllah, beautiful reminder! May Allah bless you.", likes: 245, dislikes: 12, replies: [] },
    { id: "s1c2", user: "Fatima Hassan", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "5 hours ago", content: "SubhanAllah! This is so true.", likes: 567, dislikes: 23, replies: [] },
    { id: "s1c3", user: "Omar Farooq", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "1 day ago", content: "JazakAllah khair! Very important reminder.", likes: 189, dislikes: 8, replies: [] },
  ],
  s2: [
    { id: "s2c1", user: "Yusuf Ahmed", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "1 hour ago", content: "Allahu Akbar! Beautiful reminder.", likes: 456, dislikes: 8, replies: [] },
    { id: "s2c2", user: "Zainab Hassan", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "3 hours ago", content: "JazakAllah khair. I really needed this today.", likes: 234, dislikes: 5, replies: [] },
  ],
  s3: [
    { id: "s3c1", user: "Hamza Yusuf", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "30 minutes ago", content: "Very important ruling. May Allah guide us all.", likes: 567, dislikes: 3, replies: [] },
    { id: "s3c2", user: "Noor Fatima", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "2 hours ago", content: "MashaAllah, clear explanation.", likes: 432, dislikes: 6, replies: [] },
  ],
  s4: [
    { id: "s4c1", user: "Abdullah Rahman", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "1 day ago", content: "Beautiful seerah reminder. May Allah bless our Prophet.", likes: 312, dislikes: 4, replies: [] },
  ],
  s5: [
    { id: "s5c1", user: "Khadija Omar", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "3 days ago", content: "MashaAllah, this is so beneficial. May Allah give us tawfiq.", likes: 278, dislikes: 2, replies: [] },
  ],
  s6: [
    { id: "s6c1", user: "Ibrahim Malik", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "2 hours ago", content: "SubhanAllah, such a powerful reminder about faith.", likes: 523, dislikes: 7, replies: [] },
    { id: "s6c2", user: "Aisha Begum", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "5 hours ago", content: "May Allah protect our faith. JazakAllah khair.", likes: 345, dislikes: 3, replies: [] },
  ],
  s7: [
    { id: "s7c1", user: "Mohammed Ali", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "1 day ago", content: "SubhanAllah, patience is the key. May Allah grant us sabr.", likes: 456, dislikes: 5, replies: [] },
  ],
  s8: [
    { id: "s8c1", user: "Yasmin Khan", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "3 hours ago", content: "Beautiful reminder about dua. May Allah accept our prayers.", likes: 678, dislikes: 9, replies: [] },
    { id: "s8c2", user: "Bilal Ahmed", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "6 hours ago", content: "JazakAllah khair for this important reminder.", likes: 234, dislikes: 2, replies: [] },
  ],
}

const STORAGE_COMMENTS = 'shorts_comments'
const STORAGE_LIKED = 'shorts_liked_ids'
const STORAGE_DISLIKED = 'shorts_disliked_ids'

function loadComments(): Record<string, VideoComment[]> {
  if (typeof window === 'undefined') return JSON.parse(JSON.stringify(initialCommentsByVideo))
  try {
    const raw = localStorage.getItem(STORAGE_COMMENTS)
    if (raw) { const parsed = JSON.parse(raw); if (Object.keys(parsed).length > 0) return parsed }
  } catch {}
  const def = JSON.parse(JSON.stringify(initialCommentsByVideo))
  localStorage.setItem(STORAGE_COMMENTS, JSON.stringify(def))
  return def
}

function saveComments(data: Record<string, VideoComment[]>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_COMMENTS, JSON.stringify(data))
}

function loadIds(key: string): string[] {
  if (typeof window === 'undefined') return []
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : [] } catch { return [] }
}

function saveIds(key: string, ids: string[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(ids))
}

const commentsByVideo = loadComments()

// Action buttons (like, comment, share...): white on a dark scrim over the video on phones and tablets;
// beside the video on wider screens, as YouTube's grey round buttons (#f2f2f2 light / #272727 dark)
const actionCircleClass =
  "w-12 h-12 short-screen:w-10 short-screen:h-10 rounded-full flex items-center justify-center transition-colors bg-black/40 text-white group-hover:bg-black/60 group-active:scale-95 lg:bg-secondary lg:text-foreground lg:group-hover:bg-accent"
const actionLabelClass =
  "text-xs font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.8)] lg:text-sm lg:font-normal lg:text-foreground lg:[text-shadow:none]"

// ============ YOUTUBE PLAYER MESSAGING ============
// Players are YouTube embeds driven through YouTube's postMessage protocol (enablejsapi=1).
// On iPhone, iPad and Safari the page uses the app's one shared player instead (lib/player-host.ts, on
// youtube-nocookie.com): one player for every short, so once a tap gave it sound, swiping keeps the sound.
const YT_ORIGIN = "https://www.youtube.com"
const HOST_ORIGIN = "https://www.youtube-nocookie.com"
const noSubscribe = () => () => {}
// infoDelivery.playerState values
const YT_PLAYING = 1
const YT_PAUSED = 2
const YT_BUFFERING = 3
// Shorts this many places above/below the active one keep a loaded, paused player,
// so switching to them starts playback at once instead of showing a black frame
const PRELOAD_RANGE = 1

function ytPost(iframe: HTMLIFrameElement | null | undefined, message: Record<string, unknown>) {
  iframe?.contentWindow?.postMessage(JSON.stringify(message), YT_ORIGIN)
}

function ytCommand(iframe: HTMLIFrameElement | null | undefined, func: string, args: unknown[] = []) {
  // The shared player: through lib/player-host (it keeps its own state, e.g. a muted video stays muted)
  if (iframe && iframe === hostFrame()) hostCommand(func, args)
  else ytPost(iframe, { event: "command", func, args })
}

// Mock comments use a grey placeholder image; show the commenter's initial instead
const avatarSrc = (src?: string) => (src && !src.includes("placeholder.svg") ? src : undefined)

// ============ ICON COMPONENTS ============

function CCIconOff({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" className={className}>
      <path d="M21 3H3a2 2 0 00-2 2v14a2 2 0 002 2h18a2 2 0 002-2V5a2 2 0 00-2-2ZM3 19V5h18v14H3ZM6.972 8.346c-.631.336-1.131.881-1.466 1.526A4.6 4.6 0 005 12c-.004.74.17 1.47.506 2.128.336.645.835 1.191 1.466 1.526a2.86 2.86 0 002.066.257c.697-.178 1.294-.606 1.737-1.176a1 1 0 00-1.578-1.228c-.21.27-.444.413-.654.467a.86.86 0 01-.632-.085c-.222-.119-.453-.342-.631-.684A2.64 2.64 0 017 12a2.6 2.6 0 01.281-1.205c.177-.342.408-.565.63-.684a.86.86 0 01.632-.085c.209.054.444.197.654.467a1 1 0 001.578-1.228c-.443-.57-1.04-.998-1.737-1.176a2.86 2.86 0 00-2.066.257Zm8 0c-.631.336-1.131.881-1.466 1.526A4.6 4.6 0 0013 12c-.004.74.17 1.47.506 2.128.336.645.835 1.191 1.466 1.526a2.86 2.86 0 002.066.257c.697-.178 1.294-.606 1.737-1.176a1 1 0 00-1.578-1.228c-.21.27-.444.413-.654.467a.86.86 0 01-.632-.085c-.222-.119-.453-.342-.631-.684A2.64 2.64 0 0115 12a2.6 2.6 0 01.281-1.205c.177-.342.408-.565.63-.684a.86.86 0 01.632-.085c.209.054.444.197.654.467a1 1 0 001.578-1.228c-.443-.57-1.04-.998-1.737-1.176a2.86 2.86 0 00-2.066.257Z" fill="currentColor" />
    </svg>
  )
}

function CCIconOn({ className }: { className?: string }) {
  // Letters are cut out of a currentColor box, so the icon works on dark and light backgrounds
  const maskId = useId()
  return (
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" className={className}>
      <mask id={maskId}>
        <rect x="1" y="3" width="22" height="18" rx="2" fill="white" />
        <path d="M9.038 8.089c.697.178 1.294.606 1.737 1.176a1 1 0 01-1.578 1.228c-.21-.27-.444-.413-.654-.467a.86.86 0 00-.632.085c-.222.119-.453.342-.631.684A2.64 2.64 0 007 12a2.64 2.64 0 00.281 1.205c.177.342.408.565.63.684a.86.86 0 00.632.085c.209-.054.444-.197.654-.467a1 1 0 011.578 1.228c-.443.57-1.04.998-1.737 1.176a2.86 2.86 0 01-2.066-.257c-.631-.336-1.131-.881-1.466-1.526A4.6 4.6 0 015 12c-.004-.74.17-1.47.506-2.128.336-.645.835-1.19 1.466-1.526a2.86 2.86 0 012.066-.257Zm8 0c.697.178 1.294.606 1.737 1.176a1 1 0 01-1.578 1.228c-.21-.27-.444-.413-.654-.467a.86.86 0 00-.632.085c-.222.119-.453.342-.631.684A2.64 2.64 0 0015 12a2.64 2.64 0 00.281 1.205c.177.342.408.565.63.684a.86.86 0 00.632.085c.209-.054.444-.197.654-.467a1 1 0 011.578 1.228c-.443.57-1.04.998-1.737 1.176a2.86 2.86 0 01-2.066-.257c-.631-.336-1.131-.881-1.466-1.526A4.6 4.6 0 0113 12c-.004-.74.17-1.47.506-2.128.336-.645.835-1.19 1.466-1.526a2.86 2.86 0 012.066-.257Z" fill="black" />
      </mask>
      <rect x="1" y="3" width="22" height="18" rx="2" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  )
}

function FullscreenIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" className={className}>
      <path d="M10 3H3v7c0 .265.105.52.293.707.187.188.442.293.707.293.265 0 .52-.105.707-.293C4.895 10.52 5 10.265 5 10V6.414l4.293 4.293.076.068c.192.155.435.233.68.22.247-.014.48-.118.654-.292.174-.174.278-.407.291-.653.014-.246-.064-.489-.219-.681l-.068-.076L6.414 5H10c.265 0 .52-.105.707-.293C10.895 4.52 11 4.265 11 4c0-.265-.105-.52-.293-.707C10.52 3.105 10.265 3 10 3Zm10 10c-.265 0-.52.105-.707.293-.188.187-.293.442-.293.707v3.586l-4.293-4.293-.076-.068c-.192-.155-.435-.233-.68-.22-.247.014-.48.118-.654.292-.174.174-.278.407-.291.653-.014.246.064.489.219.681l.068.076L17.586 19H14c-.265 0-.52.105-.707.293-.188.187-.293.442-.293.707 0 .265.105.52.293.707.187.188.442.293.707.293h7v-7c0-.265-.105-.52-.293-.707C20.52 13.105 20.265 13 20 13Z" fill="currentColor" />
    </svg>
  )
}

// ============ SKELETONS ============

function CommentSkeleton() {
  return (
    <div className="flex gap-3 py-3">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-14" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-2 mt-2">
          <Skeleton className="h-7 w-14 rounded-full" />
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
      </div>
    </div>
  )
}

function DescriptionSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto yt-scrollbar">
      <div className="px-4 py-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="px-4 pb-3 flex items-center gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="px-4 pb-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="px-4 pb-4 flex flex-wrap gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
    </div>
  )
}

// ============ REPLY ITEM ============

function ReplyItem({ reply, onLike, onDislike, onReplyNested }: {
  reply: CommentReply
  onLike: (commentId: string, replyId: string) => void
  onDislike: (commentId: string, replyId: string) => void
  onReplyNested: (commentId: string, replyId: string, text: string) => void
}) {
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState("")
  const isLiked = reply._isLiked || false
  const isDisliked = reply._isDisliked || false

  const handleReplySubmit = () => {
    if (!replyText.trim()) return
    onReplyNested(reply.parentId || '', reply.id, replyText.trim())
    setReplyText(""); setShowReplyInput(false)
  }

  const formatCount = (n: number) => n > 999 ? `${(n/1000).toFixed(1)}K` : String(n)

  return (
    <div className="ml-10 mt-2">
      <div className="flex gap-2.5">
        <Avatar className="h-7 w-7 flex-shrink-0"><AvatarImage src={avatarSrc(reply.avatar)} /><AvatarFallback className="bg-muted text-foreground text-xs font-medium">{reply.user.charAt(0)}</AvatarFallback></Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-foreground">@{reply.user.split(' ')[0]}</span>
            <span className="text-xs text-muted-foreground">{reply.timeAgo}</span>
          </div>
          <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap [overflow-wrap:anywhere]">{reply.content}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <button onClick={() => onLike(reply.parentId || '', reply.id)} className={cn("flex items-center gap-1.5 hover:bg-muted rounded-full px-2.5 py-1 transition-colors", isLiked ? "text-primary" : "text-muted-foreground")}>
              <ThumbsUp className={cn("h-4 w-4", isLiked && "fill-current")} />
              <span className="text-xs">{formatCount(reply.likes)}</span>
            </button>
            <button aria-label="Dislike" onClick={() => onDislike(reply.parentId || '', reply.id)} className={cn("hover:bg-muted rounded-full p-1 transition-colors", isDisliked ? "text-destructive" : "text-muted-foreground")}>
              <ThumbsDown className={cn("h-4 w-4", isDisliked && "fill-current")} />
            </button>
            <button onClick={() => setShowReplyInput(!showReplyInput)} className="text-xs font-medium text-foreground hover:bg-muted rounded-full px-2.5 py-1 transition-colors">Reply</button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button aria-label="More actions" className="h-10 w-10 -my-2 -mr-2 flex items-center justify-center hover:bg-muted rounded-full transition-colors text-foreground ml-auto">
                  <MoreVertIcon className="h-5 w-5 md:h-6 md:w-6" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                  <Flag className="h-5 w-5" /><span>Report</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {showReplyInput && (
            <div className="mt-2 flex gap-2">
              <Avatar className="h-6 w-6 flex-shrink-0"><AvatarFallback className="bg-muted text-foreground text-[10px]">Y</AvatarFallback></Avatar>
              <div className="flex-1 flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Add a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleReplySubmit() }}
                  className="flex-1 bg-transparent border-b border-border pb-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                  autoFocus
                />
                <button aria-label="Post comment" onClick={handleReplySubmit} disabled={!replyText.trim()} className="text-primary hover:text-primary/80 disabled:opacity-30">
                  <Send className="h-3.5 w-3.5" />
                </button>
                <button aria-label="Cancel reply" onClick={() => setShowReplyInput(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ COMMENT ITEM ============

function CommentItem({ comment, onLikeComment, onDislikeComment, onReplyComment, onLikeReply, onDislikeReply, onReplyNested }: {
  comment: VideoComment
  onLikeComment: (id: string) => void
  onDislikeComment: (id: string) => void
  onReplyComment: (id: string, text: string) => void
  onLikeReply: (cid: string, rid: string) => void
  onDislikeReply: (cid: string, rid: string) => void
  onReplyNested: (cid: string, rid: string, text: string) => void
}) {
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [showReplies, setShowReplies] = useState(false)
  const isLiked = comment._isLiked || false
  const isDisliked = comment._isDisliked || false

  const handleReplySubmit = () => {
    if (!replyText.trim()) return
    onReplyComment(comment.id, replyText.trim())
    setReplyText(""); setShowReplyInput(false); setShowReplies(true)
  }

  const formatCount = (n: number) => n > 999 ? `${(n/1000).toFixed(1)}K` : String(n)
  const repliesWithParent = (comment.replies || []).map((r: CommentReply) => ({ ...r, parentId: comment.id }))

  return (
    <div className="py-3">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0"><AvatarImage src={avatarSrc(comment.avatar)} /><AvatarFallback className="bg-muted text-foreground text-sm font-medium">{comment.user.charAt(0)}</AvatarFallback></Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-foreground">@{comment.user.split(' ')[0]}</span>
            <span className="text-xs text-muted-foreground">{comment.timeAgo}</span>
          </div>
          <p className="text-sm text-foreground mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{comment.content}</p>
          <div className="flex items-center gap-2 mt-2">
            <button onClick={() => onLikeComment(comment.id)} className={cn("flex items-center gap-1.5 hover:bg-muted rounded-full px-3 py-1.5 transition-colors", isLiked ? "text-primary" : "text-muted-foreground")}>
              <ThumbsUp className={cn("h-5 w-5", isLiked && "fill-current")} />
              <span className="text-xs">{formatCount(comment.likes)}</span>
            </button>
            <button aria-label="Dislike" onClick={() => onDislikeComment(comment.id)} className={cn("hover:bg-muted rounded-full p-1.5 transition-colors", isDisliked ? "text-destructive" : "text-muted-foreground")}>
              <ThumbsDown className={cn("h-5 w-5", isDisliked && "fill-current")} />
            </button>
            <button onClick={() => setShowReplyInput(!showReplyInput)} className="text-xs font-medium text-foreground hover:bg-muted rounded-full px-3 py-1.5 transition-colors">Reply</button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button aria-label="More actions" className="h-10 w-10 -my-2 -mr-2 flex items-center justify-center hover:bg-muted rounded-full transition-colors text-foreground ml-auto">
                  <MoreVertIcon className="h-5 w-5 md:h-6 md:w-6" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                  <Flag className="h-5 w-5" /><span>Report</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {showReplyInput && (
            <div className="mt-3 flex gap-2">
              <Avatar className="h-7 w-7 flex-shrink-0"><AvatarFallback className="bg-muted text-foreground text-[10px]">Y</AvatarFallback></Avatar>
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleReplySubmit() }}
                  className="flex-1 bg-transparent border-b border-border pb-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                  autoFocus
                />
                <button aria-label="Post comment" onClick={handleReplySubmit} disabled={!replyText.trim()} className="text-primary hover:text-primary/80 disabled:opacity-30">
                  <Send className="h-4 w-4" />
                </button>
                <button aria-label="Cancel reply" onClick={() => setShowReplyInput(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          {comment.replies && comment.replies.length > 0 && (
            <button onClick={() => setShowReplies(!showReplies)} className="flex items-center gap-1.5 mt-2 text-sm text-primary hover:text-primary/80 font-medium">
              <ChevronDown className={`h-4 w-4 transition-transform ${showReplies ? 'rotate-180' : ''}`} />
              {showReplies ? 'Hide' : comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      </div>
      {showReplies && repliesWithParent.map((r: CommentReply) => (
        <ReplyItem key={r.id} reply={r} onLike={onLikeReply} onDislike={onDislikeReply} onReplyNested={onReplyNested} />
      ))}
    </div>
  )
}

// ============ SHARE MODAL ============

const sharePlatforms = [
  { name: "Facebook", icon: (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48"><linearGradient id="fb5" x1="9.993%" x2="89.993%" y1="0%" y2="100%"><stop offset="0%" stopColor="#18B5FE"/><stop offset="100%" stopColor="#1277F2"/></linearGradient><path fill="url(#fb5)" d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4z"/><path fill="#fff" d="M26.707 36.301V25.5h3.613l.543-4.215h-4.156v-2.699c0-1.227.336-2.054 2.082-2.054h2.227V12.66c-.387-.047-1.707-.16-3.25-.16-3.207 0-5.41 1.957-5.41 5.559v3.102H19v4.215h3.656V36.3h4.051z"/></svg>) },
  { name: "WhatsApp", icon: (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48"><path fill="#fff" d="M4.9 43.3l2.7-9.8C5.5 30.3 4.5 26.7 4.5 23 4.5 12.3 13.3 3.5 24 3.5S43.5 12.3 43.5 23 34.7 42.5 24 42.5c-3.5 0-6.9-.9-9.9-2.7l-9.2 3.5z"/><path fill="#25D366" d="M24 5c9.9 0 18 8.1 18 18s-8.1 18-18 18c-3.2 0-6.2-.8-8.9-2.4l-1-.6-5.5 2.1 1.5-5.3-.7-1.1C5.7 31.1 5 28.6 5 26 5 16.1 13.1 8 23 8h1v-3z"/><path fill="#fff" d="M35.5 26.8c-.4-.2-2.6-1.3-3-1.4-.4-.2-.7-.3-1 .2-.3.4-1.1 1.4-1.4 1.7-.3.3-.5.3-1 .1-.4-.2-1.9-.7-3.6-2.3-1.3-1.2-2.2-2.7-2.5-3.1-.3-.4 0-.7.2-.9.2-.2.4-.5.7-.8.2-.3.3-.5.5-.8.2-.3.1-.6 0-.8-.1-.2-.9-2.4-1.2-3.3-.3-.9-.7-.8-1-.8-.3 0-.6 0-.9 0-.3 0-.8.1-1.2.6-.4.5-1.6 1.5-1.6 3.7s1.6 4.3 1.8 4.6c.2.3 3.2 4.9 7.7 6.9 1.1.5 1.9.8 2.6 1 1.1.3 2.1.3 2.9.2.9-.1 2.6-1.1 3-2.1.4-1 .4-1.9.3-2.1-.2-.2-.4-.3-.8-.5z"/></svg>) },
  { name: "X", icon: (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48"><path fill="#000" d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4z"/><path fill="#fff" d="M13 14h7.5l5.6 8 8.9-8h3.5l-10.3 9.3L38 34h-7.5l-6.3-9-9.2 9H11l10.8-9.8L13 14zm5 2.5h3l13 15h-3l-13-15z"/></svg>) },
]

function ShareModal({ isOpen, onClose, videoUrl }: { isOpen: boolean; onClose: () => void; videoUrl: string }) {
  const [copied, setCopied] = useState(false)
  const shareContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)
  const handleCopy = () => { navigator.clipboard.writeText(videoUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }
  const checkScroll = () => { const el = shareContainerRef.current; if (!el) return; setShowLeftArrow(el.scrollLeft > 10); setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 10) }
  useEffect(() => { const el = shareContainerRef.current; if (el) { el.addEventListener('scroll', checkScroll); checkScroll(); return () => el.removeEventListener('scroll', checkScroll) } }, [isOpen])
  const scrollShare = (d: 'left' | 'right') => { const el = shareContainerRef.current; if (!el) return; el.scrollBy({ left: d === 'left' ? -250 : 250, behavior: 'smooth' }) }
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card rounded-2xl w-[90vw] max-w-[540px] max-h-[85vh] overflow-hidden shadow-2xl animate-fade-in-left">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border"><h2 className="text-foreground text-lg font-semibold">Share</h2><button aria-label="Close" onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted"><X className="h-5 w-5" /></button></div>
        <div className="relative px-5 py-5">
          {showLeftArrow && <button aria-label="Scroll left" onClick={() => scrollShare('left')} className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 hover:bg-background flex items-center justify-center text-foreground shadow-lg"><ChevronLeft className="h-5 w-5" /></button>}
          {showRightArrow && <button aria-label="Scroll right" onClick={() => scrollShare('right')} className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 hover:bg-background flex items-center justify-center text-foreground shadow-lg"><ChevronRight className="h-5 w-5" /></button>}
          <div ref={shareContainerRef} className="flex gap-4 overflow-x-auto scrollbar-none py-2 px-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {sharePlatforms.map((p) => (<button type="button" key={p.name} onClick={() => openShareIntent(p.name, videoUrl)} aria-label={`Share on ${p.name}`} className="flex flex-col items-center gap-2 flex-shrink-0 w-[72px] group"><div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center group-hover:scale-110 transition-transform duration-200">{p.icon}</div><span className="text-xs text-muted-foreground group-hover:text-foreground text-center leading-tight truncate w-full">{p.name}</span></button>))}
          </div>
        </div>
        <div className="px-5 pb-5"><div className="flex items-center gap-3 bg-muted rounded-xl p-3 border border-border"><input type="text" value={videoUrl} readOnly className="flex-1 bg-transparent text-sm text-foreground outline-none truncate" /><button onClick={handleCopy} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${copied ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copied' : 'Copy'}</button></div></div>
      </div>
    </div>
  )
}

// ============ MAIN COMPONENT ============

function ShortsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)
  // A link to a short (/shorts?v=ID) starts right on it: only its player loads, with no jump from the first
  // short (this content renders on the client, inside Suspense, so the search params are known here)
  const [initialIndex] = useState(() => {
    const v = searchParams.get("v")
    const i = v ? shortsData.findIndex((short) => short.videoId === v) : -1
    return i >= 0 ? i : 0
  })
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  // Media queries (not window.innerWidth) so server and first client render match
  const isDesktopViewport = useMediaQuery("(min-width: 768px)")
  const isWideViewport = useMediaQuery("(min-width: 1440px)")
  const [isMuted, setIsMuted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const { isLiked: isLikedShort, like, unlike } = useLikedVideos()
  const { addToWatchLater, removeFromWatchLater, isInWatchLater } = useWatchLater()
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [volume, setVolume] = useState(75)
  const [, setIsFullscreen] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const [captionsEnabled, setCaptionsEnabled] = useState(false)
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  const [commentText, setCommentText] = useState("")
  const [comments, setComments] = useState<VideoComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [descLoading, setDescLoading] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [likedIds, setLikedIds] = useState<string[]>(() => loadIds(STORAGE_LIKED))
  const [dislikedIds, setDislikedIds] = useState<string[]>(() => loadIds(STORAGE_DISLIKED))
  const [desktopSidebarWidth, setDesktopSidebarWidth] = useState(240)
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null)
  const commentsTimerRef = useRef<NodeJS.Timeout | null>(null)
  const descTimerRef = useRef<NodeJS.Timeout | null>(null)
  const videoRefs = useRef<Map<string, HTMLIFrameElement>>(new Map())
  // iPhone, iPad, Safari: the shared player plays the short on screen (known after hydration)
  const hosted = useSyncExternalStore(noSubscribe, hostWanted, () => false)
  const boxRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const hostTokenRef = useRef(0)
  // The ?v= value already shown (later changes, e.g. from a notification, scroll to the new short)
  const shownVideoParamRef = useRef(searchParams.get("v"))
  // Set while a keyboard/arrow-button scroll is animating towards this index
  const scrollTargetRef = useRef<number | null>(null)
  const [videoCurrentTime, setVideoCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const videoDurationRef = useRef(0)
  const [, setIsProgressTouch] = useState(false)
  const [isProgressHovered, setIsProgressHovered] = useState(false)
  const [showPlayFeedback, setShowPlayFeedback] = useState(false)
  const playFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isSeekingRef = useRef(false)
  // Mirrors isSeekingRef for rendering (refs must not be read during render)
  const [isSeeking, setIsSeeking] = useState(false)
  const isMutedRef = useRef(isMuted)
  const volumeRef = useRef(volume)
  const captionsRef = useRef(false)
  // Player bookkeeping per <iframe> element (a short's player is recreated when it scrolls back into range)
  const readyPlayersRef = useRef(new WeakSet<HTMLIFrameElement>())   // answered the 'listening' handshake
  const primedPlayersRef = useRef(new WeakSet<HTMLIFrameElement>())  // buffered their first frames while off screen
  const playerStatesRef = useRef(new WeakMap<HTMLIFrameElement, number>())
  const currentIndexRef = useRef(initialIndex)
  const userPausedRef = useRef(false)
  // Checks after each switch that the active short really plays (see startPlayer)
  const playWatchRef = useRef<NodeJS.Timeout | null>(null)
  // Set once the active short has reported "playing" since it became active; until then, passing
  // states (unstarted, cued, the paused state left by priming) don't flip the UI to "paused"
  const activePlayedRef = useRef(false)
  // Muted because the browser blocked sound (not by the visitor): the sound comes back at their next
  // click, tap or key press
  const [autoMuted, setAutoMuted] = useState(false)
  const autoMutedRef = useRef(false)
  // Clicks that turned the sound back on; a tap on the video that does this doesn't also pause it
  const soundRestoringEventsRef = useRef(new WeakSet<Event>())
  // Time of the last scroll event: a tap that stops a swipe isn't meant as play/pause
  const lastScrollAtRef = useRef(0)
  // The active short's thumbnail stays on top until its player is actually playing
  const [startedId, setStartedId] = useState<string | null>(null)
  // Neighbouring players load once the first short has started, so they don't slow it down
  const [preloadNeighbors, setPreloadNeighbors] = useState(false)

  // Feedback dialog state
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")
  const [feedbackSent, setFeedbackSent] = useState(false)

  useEffect(() => {
    const syncSidebarWidth = () => {
      if (typeof window === "undefined") return
      const isCollapsed = typeof window.__sidebarGetState === "function"
        ? window.__sidebarGetState()
        : false
      setDesktopSidebarWidth(isCollapsed ? 72 : 240)
    }

    syncSidebarWidth()
    window.addEventListener("sidebar-state-change", syncSidebarWidth)
    window.addEventListener("resize", syncSidebarWidth)

    return () => {
      window.removeEventListener("sidebar-state-change", syncSidebarWidth)
      window.removeEventListener("resize", syncSidebarWidth)
    }
  }, [])

  const currentShort = shortsData[currentIndex]

  useEffect(() => {
    if (!currentShort) return
    const s = currentShort
    const timer = setTimeout(() => recordWatch({
      id: s.id, type: "short", videoId: s.videoId, title: s.title, channel: s.channel, channelId: s.channelId,
      channelAvatar: s.channelAvatar, thumbnail: s.thumbnail, duration: "", views: s.views, timeAgo: s.timeAgo,
    }), 1500)
    return () => clearTimeout(timer)
  }, [currentShort])

  // Sync liked/disliked to localStorage
  useEffect(() => { saveIds(STORAGE_LIKED, likedIds) }, [likedIds])
  useEffect(() => { saveIds(STORAGE_DISLIKED, dislikedIds) }, [dislikedIds])

  useEffect(() => { return () => { if (commentsTimerRef.current) clearTimeout(commentsTimerRef.current); if (descTimerRef.current) clearTimeout(descTimerRef.current) } }, [])

  // Open on the linked short: scroll there before the first paint
  useLayoutEffect(() => {
    const c = containerRef.current
    if (!c || initialIndex === 0) return
    const sectionH = (c.firstElementChild as HTMLElement)?.offsetHeight || c.clientHeight
    c.scrollTop = initialIndex * sectionH
  }, [initialIndex])

  // A new ?v= while the page is open: go to that short
  useEffect(() => {
    const v = searchParams.get("v")
    if (!v || v === shownVideoParamRef.current) return
    shownVideoParamRef.current = v
    const targetIndex = shortsData.findIndex((short) => short.videoId === v)
    const c = containerRef.current
    if (targetIndex === -1 || !c) return
    const sectionH = (c.firstElementChild as HTMLElement)?.offsetHeight || c.clientHeight
    setCurrentIndex(targetIndex)
    c.scrollTo({ top: targetIndex * sectionH, behavior: "instant" as ScrollBehavior })
  }, [searchParams])

  const loadCommentsForCurrentShort = () => {
    setCommentsLoading(true)
    setComments([])
    if (commentsTimerRef.current) clearTimeout(commentsTimerRef.current)
    commentsTimerRef.current = setTimeout(() => {
      const src = commentsByVideo[currentShort?.id] || []
      const loaded = src.map((c: VideoComment) => ({
        ...c,
        _isLiked: likedIds.includes(c.id),
        _isDisliked: dislikedIds.includes(c.id),
        replies: (c.replies || []).map((r: CommentReply) => ({
          ...r,
          _isLiked: likedIds.includes(r.id),
          _isDisliked: dislikedIds.includes(r.id),
        }))
      }))
      setComments(loaded)
      setCommentsLoading(false)
    }, 600)
  }

  const loadDescriptionForCurrentShort = () => {
    setDescLoading(true)
    if (descTimerRef.current) clearTimeout(descTimerRef.current)
    descTimerRef.current = setTimeout(() => setDescLoading(false), 400)
  }

  // Reload the open panel only when the short changes (opening a panel loads it already)
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { if (activePanel === "comments") loadCommentsForCurrentShort(); else if (activePanel === "description") loadDescriptionForCurrentShort() }, [currentIndex])

  // Handle scroll to update current index and control video playback
  useEffect(() => {
    const container = containerRef.current; if (!container) return
    const indexInView = () => {
      const sectionH = (container.firstElementChild as HTMLElement)?.offsetHeight || container.clientHeight
      return Math.max(0, Math.min(Math.round(container.scrollTop / sectionH), shortsData.length - 1))
    }
    // Scrolling has stopped: the short in view is the active one
    const settle = () => {
      scrollTargetRef.current = null
      const newIdx = indexInView()
      if (newIdx !== currentIndex) setCurrentIndex(newIdx)
    }
    const handleScroll = () => {
      lastScrollAtRef.current = Date.now()
      setIsScrolling(true)
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
      // Fallback for browsers without the 'scrollend' event
      scrollTimeout.current = setTimeout(() => { setIsScrolling(false); settle() }, 250)
      // A keyboard/arrow scroll already set the index; don't flip it back halfway through the animation
      if (scrollTargetRef.current !== null) return
      const newIdx = indexInView()
      if (newIdx !== currentIndex) setCurrentIndex(newIdx)
    }
    const handleScrollEnd = () => {
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
      setIsScrolling(false)
      settle()
    }
    container.addEventListener("scroll", handleScroll, { passive: true })
    container.addEventListener("scrollend", handleScrollEnd)
    return () => {
      container.removeEventListener("scroll", handleScroll)
      container.removeEventListener("scrollend", handleScrollEnd)
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    }
  }, [currentIndex])

  // Guarantee controls always appear after every video switch (safety net for long snap animations)
  useEffect(() => {
    const timer = setTimeout(() => setIsScrolling(false), 500)
    return () => clearTimeout(timer)
  }, [currentIndex])

  // YouTube only sends events after the page says it's 'listening'; repeat until the player answers
  const registerPlayer = useCallback((id: string) => {
    let tries = 0
    const ping = () => {
      const iframe = videoRefs.current.get(id)
      if (!iframe?.isConnected || readyPlayersRef.current.has(iframe) || tries++ >= 60) return
      ytPost(iframe, { event: "listening", id })
      setTimeout(ping, tries < 20 ? 250 : 1000)
    }
    ping()
  }, [])

  // Browsers only allow playback with sound once the visitor has clicked, tapped or pressed a key on the
  // page (scrolling with the mouse wheel or a swipe doesn't count). Until then, play muted, as YouTube does.
  const muteAutomatically = useCallback(() => {
    isMutedRef.current = true
    autoMutedRef.current = true
    setIsMuted(true)
    setAutoMuted(true)
  }, [])

  // Start the active short's player with the current mute/volume/captions settings
  const startPlayer = useCallback((id: string) => {
    const iframe = videoRefs.current.get(id)
    if (!iframe) return
    // The shared player before any tap (opened from a link): Safari would stop it if asked for sound, so play
    // it muted with "Tap to unmute" (that tap gives it sound for the rest of the visit)
    if (iframe === hostFrame() && !isMutedRef.current && !hostSoundAllowed()) muteAutomatically()
    ytCommand(iframe, isMutedRef.current ? "mute" : "unMute")
    ytCommand(iframe, "setVolume", [volumeRef.current])
    if (captionsRef.current) ytCommand(iframe, "loadModule", ["captions"])
    ytCommand(iframe, "playVideo")
    // Watchdog: a play command can get lost while the player is busy (loading, seeking), which left shorts
    // paused. Check that it really plays and ask again if not. If it still won't start, play muted as a last
    // resort (normally the player reports a blocked autoplay right away: see onAutoplayBlocked below).
    if (playWatchRef.current) clearTimeout(playWatchRef.current)
    let attempts = 0
    const check = () => {
      playWatchRef.current = null
      if (shortsData[currentIndexRef.current]?.id !== id || userPausedRef.current || !iframe.isConnected) return
      const state = playerStatesRef.current.get(iframe)
      if (state === YT_PLAYING) return
      attempts++
      if (state !== YT_BUFFERING) {
        // (Not the shared player: muted there, every later short would stay muted until a tap)
        if (attempts >= 3 && !isMutedRef.current && iframe !== hostFrame()) {
          muteAutomatically()
          ytCommand(iframe, "mute")
        }
        ytCommand(iframe, "playVideo")
      }
      if (attempts < 5) playWatchRef.current = setTimeout(check, 1000)
      // Give up: show the play button, so a tap starts it
      else if (state !== YT_BUFFERING) setIsPlaying(false)
    }
    playWatchRef.current = setTimeout(check, 1000)
  }, [muteAutomatically])

  useEffect(() => () => { if (playWatchRef.current) clearTimeout(playWatchRef.current) }, [])

  // Turn the sound back on after it was muted automatically (inside a tap, click or key press)
  const restoreSound = useCallback(() => {
    if (!autoMutedRef.current) return false
    allowHostSound()
    autoMutedRef.current = false
    setAutoMuted(false)
    isMutedRef.current = false
    setIsMuted(false)
    const activeId = shortsData[currentIndexRef.current]?.id
    if (activeId && !userPausedRef.current) startPlayer(activeId)
    return true
  }, [startPlayer])

  // The visitor's first click or key press allows sound: bring it back (except on the mute button itself,
  // which handles the click)
  useEffect(() => {
    const onInteract = (e: Event) => {
      if (!autoMutedRef.current) return
      if (e instanceof KeyboardEvent && (e.key === "Escape" || e.repeat)) return
      if ((e.target as Element | null)?.closest?.("[data-mute-toggle]")) return
      const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
      if (activation && !activation.hasBeenActive) return
      if (restoreSound()) soundRestoringEventsRef.current.add(e)
    }
    window.addEventListener("click", onInteract, true)
    window.addEventListener("keydown", onInteract, true)
    return () => {
      window.removeEventListener("click", onInteract, true)
      window.removeEventListener("keydown", onInteract, true)
    }
  }, [restoreSound])

  // Neighbouring players load a moment after the first short starts, when the browser is idle, so
  // they don't compete with it (each YouTube player is a lot of script). Fallback: after 6s anyway.
  const neighborTimerRef = useRef<NodeJS.Timeout | null>(null)
  const scheduleNeighbors = useCallback((delay: number) => {
    if (neighborTimerRef.current) return
    neighborTimerRef.current = setTimeout(() => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
      if (ric) ric(() => setPreloadNeighbors(true), { timeout: 2000 })
      else setPreloadNeighbors(true)
    }, delay)
  }, [])
  useEffect(() => {
    const t = setTimeout(() => scheduleNeighbors(0), 6000)
    return () => {
      clearTimeout(t)
      if (neighborTimerRef.current) clearTimeout(neighborTimerRef.current)
    }
  }, [scheduleNeighbors])

  // Listen to the YouTube players: readiness, progress and play state
  useEffect(() => {
    const onYTMessage = (e: MessageEvent) => {
      if (e.origin !== YT_ORIGIN && e.origin !== HOST_ORIGIN) return
      let d
      try { d = typeof e.data === "string" ? JSON.parse(e.data) : e.data } catch { return }
      // Which short's player sent it?
      let id: string | undefined
      videoRefs.current.forEach((f, key) => { if (f.contentWindow && f.contentWindow === e.source) id = key })
      const iframe = id ? videoRefs.current.get(id) : undefined
      if (!id || !iframe) return
      const isActivePlayer = id === shortsData[currentIndexRef.current]?.id

      if ((d?.event === "onReady" || d?.event === "initialDelivery") && !readyPlayersRef.current.has(iframe)) {
        readyPlayersRef.current.add(iframe)
        // Ask to be told when the browser blocks playback (YouTube only sends this event on request)
        ytCommand(iframe, "addEventListener", ["onAutoplayBlocked"])
        if (isActivePlayer) startPlayer(id)
        else if (shortsData[currentIndexRef.current + 1]?.id === id) {
          // The next short: play it muted until it starts, then pause it (below) so it begins buffering
          ytCommand(iframe, "mute")
          ytCommand(iframe, "playVideo")
        }
      }

      if (d?.event === "onAutoplayBlocked") {
        if (!isActivePlayer || userPausedRef.current) return
        if (!isMutedRef.current) {
          // Sound isn't allowed yet: play muted right away instead of sitting paused
          muteAutomatically()
          ytCommand(iframe, "mute")
          ytCommand(iframe, "playVideo")
        } else setIsPlaying(false) // even muted playback is blocked: show the play button
        return
      }

      if ((d?.event !== "infoDelivery" && d?.event !== "initialDelivery") || !d.info) return
      // The shared player still reporting the short before (or the placeholder): not this short's state
      if (iframe === hostFrame()) {
        const showing = d.info.videoData?.video_id ?? hostShowing()
        if (showing && showing !== shortsData[currentIndexRef.current]?.videoId) return
      }
      const state = d.info.playerState
      if (typeof state === "number") playerStatesRef.current.set(iframe, state)

      if (!isActivePlayer) {
        // The next short has started (muted, hidden under its thumbnail): pause it back at the beginning.
        // This loads its stream ahead of time, which roughly halves the wait when you switch to it.
        if (state === YT_PLAYING && !primedPlayersRef.current.has(iframe)) {
          primedPlayersRef.current.add(iframe)
          ytCommand(iframe, "pauseVideo")
          ytCommand(iframe, "seekTo", [0, true])
        }
        return
      }

      if (typeof d.info.currentTime === "number") setVideoCurrentTime(d.info.currentTime)
      if (typeof d.info.duration === "number" && d.info.duration > 0) {
        videoDurationRef.current = d.info.duration
        setVideoDuration(d.info.duration)
      }
      if (typeof state === "number") {
        if (state === YT_PLAYING) {
          activePlayedRef.current = true
          setIsPlaying(true)
          // The shared player: shown (and the thumbnail hidden) once YouTube has drawn it at this size
          if (iframe === hostFrame()) revealHost(() => { if (shortsData[currentIndexRef.current]?.id === id) setStartedId(id) })
          else setStartedId(id)
          scheduleNeighbors(1500)
        }
        // Only a real pause after it has played. Unstarted/cued/ended are passing states while switching
        // or looping, and showed a "paused" short that was in fact starting.
        else if (state === YT_PAUSED && activePlayedRef.current) setIsPlaying(false)
      }
    }
    window.addEventListener("message", onYTMessage)
    return () => window.removeEventListener("message", onYTMessage)
  }, [startPlayer, scheduleNeighbors, muteAutomatically])

  // The shared player: created with the opening short if no tap made it yet (before the effect below, which
  // attaches it); let go when leaving Shorts
  useEffect(() => {
    if (!hosted) return
    armHost(shortsData[currentIndexRef.current]?.videoId)
    return () => detachHost(hostTokenRef.current)
  }, [hosted])

  // Switching shorts: reset progress, pause the one that left, play the new one
  useEffect(() => {
    currentIndexRef.current = currentIndex
    const activeId = shortsData[currentIndex]?.id
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets player state for the new short; the same effect talks to the YouTube iframes
    setVideoCurrentTime(0)
    setVideoDuration(0)
    videoDurationRef.current = 0
    setIsPlaying(true)
    setStartedId(null)
    userPausedRef.current = false
    activePlayedRef.current = false
    if (playWatchRef.current) clearTimeout(playWatchRef.current)
    if (hosted) {
      // The shared player moves to this short and loads it (keeping the sound if it has it)
      const frame = hostFrame()
      const box = activeId ? boxRefs.current.get(activeId) : undefined
      videoRefs.current.clear()
      if (!activeId || !frame || !box) return
      videoRefs.current.set(activeId, frame)
      playerStatesRef.current.delete(frame)
      hostTokenRef.current = attachHost(box, "short")
      setHostVisible(false)
      hostLoad(shortsData[currentIndex].videoId, !isMutedRef.current)
      // Not ready yet: its onReady message starts it
      if (hostReady()) {
        if (!readyPlayersRef.current.has(frame)) {
          readyPlayersRef.current.add(frame)
          ytCommand(frame, "addEventListener", ["onAutoplayBlocked"])
        }
        // A tap may have started this short already (YouTube only reports changes, so take what it said)
        const info = hostInfo()
        if (hostShowing() === shortsData[currentIndex].videoId) {
          if (typeof info.duration === "number" && info.duration > 0) {
            videoDurationRef.current = info.duration
            setVideoDuration(info.duration)
          }
          if (info.playerState === YT_PLAYING) {
            playerStatesRef.current.set(frame, YT_PLAYING)
            activePlayedRef.current = true
            revealHost(() => { if (shortsData[currentIndexRef.current]?.id === activeId) setStartedId(activeId) })
          }
        }
        startPlayer(activeId)
      }
      return
    }
    videoRefs.current.forEach((iframe, id) => {
      if (id === activeId) return
      // Rewind it too, so it starts from the beginning if you scroll back
      const state = playerStatesRef.current.get(iframe)
      if (state === YT_PLAYING || state === YT_BUFFERING || state === YT_PAUSED) {
        ytCommand(iframe, "pauseVideo")
        ytCommand(iframe, "seekTo", [0, true])
      }
    })
    const iframe = activeId ? videoRefs.current.get(activeId) : undefined
    if (!activeId || !iframe) return
    if (readyPlayersRef.current.has(iframe)) startPlayer(activeId)
    // Not ready yet: its onReady message starts it. Ping again in case an earlier handshake gave up.
    else registerPlayer(activeId)
  }, [currentIndex, startPlayer, registerPlayer, hosted])

  // (The shared player is hidden on each switch above and shown with revealHost once the short plays.)
  // YouTube draws captions at its bottom edge, so no cropping while they're on
  useEffect(() => {
    if (hosted) setHostCropped(!captionsEnabled)
  }, [hosted, captionsEnabled])

  // Keep muted ref in sync and send postMessage when mute changes
  useEffect(() => { isMutedRef.current = isMuted }, [isMuted])
  useEffect(() => { captionsRef.current = captionsEnabled }, [captionsEnabled])
  useEffect(() => {
    const activeShort = shortsData[currentIndex]
    const iframe = activeShort ? videoRefs.current.get(activeShort.id) : null
    if (!iframe?.contentWindow) return
    ytCommand(iframe, isMuted ? 'mute' : 'unMute')
  // Only reacts to this setting; switching shorts re-applies it in the currentIndex effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMuted])

  // Keep volume ref in sync and send postMessage when volume changes
  useEffect(() => { volumeRef.current = volume }, [volume])
  useEffect(() => {
    if (isMuted) return
    const activeShort = shortsData[currentIndex]
    const iframe = activeShort ? videoRefs.current.get(activeShort.id) : null
    if (!iframe?.contentWindow) return
    ytCommand(iframe, 'setVolume', [volume])
  // Only reacts to this setting; switching shorts re-applies it in the currentIndex effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume])

  const scrollToVideo = useCallback((i: number) => {
    const c = containerRef.current; if (!c) return
    const t = Math.max(0, Math.min(i, shortsData.length - 1))
    if (t === currentIndex) return
    const sectionH = (c.firstElementChild as HTMLElement)?.offsetHeight || c.clientHeight
    // Start the next short now (as YouTube does) rather than when the scroll animation ends;
    // the scroll handler leaves the index alone until this scroll is over
    scrollTargetRef.current = t
    setCurrentIndex(t)
    c.scrollTo({ top: t * sectionH, behavior: "smooth" })
  }, [currentIndex])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typing = !!t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))
      if (activePanel && e.key === "Escape") { setActivePanel(null); return }
      if (typing) return
      if (showShareModal && e.key === "Escape") { setShowShareModal(false); return }
      if (activePanel || showShareModal) return
      if (e.key === "ArrowDown") { e.preventDefault(); scrollToVideo(currentIndex + 1) }
      if (e.key === "ArrowUp") { e.preventDefault(); scrollToVideo(currentIndex - 1) }
    }
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h)
  }, [currentIndex, activePanel, showShareModal, scrollToVideo])

  // Likes are stored by YouTube id so they match the Liked videos list
  const toggleLike = (id: string) => {
    const s = shortsData.find((x) => x.id === id)
    if (!s) return
    if (isLikedShort(s.videoId)) { unlike(s.videoId); return }
    like({
      id: s.videoId, videoId: s.videoId, type: "short", title: s.title, channel: s.channel, channelAvatar: s.channelAvatar,
      thumbnail: s.thumbnail, views: s.views, timeAgo: s.timeAgo, duration: "", addedAt: Date.now(),
    })
    toast.success("Added to Liked videos")
  }
  const toggleFullscreen = () => {
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void }
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void }
    const isFull = !!(document.fullscreenElement || doc.webkitFullscreenElement)
    try {
      if (!isFull) {
        if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
        else { toast("Full screen isn't supported in this browser"); return }
        setIsFullscreen(true)
      } else {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {})
        else doc.webkitExitFullscreen?.()
        setIsFullscreen(false)
      }
    } catch {
      toast("Full screen isn't supported in this browser")
    }
  }

  // Captions are toggled through the YouTube player's captions module
  const sendToActivePlayer = (func: string, args: unknown[] = []) => {
    const activeShort = shortsData[currentIndex]
    const iframe = activeShort ? videoRefs.current.get(activeShort.id) : null
    ytCommand(iframe, func, args)
  }
  const toggleCaptions = () => {
    const next = !captionsEnabled
    setCaptionsEnabled(next)
    sendToActivePlayer(next ? 'loadModule' : 'unloadModule', ['captions'])
  }

  // Save = Watch Later (it holds both videos and shorts)
  const isShortSaved = (s: (typeof shortsData)[number]) => isInWatchLater(s.videoId)
  const toggleSaveShort = (s: (typeof shortsData)[number]) => {
    if (isShortSaved(s)) {
      removeFromWatchLater(s.videoId)
      toast.success("Removed from Watch Later")
      return
    }
    addToWatchLater({
      id: s.videoId, videoId: s.videoId, type: "short", title: s.title, channel: s.channel, channelAvatar: s.channelAvatar,
      thumbnail: s.thumbnail, views: s.views, timeAgo: s.timeAgo, duration: "", addedAt: Date.now(),
    })
    toast.success("Saved to Watch Later")
  }
  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    const onVideo = !(e.currentTarget instanceof HTMLButtonElement)
    if (onVideo) {
      // This tap turned the sound back on ("Tap to unmute"): don't also pause
      if (soundRestoringEventsRef.current.has(e.nativeEvent)) return
      // A tap that stops a swipe isn't meant as play/pause
      if (Date.now() - lastScrollAtRef.current < 250) return
    }
    const newPlaying = !isPlaying
    if (newPlaying && !isMuted) allowHostSound()
    setIsPlaying(newPlaying)
    userPausedRef.current = !newPlaying
    if (playFeedbackTimerRef.current) clearTimeout(playFeedbackTimerRef.current)
    setShowPlayFeedback(true)
    playFeedbackTimerRef.current = setTimeout(() => setShowPlayFeedback(false), 600)
    const activeShort = shortsData[currentIndex]
    const iframe = activeShort ? videoRefs.current.get(activeShort.id) : null
    ytCommand(iframe, newPlaying ? 'playVideo' : 'pauseVideo')
  }

  // ---- COMMENT ACTIONS ----
  const persistComments = () => saveComments(commentsByVideo)

  const handleAddComment = () => {
    if (!commentText.trim()) return
    const nc = { id: `${currentShort.id}c${Date.now()}`, user: "You", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "Just now", content: commentText.trim(), likes: 0, dislikes: 0, replies: [] }
    setComments(p => [nc, ...p]); setCommentText("")
    if (commentsByVideo[currentShort.id]) commentsByVideo[currentShort.id].unshift(nc)
    else commentsByVideo[currentShort.id] = [nc]
    persistComments()
  }

  const handleLikeComment = (commentId: string) => {
    const src = commentsByVideo[currentShort.id]?.find((c: VideoComment) => c.id === commentId)
    if (!src) return
    const wasLiked = likedIds.includes(commentId)
    const wasDisliked = dislikedIds.includes(commentId)

    if (wasLiked) src.likes--
    else { src.likes++; if (wasDisliked) { src.dislikes--; setDislikedIds(p => p.filter(id => id !== commentId)) } }

    if (wasLiked) setLikedIds(p => p.filter(id => id !== commentId))
    else setLikedIds(p => [...p, commentId])

    setComments(p => p.map(c => c.id === commentId ? { ...c, likes: src.likes, _isLiked: !wasLiked, _isDisliked: false, dislikes: wasDisliked ? c.dislikes - 1 : c.dislikes } : c))
    persistComments()
  }

  const handleDislikeComment = (commentId: string) => {
    const src = commentsByVideo[currentShort.id]?.find((c: VideoComment) => c.id === commentId)
    if (!src) return
    const wasDisliked = dislikedIds.includes(commentId)
    const wasLiked = likedIds.includes(commentId)

    if (wasDisliked) src.dislikes--
    else { src.dislikes++; if (wasLiked) { src.likes--; setLikedIds(p => p.filter(id => id !== commentId)) } }

    if (wasDisliked) setDislikedIds(p => p.filter(id => id !== commentId))
    else setDislikedIds(p => [...p, commentId])

    setComments(p => p.map(c => c.id === commentId ? { ...c, dislikes: src.dislikes, _isDisliked: !wasDisliked, _isLiked: false, likes: wasLiked ? c.likes - 1 : c.likes } : c))
    persistComments()
  }

  const handleReplyComment = (commentId: string, text: string) => {
    const nr = { id: `r${Date.now()}`, user: "You", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "Just now", content: text, likes: 0, dislikes: 0, replies: [], parentId: commentId }
    setComments(p => p.map(c => c.id === commentId ? { ...c, replies: [...(c.replies || []), nr] } : c))
    const src = commentsByVideo[currentShort.id]?.find((c: VideoComment) => c.id === commentId)
    if (src) { if (!src.replies) src.replies = []; src.replies.push(nr); persistComments() }
  }

  const handleLikeReply = (commentId: string, replyId: string) => {
    const src = commentsByVideo[currentShort.id]?.find((c: VideoComment) => c.id === commentId)
    if (!src?.replies) return
    const reply = src.replies.find((r: CommentReply) => r.id === replyId)
    if (!reply) return
    const wasLiked = likedIds.includes(replyId)
    const wasDisliked = dislikedIds.includes(replyId)

    if (wasLiked) reply.likes--
    else { reply.likes++; if (wasDisliked) { reply.dislikes--; setDislikedIds(p => p.filter(id => id !== replyId)) } }

    if (wasLiked) setLikedIds(p => p.filter(id => id !== replyId))
    else setLikedIds(p => [...p, replyId])

    setComments(p => p.map(c => c.id === commentId ? { ...c, replies: (c.replies || []).map((r: CommentReply) => r.id === replyId ? { ...r, likes: reply.likes, _isLiked: !wasLiked, _isDisliked: false, dislikes: wasDisliked ? r.dislikes - 1 : r.dislikes } : r) } : c))
    persistComments()
  }

  const handleDislikeReply = (commentId: string, replyId: string) => {
    const src = commentsByVideo[currentShort.id]?.find((c: VideoComment) => c.id === commentId)
    if (!src?.replies) return
    const reply = src.replies.find((r: CommentReply) => r.id === replyId)
    if (!reply) return
    const wasDisliked = dislikedIds.includes(replyId)
    const wasLiked = likedIds.includes(replyId)

    if (wasDisliked) reply.dislikes--
    else { reply.dislikes++; if (wasLiked) { reply.likes--; setLikedIds(p => p.filter(id => id !== replyId)) } }

    if (wasDisliked) setDislikedIds(p => p.filter(id => id !== replyId))
    else setDislikedIds(p => [...p, replyId])

    setComments(p => p.map(c => c.id === commentId ? { ...c, replies: (c.replies || []).map((r: CommentReply) => r.id === replyId ? { ...r, dislikes: reply.dislikes, _isDisliked: !wasDisliked, _isLiked: false, likes: wasLiked ? r.likes - 1 : r.likes } : r) } : c))
    persistComments()
  }

  const handleReplyNested = (commentId: string, replyId: string, text: string) => {
    const nr = { id: `nr${Date.now()}`, user: "You", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "Just now", content: text, likes: 0, dislikes: 0, parentId: replyId }
    setComments(p => p.map(c => c.id === commentId ? { ...c, replies: [...(c.replies || []), nr] } : c))
    const src = commentsByVideo[currentShort.id]?.find((c: VideoComment) => c.id === commentId)
    if (src) { if (!src.replies) src.replies = []; src.replies.push(nr); persistComments() }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment() } }
  const openPanel = (type: PanelType) => { if (activePanel === type) { setActivePanel(null); return }; setActivePanel(type); setDescExpanded(false); if (type === "comments") { loadCommentsForCurrentShort(); setTimeout(() => commentInputRef.current?.focus(), 400) } else if (type === "description") loadDescriptionForCurrentShort() }
  type PanelType = "comments" | "description" | null
  const panelTitle = activePanel === "comments" ? "Comments" : activePanel === "description" ? "Description" : ""
  const panelWidth = isWideViewport ? 480 : 380
  const panelRight = 96
  const iframeShiftRight = panelWidth + 20 + panelRight

  const currentComments2 = commentsByVideo[currentShort?.id] || []
  const totalCommentsCount = currentComments2.length + currentComments2.reduce((acc: number, c: VideoComment) => acc + (c.replies?.length || 0), 0)

  // ---- FEEDBACK HANDLING ----
  const handleSendFeedback = () => {
    if (!feedbackText.trim()) return
    setFeedbackSent(true)
    setTimeout(() => {
      setFeedbackSent(false)
      setFeedbackText("")
      setShowFeedbackDialog(false)
      toast.success("Feedback sent! Thank you.")
    }, 1500)
  }

  return (
    <div className="bg-background">
      <h1 className="sr-only">Shorts</h1>
      <style>{`
        @keyframes fadeInLeft { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes playFeedback { 0% { opacity: 0.9; transform: scale(1); } 100% { opacity: 0; transform: scale(1.6); } }
        .animate-fade-in-left { animation: fadeInLeft 0.3s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
        .animate-play-feedback { animation: playFeedback 0.55s ease-out forwards; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        /* Mobile: the 9:16 player covers the whole box (cropping the overflow), so there are no black bars at
           the sides when the screen is wider than 9:16, which it is on most phones once the nav bar is counted */
        @media (max-width: 767px) {
          .shorts-video-iframe, .shorts-poster {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            height: 100%;
            aspect-ratio: 9 / 16;
            min-width: 100%;
            width: auto;
          }
          @supports (width: 1cqw) {
            .shorts-player-box { container-type: size; }
            .shorts-video-iframe, .shorts-poster {
              aspect-ratio: auto;
              min-width: 0;
              width: max(100cqw, 100cqh * 9 / 16);
              height: max(100cqh, 100cqw * 16 / 9);
            }
          }
        }
        /* Desktop: iframe fills the already-9:16 container — no bars needed */
        @media (min-width: 768px) {
          .shorts-video-iframe, .shorts-poster {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
          }
        }
      `}</style>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        videoUrl={typeof window !== "undefined" && currentShort ? `${window.location.origin}/shorts?v=${currentShort.videoId}` : ""}
      />

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-primary" /> Send Feedback</DialogTitle>
            <DialogDescription>Help us improve Deeni.tube. Share your thoughts, suggestions, or report issues.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {feedbackSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Thank You!</h3>
                <p className="text-sm text-muted-foreground">Your feedback has been sent successfully.</p>
              </div>
            ) : (
              <>
                <Textarea
                  placeholder="Write your feedback here..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowFeedbackDialog(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={handleSendFeedback} disabled={!feedbackText.trim()}>
                    <Send className="h-4 w-4 mr-2" /> Send
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Up/down buttons from lg up; on narrower screens they would cover the video (swipe/keys still work) */}
      <div className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-50 flex-col gap-4">
        <button aria-label="Previous short" onClick={() => scrollToVideo(currentIndex - 1)} disabled={currentIndex === 0} className="w-14 h-14 rounded-full flex items-center justify-center bg-secondary text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><ChevronUp className="h-7 w-7" /></button>
        <button aria-label="Next short" onClick={() => scrollToVideo(currentIndex + 1)} disabled={currentIndex === shortsData.length - 1} className="w-14 h-14 rounded-full flex items-center justify-center bg-secondary text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><ChevronDown className="h-7 w-7" /></button>
      </div>

      {/* Desktop Panel */}
      {activePanel && (
        <div className="hidden md:flex fixed top-[56px] bottom-0 z-40 items-center" style={{ right: `${panelRight}px` }}>
          <div className="bg-card dark:bg-[#212121] border border-border dark:border-transparent rounded-2xl overflow-hidden flex flex-col shadow-2xl animate-fade-in-left h-[85vh]" style={{ width: `${panelWidth}px` }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-foreground text-xl font-bold">{panelTitle}</h3>
                {activePanel === "comments" && <span className="text-muted-foreground text-base">{totalCommentsCount}</span>}
              </div>
              <button aria-label="Close" onClick={() => setActivePanel(null)} className="h-10 w-10 flex items-center justify-center rounded-full text-foreground hover:bg-muted">
                <X className="h-6 w-6" />
              </button>
            </div>
            {activePanel === "comments" && (
              <>
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 yt-scrollbar">
                  {commentsLoading ? (
                    <><CommentSkeleton /><CommentSkeleton /><CommentSkeleton /><CommentSkeleton /><CommentSkeleton /></>
                  ) : comments.length > 0 ? (
                    comments.map((c) => (
                      <CommentItem
                        key={c.id}
                        comment={c}
                        onLikeComment={handleLikeComment}
                        onDislikeComment={handleDislikeComment}
                        onReplyComment={handleReplyComment}
                        onLikeReply={handleLikeReply}
                        onDislikeReply={handleDislikeReply}
                        onReplyNested={handleReplyNested}
                      />
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full"><p className="text-muted-foreground text-sm">No comments yet</p></div>
                  )}
                </div>
                <div className="border-t border-border px-4 py-3 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0"><AvatarFallback className="bg-muted text-foreground text-xs">Y</AvatarFallback></Avatar>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        ref={commentInputRef}
                        type="text"
                        placeholder="Add a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="flex-1 bg-transparent border-b border-border pb-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                      />
                      <button aria-label="Post comment" onClick={handleAddComment} disabled={!commentText.trim()} className="text-primary hover:text-primary/80 disabled:opacity-30 disabled:cursor-not-allowed p-1">
                        <Send className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
            {activePanel === "description" && (
              <>
                {descLoading ? (
                  <DescriptionSkeleton />
                ) : currentShort ? (
                  <div className="flex-1 overflow-y-auto overflow-x-hidden yt-scrollbar">
                    <div className="px-4 py-3"><h4 className="text-foreground text-base font-semibold leading-snug [overflow-wrap:anywhere]">{currentShort.title}</h4></div>
                    <div className="px-4 pb-3 flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-sm"><Eye className="h-4 w-4" /><span>{currentShort.views} views</span></div>
                      <div className="flex items-center gap-1.5 text-muted-foreground text-sm"><Clock className="h-4 w-4" /><span>{currentShort.timeAgo}</span></div>
                    </div>
                    <div className="px-4 pb-4">
                      <DescriptionText text={currentShort.description} className={cn("text-sm text-foreground leading-relaxed", !descExpanded && "line-clamp-4")} />
                      {currentShort.description && currentShort.description.length > 200 && <button onClick={() => setDescExpanded(!descExpanded)} className="text-muted-foreground hover:text-foreground text-xs mt-1 font-medium">{descExpanded ? 'Show less' : '...more'}</button>}
                    </div>
                    <div className="px-4 pb-4 flex flex-wrap gap-x-2 gap-y-1">{currentShort.hashtags.map((tag: string) => <Link key={tag} href={hashtagHref(tag)} className="text-[#065fd4] dark:text-[#3ea6ff] text-sm [overflow-wrap:anywhere]">{tag}</Link>)}</div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full"><p className="text-muted-foreground text-sm">No description available</p></div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Panel */}
      {activePanel && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setActivePanel(null)} />
          <div className="absolute bottom-0 left-0 right-0 bg-card dark:bg-[#212121] rounded-t-2xl max-h-[70dvh] flex flex-col overflow-hidden animate-slide-up">
            <div className="w-10 h-1 bg-muted-foreground/40 rounded-full mx-auto mt-3 mb-2 flex-shrink-0" />
            <div className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2"><h3 className="text-foreground text-lg font-bold">{panelTitle}</h3>{activePanel === "comments" && <span className="text-muted-foreground text-base">{totalCommentsCount}</span>}</div>
              <button aria-label="Close" onClick={() => setActivePanel(null)} className="h-10 w-10 flex items-center justify-center rounded-full text-foreground hover:bg-muted"><X className="h-6 w-6" /></button>
            </div>
            {activePanel === "comments" && (
              <>
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 yt-scrollbar">
                  {commentsLoading ? (
                    <><CommentSkeleton /><CommentSkeleton /><CommentSkeleton /></>
                  ) : comments.length > 0 ? (
                    comments.map((c) => (
                      <CommentItem
                        key={c.id}
                        comment={c}
                        onLikeComment={handleLikeComment}
                        onDislikeComment={handleDislikeComment}
                        onReplyComment={handleReplyComment}
                        onLikeReply={handleLikeReply}
                        onDislikeReply={handleDislikeReply}
                        onReplyNested={handleReplyNested}
                      />
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-32"><p className="text-muted-foreground text-sm">No comments yet</p></div>
                  )}
                </div>
                <div className="border-t border-border px-4 py-3 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0"><AvatarFallback className="bg-muted text-foreground text-xs">Y</AvatarFallback></Avatar>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="flex-1 bg-transparent border-b border-border pb-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                      />
                      <button aria-label="Post comment" onClick={handleAddComment} disabled={!commentText.trim()} className="text-primary hover:text-primary/80 disabled:opacity-30 disabled:cursor-not-allowed p-1">
                        <Send className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
            {activePanel === "description" && (
              <>
                {descLoading ? (
                  <DescriptionSkeleton />
                ) : currentShort ? (
                  <div className="flex-1 overflow-y-auto overflow-x-hidden yt-scrollbar">
                    <div className="px-4 py-3"><h4 className="text-foreground text-base font-semibold leading-snug [overflow-wrap:anywhere]">{currentShort.title}</h4></div>
                    <div className="px-4 pb-3 flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-sm"><Eye className="h-4 w-4" /><span>{currentShort.views} views</span></div>
                      <div className="flex items-center gap-1.5 text-muted-foreground text-sm"><Clock className="h-4 w-4" /><span>{currentShort.timeAgo}</span></div>
                    </div>
                    <div className="px-4 pb-4">
                      <DescriptionText text={currentShort.description} className={cn("text-sm text-foreground leading-relaxed", !descExpanded && "line-clamp-4")} />
                      {currentShort.description && currentShort.description.length > 200 && <button onClick={() => setDescExpanded(!descExpanded)} className="text-muted-foreground hover:text-foreground text-xs mt-1 font-medium">{descExpanded ? 'Show less' : '...more'}</button>}
                    </div>
                    <div className="px-4 pb-4 flex flex-wrap gap-x-2 gap-y-1">{currentShort.hashtags.map((tag: string) => <Link key={tag} href={hashtagHref(tag)} className="text-[#065fd4] dark:text-[#3ea6ff] text-sm [overflow-wrap:anywhere]">{tag}</Link>)}</div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32"><p className="text-muted-foreground text-sm">No description available</p></div>
                )}
              </>
            )}
          </div>
        </div>
      )}


      {/* The shared player (iPhone, iPad, Safari) lives under the feed, which is see-through where the short on
          screen plays; black behind it on phones, as the feed is */}
      {hosted && <div className="fixed inset-0 bg-black md:hidden" aria-hidden="true" />}

      {/* Main Shorts Content */}
      <div
        ref={containerRef}
        // overflow-x-hidden + touch-pan-y: the feed only moves up and down (the hidden action rails of the other
        // shorts slide in from the right and must not make it pannable sideways)
        className={cn(hosted && "z-[2]", "fixed inset-0 top-0 bottom-[calc(56px+env(safe-area-inset-bottom,0px))] md:top-[56px] md:bottom-0 overflow-y-scroll overflow-x-hidden touch-pan-y snap-y snap-mandatory overscroll-contain scrollbar-none transition-all duration-300 ease-in-out")}
        style={{
          scrollSnapType: "y mandatory",
          left: isDesktopViewport ? `${desktopSidebarWidth}px` : "0px",
          right: isDesktopViewport && activePanel ? `${iframeShiftRight}px` : "0px",
        }}
      >
        {/* Refs below are only used inside event handlers and ref callbacks, never read while rendering */}
        {/* eslint-disable-next-line react-hooks/refs */}
        {shortsData.map((short, index) => {
          const isActive = index === currentIndex
          const isHovered = hoveredVideoId === short.id
          // The active short and its neighbours get a live player; the rest only show a thumbnail
          // (With the shared player, no short has a player of its own)
          const hasPlayer = !hosted && (isActive || (preloadNeighbors && Math.abs(index - currentIndex) <= PRELOAD_RANGE))
          const posterHidden = isActive && startedId === short.id
          // The shared player shows through this short's box (it sits under the feed, see below)
          const seeThrough = hosted && posterHidden
          const liked = isLikedShort(short.videoId)
          const saved = isShortSaved(short)
          return (
            <section key={short.id} className={cn("relative h-full md:h-[calc(100%-32px)] w-full overflow-x-clip snap-start snap-always flex items-center md:items-start justify-center", !seeThrough && "bg-background")}>
              {/* The video plus its action rail: side by side from lg up; on smaller screens the rail sits over the video */}
              <div className="relative w-full h-full md:w-auto md:h-[calc(100%-12px)] md:mt-2 flex items-end lg:gap-4">
                <div
                  className={cn("relative w-full h-full md:w-auto md:flex-shrink-0 md:aspect-[9/16] md:rounded-2xl md:overflow-hidden", !seeThrough && "bg-black")}
                  onMouseEnter={() => setHoveredVideoId(short.id)}
                  onMouseLeave={() => { setHoveredVideoId(null); setShowVolumeSlider(false); setShowMoreMenu(false) }}
                >
                  {/* Video Player — overflow-hidden only here so the progress bar scrubber isn't clipped */}
                  {/* Tapping a short that isn't the active one (e.g. the next one peeking in) moves to it */}
                  <div
                    ref={(el) => {
                      if (el) boxRefs.current.set(short.id, el)
                      else boxRefs.current.delete(short.id)
                    }}
                    className={cn("shorts-player-box absolute inset-0 overflow-hidden md:rounded-2xl", !seeThrough && "bg-black")}
                    onClick={isActive ? handleTogglePlay : () => scrollToVideo(index)}
                  >
                    {hasPlayer && (
                      <iframe
                        ref={(el) => {
                          if (el) videoRefs.current.set(short.id, el)
                        }}
                        // Never change this src after mount (that reloads the player): playback is started and
                        // stopped with postMessage commands, so neighbours can load ahead of time paused
                        src={`https://www.youtube.com/embed/${short.videoId}?autoplay=0&mute=0&controls=0&loop=1&playlist=${short.videoId}&modestbranding=1&rel=0&fs=1&playsinline=1&enablejsapi=1`}
                        title={short.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        tabIndex={isActive ? 0 : -1}
                        // Invisible until it plays (the thumbnail covers it anyway): YouTube's player resizes its
                        // video while loading, which otherwise counts as layout shift for the page
                        className={cn("shorts-video-iframe transition-opacity duration-200", posterHidden ? "opacity-100" : "opacity-0")}
                        onLoad={() => registerPlayer(short.id)}
                      />
                    )}
                    {/* Thumbnail on top of the player until it's actually playing, so switching never shows a black frame.
                        Framed exactly like the video: in the same 9:16 box that covers this one (.shorts-poster), where
                        YouTube's landscape thumbnail shows just the short (its black side strips fall outside), so it
                        doesn't look smaller and then zoom when the video takes over. Square and landscape videos
                        sit in the middle, as YouTube shows them */}
                    <div className={cn("absolute inset-0 pointer-events-none transition-opacity duration-200", posterHidden ? "opacity-0" : "opacity-100")}>
                      <div className="shorts-poster">
                        <div className={cn("absolute inset-x-0 top-1/2 -translate-y-1/2", SHORT_SHAPE[short.videoId] === "square" ? "aspect-square" : SHORT_SHAPE[short.videoId] === "wide" ? "aspect-video" : "h-full")}>
                          <Image
                            src={short.thumbnail}
                            alt={short.title}
                            fill
                            className="object-cover"
                            // The opening short's thumbnail is the main image until its player starts, so only it loads early
                            {...(index === initialIndex ? imagePriorityProps("lcp") : { loading: "lazy" as const })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transparent click overlay — above iframe (z-0) but below controls (z-20+) */}
                  {isActive && (
                    <div
                      className="absolute inset-0 z-10 cursor-pointer"
                      onClick={(e) => handleTogglePlay(e as unknown as React.MouseEvent)}
                    />
                  )}

                  {/* Play/pause tap feedback animation */}
                  {isActive && showPlayFeedback && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                      <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center animate-play-feedback">
                        {isPlaying
                          ? <Pause className="h-7 w-7 text-white" />
                          : <Play className="h-7 w-7 text-white fill-white" />}
                      </div>
                    </div>
                  )}

                  {/* Gradient overlays */}
                  <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
                  <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none" />

                  {/* Top controls (hover only) */}
                  {/* Only the control row takes clicks; the padded area below it must not cover the action rail on short windows */}
                  <div className={`absolute top-0 left-0 right-0 z-30 px-4 pt-4 pb-16 transition-opacity duration-200 pointer-events-none ${(isHovered || isActive) && !isScrolling ? "opacity-100 [&>*]:pointer-events-auto" : "opacity-0"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* Mobile: back button in play/pause slot */}
                        <button onClick={() => router.back()} className="md:hidden w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} aria-label="Go back">
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        {/* Desktop: play/pause */}
                        <button type="button" aria-label={isPlaying ? "Pause" : "Play"} onClick={handleTogglePlay} className="hidden md:flex w-10 h-10 rounded-full items-center justify-center text-white hover:bg-white/10 transition-colors" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
                          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                        </button>
                        <div className="relative flex items-center" onMouseEnter={() => setShowVolumeSlider(true)} onMouseLeave={() => setShowVolumeSlider(false)}>
                          <button type="button" data-mute-toggle aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"} onClick={() => { if (!restoreSound()) { if (isMuted) allowHostSound(); setIsMuted(!isMuted) } }} className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
                            {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                          </button>
                          {showVolumeSlider && (
                            <div className="hidden md:flex items-center rounded-full px-3 py-2 ml-1 shadow-lg" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                              <input type="range" aria-label="Volume" min="0" max="100" value={isMuted ? 0 : volume} onChange={(e) => { setVolume(Number(e.target.value)); autoMutedRef.current = false; setAutoMuted(false); setIsMuted(false) }} className="w-20 h-1 accent-white cursor-pointer" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" aria-label={captionsEnabled ? "Turn off captions" : "Turn on captions"} aria-pressed={captionsEnabled} onClick={toggleCaptions} className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
                          {captionsEnabled ? <CCIconOn className="h-5 w-5" /> : <CCIconOff className="h-5 w-5" />}
                        </button>
                        <button type="button" aria-label="Full screen" onClick={toggleFullscreen} className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
                          <FullscreenIcon className="h-5 w-5" />
                        </button>
                        <div className="relative">
                          <button type="button" aria-label="More options" aria-expanded={showMoreMenu} onClick={() => setShowMoreMenu(!showMoreMenu)} className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
                            <MoreVertIcon className="h-5 w-5 md:h-6 md:w-6" />
                          </button>

                          {/* Dropdown — same on mobile and desktop */}
                          {showMoreMenu && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                              <div className="absolute top-full right-0 mt-2 z-50 bg-popover text-popover-foreground rounded-xl shadow-2xl border dark:border-transparent py-2 w-[280px]">
                                <button className="w-full flex items-center gap-4 px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors" onClick={() => { openPanel("description"); setShowMoreMenu(false) }}>
                                  <List className="h-5 w-5" /> Description
                                </button>
                                <button type="button" className="w-full flex items-center gap-4 px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors" onClick={() => { toggleSaveShort(short); setShowMoreMenu(false) }}>
                                  <Bookmark className={cn("h-5 w-5", isShortSaved(short) && "fill-current")} /> {isShortSaved(short) ? "Saved to Watch Later" : "Save to Watch Later"}
                                </button>
                                <button className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors" onClick={() => { toggleCaptions(); setShowMoreMenu(false) }}>
                                  <div className="flex items-center gap-4">{captionsEnabled ? <CCIconOn className="h-5 w-5" /> : <CCIconOff className="h-5 w-5" />} Captions</div>
                                  <span className="text-muted-foreground text-sm">{captionsEnabled ? "On" : "Off"}</span>
                                </button>
                                <ReportDialog videoTitle={short.title} videoId={short.id}>
                                  <button className="w-full flex items-center gap-4 px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                                    <Flag className="h-5 w-5" /> <span>Report</span>
                                  </button>
                                </ReportDialog>
                                <button className="w-full flex items-center gap-4 px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors" onClick={() => { setShowMoreMenu(false); setShowFeedbackDialog(true); }}>
                                  <MessageSquare className="h-5 w-5" /> Send feedback
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Muted because the browser didn't allow sound yet: one tap brings it back (as on YouTube) */}
                  {isActive && autoMuted && !isScrolling && (
                    <button
                      type="button"
                      data-mute-toggle
                      onClick={(e) => { e.stopPropagation(); restoreSound() }}
                      className="absolute left-1/2 top-16 z-30 inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/75"
                    >
                      <VolumeX className="h-5 w-5" />
                      <span className="md:hidden">Tap to unmute</span>
                      <span className="hidden md:inline">Click to unmute</span>
                    </button>
                  )}

                  {/* Bottom info (phones: room under the title, above the progress bar, as in the YouTube app: about 5% of
                      the screen's height, so 24px on small phones up to 44px on tall ones) */}
                  <div className={`absolute bottom-[clamp(24px,5svh,44px)] md:bottom-6 left-4 right-20 lg:right-4 z-20 transition-all duration-500 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)] ${isActive && !isScrolling ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
                    <div className="flex items-center gap-2.5 mb-2">
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarImage src={short.channelAvatar} />
                        <AvatarFallback className="bg-muted text-foreground text-sm">{short.channel.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-white font-medium text-[15px] truncate">{short.channel}</span>
                    </div>
                    <button onClick={() => openPanel("description")} className="text-left w-full">
                      <p className="text-white text-[15px] leading-snug line-clamp-2 [overflow-wrap:anywhere]">{short.title}</p>
                    </button>
                  </div>

                  {/* YouTube-style progress bar with scrubber */}
                  {isActive && (() => {
                    const fillPct = videoDuration > 0 ? Math.min(100, (videoCurrentTime / videoDuration) * 100) : 0
                    const showScrubber = isProgressHovered
                    return (
                      /* Outer div: tall transparent hit area on mobile (24px), auto on desktop */
                      <div
                        className="absolute bottom-0 left-0 right-0 z-40 cursor-pointer flex flex-col justify-end h-6 md:h-auto"
                        onMouseEnter={() => setIsProgressHovered(true)}
                        onMouseLeave={() => { setIsProgressHovered(false) }}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          isSeekingRef.current = true; setIsSeeking(true)
                          const bar = e.currentTarget
                          const doSeek = (clientX: number) => {
                            const rect = bar.getBoundingClientRect()
                            const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
                            const t = pct * videoDurationRef.current
                            setVideoCurrentTime(t)
                            const iframe = videoRefs.current.get(short.id)
                            ytCommand(iframe, 'seekTo', [t, true])
                          }
                          doSeek(e.clientX)
                          const onMove = (ev: MouseEvent) => doSeek(ev.clientX)
                          const onUp = () => {
                            isSeekingRef.current = false; setIsSeeking(false)
                            window.removeEventListener('mousemove', onMove)
                            window.removeEventListener('mouseup', onUp)
                          }
                          window.addEventListener('mousemove', onMove)
                          window.addEventListener('mouseup', onUp)
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation()
                          isSeekingRef.current = true; setIsSeeking(true)
                          setIsProgressTouch(true)
                          const touch = e.touches[0]; if (!touch) return
                          const rect = e.currentTarget.getBoundingClientRect()
                          const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
                          const t = pct * videoDurationRef.current
                          setVideoCurrentTime(t)
                          const iframe = videoRefs.current.get(short.id)
                          ytCommand(iframe, 'seekTo', [t, true])
                        }}
                        onTouchMove={(e) => {
                          e.stopPropagation()
                          const touch = e.touches[0]; if (!touch) return
                          const rect = e.currentTarget.getBoundingClientRect()
                          const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
                          const t = pct * videoDurationRef.current
                          setVideoCurrentTime(t)
                          const iframe = videoRefs.current.get(short.id)
                          ytCommand(iframe, 'seekTo', [t, true])
                        }}
                        onTouchEnd={() => { isSeekingRef.current = false; setIsSeeking(false); setIsProgressTouch(false) }}
                      >
                        {/* Visual track — scrubber centers on this div so it's always correctly positioned */}
                        <div
                          className={`relative w-full transition-[height] duration-150 ${showScrubber ? 'h-[5px]' : 'h-[3px]'}`}
                          style={{ background: 'rgba(255,255,255,0.25)' }}
                        >
                          {/* Red fill — no transition during seeking so it tracks cursor immediately */}
                          <div
                            className="h-full bg-red-500 pointer-events-none"
                            style={{
                              width: `${fillPct}%`,
                              transition: isSeeking ? 'none' : 'width 0.25s linear',
                            }}
                          />
                          {/* Scrubber — centered on the visual track, visible on hover/touch */}
                          {showScrubber && (
                            <div
                              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-500 shadow-md pointer-events-none"
                              style={{ left: `${fillPct}%` }}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
                {/* Actions: over the video on phones/tablets, beside it on wider screens (as on YouTube) */}
                <div className={cn(
                  "absolute right-3 bottom-28 z-20 flex flex-col items-center gap-5 short-screen:bottom-24 short-screen:gap-3 transition-all duration-500",
                  "lg:static lg:z-auto lg:flex-shrink-0 lg:gap-4 lg:mb-1",
                  isActive && !isScrolling ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"
                )}>
                  <button type="button" aria-label={liked ? "Unlike" : "Like"} aria-pressed={liked} onClick={() => toggleLike(short.id)} className="flex flex-col items-center gap-1 group">
                    <span className={actionCircleClass}><Heart className={cn("h-6 w-6", liked && "text-red-500 fill-red-500")} /></span>
                    <span className={actionLabelClass}>{short.likes}</span>
                  </button>
                  <button type="button" aria-label="Comments" onClick={() => openPanel("comments")} className="flex flex-col items-center gap-1 group">
                    <span className={actionCircleClass}><MessageCircle className="h-6 w-6" /></span>
                    <span className={actionLabelClass}>{short.comments}</span>
                  </button>
                  <button type="button" onClick={() => setShowShareModal(true)} className="flex flex-col items-center gap-1 group">
                    <span className={actionCircleClass}><Share2 className="h-6 w-6" /></span>
                    <span className={actionLabelClass}>Share</span>
                  </button>
                  <button type="button" aria-pressed={saved} onClick={() => toggleSaveShort(short)} className="flex flex-col items-center gap-1 group">
                    <span className={actionCircleClass}><Bookmark className={cn("h-6 w-6", saved && "fill-current")} /></span>
                    <span className={actionLabelClass}>{saved ? "Saved" : "Save"}</span>
                  </button>
                  <ReportDialog videoTitle={short.title} videoId={short.id}>
                    <button type="button" className="flex flex-col items-center gap-1 group">
                      <span className={actionCircleClass}><Flag className="h-6 w-6" /></span>
                      <span className={actionLabelClass}>Report</span>
                    </button>
                  </ReportDialog>
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

// useSearchParams() needs a Suspense boundary so the page can be prerendered
export default function ShortsPage() {
  return (
    <Suspense fallback={null}>
      <ShortsPageContent />
    </Suspense>
  )
}
