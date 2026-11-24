// lib/shorts-data.ts
// Every short, once: the Shorts page, the channel and scholar pages, History, Liked, Watch later and playlists all read
// this list, so a short has the same id, title, channel and numbers everywhere.

export interface ShortVideo {
  id: string
  /** YouTube id */
  videoId: string
  title: string
  channel: string
  channelId: string
  channelAvatar: string
  /** Its real length on YouTube */
  duration: string
  /** Full number, e.g. "15,234" (shortViews gives "15K views") */
  views: string
  timeAgo: string
  description: string
  hashtags: string[]
  likes: string
  comments: string
  isSubscribed: boolean
}

/** Shorts taken out of the feed, and the one in their place: their old links (/shorts?v=…, History) open it. */
export const replacedShorts: Record<string, string> = {
  "goHfO28fE-A": "Pr5qe5nQfWc", // reported stuck (not playing) on Nov 23, 2026
}

/** Shorts removed for good: gone from the feed, and from what visitors saved earlier (History, Liked, Watch later). */
export const removedShorts: ReadonlySet<string> = new Set([
  "0m1Mc6dX8XY", // "Seek The Forgiveness of Allah #muftimenk", Nov 24, 2026
])

export const shortsVideos: ShortVideo[] = [
  {
    id: "s1",
    videoId: "MBxDbbkk0gQ",
    duration: "1:14",
    title: "একমাত্র আল্লাহর রাজত্বই চিরস্থায়ী",
    channel: "Dr. Mohammad Monzur-E-Elahi",
    channelId: "monzur",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_lLp3SxQeehJxSmd_QCmSxpFBj4k-7X-brif7v9Jz0rBg=s160-c-k-c0x00ffffff-no-rj",
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
    videoId: "Pr5qe5nQfWc",
    duration: "0:27",
    title: "কীভাবে দুনিয়ার লোভ থেকে বেঁচে থাকবেন?",
    channel: "Dr. Mohammad Monzur-E-Elahi",
    channelId: "monzur",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_lLp3SxQeehJxSmd_QCmSxpFBj4k-7X-brif7v9Jz0rBg=s160-c-k-c0x00ffffff-no-rj",
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
    duration: "0:56",
    title: "ইমামের দূর্ব্যবহারের কারণে কেউ ওই মাসজিদে না গেলে কি অন্যায় হবে?",
    channel: "Dr. Mohammad Monzur-E-Elahi",
    channelId: "monzur",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_lLp3SxQeehJxSmd_QCmSxpFBj4k-7X-brif7v9Jz0rBg=s160-c-k-c0x00ffffff-no-rj",
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
    duration: "0:59",
    title: "সিদ্দীকে আকবার রা.-এর দৃষ্টিতে প্রিয় নবী সা.",
    channel: "Dr. Mohammad Monzur-E-Elahi",
    channelId: "monzur",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_lLp3SxQeehJxSmd_QCmSxpFBj4k-7X-brif7v9Jz0rBg=s160-c-k-c0x00ffffff-no-rj",
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
    duration: "1:00",
    title: "আল্লাহর পক্ষ থেকে তাওফীক প্রাপ্তি",
    channel: "Dr. Mohammad Monzur-E-Elahi",
    channelId: "monzur",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_lLp3SxQeehJxSmd_QCmSxpFBj4k-7X-brif7v9Jz0rBg=s160-c-k-c0x00ffffff-no-rj",
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
    duration: "0:33",
    title: "এভাবে ঈমান নষ্ট করছেন নাতো?",
    channel: "Dr. Khandaker Abdullah Jahangir",
    channelId: "abdullah-jahangir",
    channelAvatar: "https://yt3.googleusercontent.com/stJnVilfKhMtBiIq_hXTu-9DnanUT0GNtmsRePmQvLAi6c7bhXoIIHGlYL0HqUrdEjrL0KFs7Q=s160-c-k-c0x00ffffff-no-rj",
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
    duration: "0:55",
    title: "রোগ-ব্যাধিতে ধৈর্য ধারণ করা",
    channel: "Dr. Khandaker Abdullah Jahangir",
    channelId: "abdullah-jahangir",
    channelAvatar: "https://yt3.googleusercontent.com/stJnVilfKhMtBiIq_hXTu-9DnanUT0GNtmsRePmQvLAi6c7bhXoIIHGlYL0HqUrdEjrL0KFs7Q=s160-c-k-c0x00ffffff-no-rj",
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
    duration: "0:46",
    title: "মহান আল্লাহ'র কাছে চাওয়ার নিয়ম",
    channel: "Dr. Khandaker Abdullah Jahangir",
    channelId: "abdullah-jahangir",
    channelAvatar: "https://yt3.googleusercontent.com/stJnVilfKhMtBiIq_hXTu-9DnanUT0GNtmsRePmQvLAi6c7bhXoIIHGlYL0HqUrdEjrL0KFs7Q=s160-c-k-c0x00ffffff-no-rj",
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
    duration: "0:41",
    title: "ওজুতে ঘাড় মাসাহ করা সুন্নাহ নাকি বিদ'আত - Dr. Abu Bakar Muhammad Zakaria",
    channel: "Professor Dr. Abubakar Muhammad Zakaria",
    channelId: "abu-bakar-zakariya",
    channelAvatar: "https://yt3.googleusercontent.com/B5dEWmLpOG-j07FqzYJJW2snv2yep93R_AcnBx05lzn56r0CJdX8LtrEASS-FxW3r663GNzLHQ=s160-c-k-c0x00ffffff-no-rj",
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
    duration: "0:30",
    title: "দুনিয়াতেই জান্নাত আছে আপনি কি জানেন? ✨ Abu Bakar Zakaria",
    channel: "Professor Dr. Abubakar Muhammad Zakaria",
    channelId: "abu-bakar-zakariya",
    channelAvatar: "https://yt3.googleusercontent.com/B5dEWmLpOG-j07FqzYJJW2snv2yep93R_AcnBx05lzn56r0CJdX8LtrEASS-FxW3r663GNzLHQ=s160-c-k-c0x00ffffff-no-rj",
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
    duration: "0:58",
    title: "আদমসুমারির খাতায় মুসলমান, বাস্তবে ইমানের খাতায় নাম নাই || Dr. Mohammad Imam Hossain",
    channel: "Tafseerul Quran",
    channelId: "imam-hossain",
    channelAvatar: "/placeholder.svg?height=48&width=48",
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
    duration: "0:58",
    title: "The Quran is the Most Untranslatable Book - Dr Zakir Naik",
    channel: "Dr. Zakir Naik",
    channelId: "zakir-naik",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_kgWD-o3akIt5SI_BWvWHc6mHyPRm3BA5t69TAZlqQcpIF6=s160-c-k-c0x00ffffff-no-rj",
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
    duration: "1:13",
    title: "Belief in Bad Omen is Shirk - Dr Zakir Naik",
    channel: "Dr. Zakir Naik",
    channelId: "zakir-naik",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_kgWD-o3akIt5SI_BWvWHc6mHyPRm3BA5t69TAZlqQcpIF6=s160-c-k-c0x00ffffff-no-rj",
    likes: "276",
    comments: "18",
    isSubscribed: false,
    description: "Belief in Bad Omen is Shirk - Dr Zakir Naik\n\n#drzakirnaik #BadOmen #Shirk",
    views: "4,630",
    timeAgo: "2 weeks ago",
    hashtags: ["#drzakirnaik", "#BadOmen", "#Shirk"]
  },
  {
    id: "s14",
    videoId: "HKRq0DE-GTo",
    duration: "1:00",
    title: "Just Don't Get Angry #muftimenk",
    channel: "Mufti Menk",
    channelId: "mufti-menk",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_nFND09H6Vvk_P8L4djMdBusHPU8nIT6XuiRjL8M59hJsw=s160-c-k-c0x00ffffff-no-rj",
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
    duration: "0:58",
    title: "Is it not permissible 2 get married in Muharram? assim al hakeem",
    channel: "Assim Al Hakeem",
    channelId: "assim-al-hakeem",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_nc1yIpeXxXdQ02ZRrAQr6HZU_gMrzljS5HFCRO4a95KH8=s160-c-k-c0x00ffffff-no-rj",
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
    duration: "0:58",
    title: "Read all duas of morning & evening adhkar or can we pick & choose? || assim al hakeem",
    channel: "Assim Al Hakeem",
    channelId: "assim-al-hakeem",
    channelAvatar: "https://yt3.googleusercontent.com/ytc/AIdro_nc1yIpeXxXdQ02ZRrAQr6HZU_gMrzljS5HFCRO4a95KH8=s160-c-k-c0x00ffffff-no-rj",
    likes: "25K",
    comments: "1.2K",
    isSubscribed: false,
    description: "Read all duas of morning & evening adhkar or can we pick & choose? || assim al hakeem",
    views: "25,890",
    timeAgo: "1 week ago",
    hashtags: ["#assimalhakeem", "#adhkar", "#dua"]
  },
]

/** A channel's shorts (also its scholar's). */
export function shortsOfChannel(channelId: string): ShortVideo[] {
  return shortsVideos.filter((s) => s.channelId === channelId)
}
