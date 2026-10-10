"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Eye,
  Heart,
  MessageCircle,
  MousePointerClick,
  Play,
  Send,
  Share2,
  Star,
  UserPlus,
  Users,
  // New icons
  Compass,
  Hash,
  Sparkles,
  Mic2,
  Video,
  Globe,
  Mail,
  MapPin,
  BarChart3,
  ShoppingBag,
  Rocket,
  FileText,
  Camera,
  Layers,
  Target,
  Zap,
  ThumbsUp,
  Headphones,
  Building2,
  Package,
  TrendingUp,
  PenTool,
} from "lucide-react";

type Subcategory = {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
};

type CategoryData = {
  name: string;
  description: string;
  subcategories: Subcategory[];
};

const categoryData: Record<string, CategoryData> = {
  /* ====================== EXISTING ====================== */

  "sign-up": {
    name: "Sign Up",
    description: "Choose the type of registration or account creation task.",
    subcategories: [
      {
        id: "website-registration",
        name: "Website Registration",
        description: "Ask workers to create an account on your website.",
        icon: UserPlus,
      },
      {
        id: "app-registration",
        name: "App Registration",
        description: "Ask workers to register on your mobile application.",
        icon: CircleUserRound,
      },
      {
        id: "email-signup",
        name: "Email Sign-Up",
        description: "Ask workers to subscribe or register using an email address.",
        icon: Send,
      },
    ],
  },

  "whatsapp-telegram": {
    name: "WhatsApp / Telegram",
    description: "Choose the type of community engagement task.",
    subcategories: [
      {
        id: "join-whatsapp-group",
        name: "Join WhatsApp Group",
        description: "Ask workers to join your WhatsApp group.",
        icon: Users,
      },
      {
        id: "join-telegram-group",
        name: "Join Telegram Group",
        description: "Ask workers to join your Telegram group.",
        icon: MessageCircle,
      },
      {
        id: "join-telegram-channel",
        name: "Join Telegram Channel",
        description: "Ask workers to subscribe to your Telegram channel.",
        icon: Send,
      },
    ],
  },

  "instagram-tiktok": {
    name: "Instagram / TikTok",
    description: "Choose the type of social media engagement you need.",
    subcategories: [
      {
        id: "follow",
        name: "Follow",
        description: "Ask workers to follow your Instagram or TikTok account.",
        icon: UserPlus,
      },
      {
        id: "like",
        name: "Like",
        description: "Ask workers to like your post or video.",
        icon: Heart,
      },
      {
        id: "comment",
        name: "Comment",
        description: "Ask workers to leave a comment on your content.",
        icon: MessageCircle,
      },
      {
        id: "share",
        name: "Share",
        description: "Ask workers to share your post or video.",
        icon: Share2,
      },
      {
        id: "video-view",
        name: "Video View",
        description: "Ask workers to watch your Instagram Reel or TikTok video.",
        icon: Play,
      },
    ],
  },

  youtube: {
    name: "YouTube",
    description: "Choose the type of YouTube engagement task.",
    subcategories: [
      {
        id: "subscribe",
        name: "Subscribe",
        description: "Ask workers to subscribe to your YouTube channel.",
        icon: UserPlus,
      },
      {
        id: "watch-video",
        name: "Watch Video",
        description: "Ask workers to watch a specific YouTube video.",
        icon: Play,
      },
      {
        id: "like-video",
        name: "Like Video",
        description: "Ask workers to like your YouTube video.",
        icon: Heart,
      },
      {
        id: "comment-video",
        name: "Comment",
        description: "Ask workers to leave a comment on your video.",
        icon: MessageCircle,
      },
    ],
  },

  "seo-website": {
    name: "SEO / Website Owners",
    description: "Choose the type of website or SEO activity.",
    subcategories: [
      {
        id: "website-visit",
        name: "Website Visit",
        description: "Ask workers to visit your website.",
        icon: MousePointerClick,
      },
      {
        id: "website-review",
        name: "Website Review",
        description: "Ask workers to review your website or service.",
        icon: Star,
      },
      {
        id: "website-engagement",
        name: "Website Engagement",
        description: "Ask workers to browse and interact with your website.",
        icon: Eye,
      },
    ],
  },

  discord: {
    name: "Discord",
    description: "Choose the type of Discord community task.",
    subcategories: [
      {
        id: "join-server",
        name: "Join Server",
        description: "Ask workers to join your Discord server.",
        icon: Users,
      },
      {
        id: "react-message",
        name: "React to Message",
        description: "Ask workers to react to a message in your server.",
        icon: Heart,
      },
      {
        id: "participate",
        name: "Participate",
        description: "Ask workers to participate in a discussion.",
        icon: MessageCircle,
      },
    ],
  },

  facebook: {
    name: "Facebook",
    description: "Choose the type of Facebook engagement task.",
    subcategories: [
      {
        id: "follow-page",
        name: "Follow Page",
        description: "Ask workers to follow your Facebook page.",
        icon: UserPlus,
      },
      {
        id: "like-post",
        name: "Like Post",
        description: "Ask workers to like your Facebook post.",
        icon: Heart,
      },
      {
        id: "comment-post",
        name: "Comment",
        description: "Ask workers to comment on your Facebook post.",
        icon: MessageCircle,
      },
      {
        id: "share-post",
        name: "Share Post",
        description: "Ask workers to share your Facebook post.",
        icon: Share2,
      },
    ],
  },

  "search-review": {
    name: "Search & Reviews",
    description: "Choose the type of search or review activity.",
    subcategories: [
      {
        id: "google-search",
        name: "Google Search",
        description: "Ask workers to search for a business or website.",
        icon: MousePointerClick,
      },
      {
        id: "business-review",
        name: "Business Review",
        description: "Ask workers to submit feedback or a review.",
        icon: Star,
      },
      {
        id: "product-feedback",
        name: "Product Feedback",
        description: "Ask workers to provide feedback about a product.",
        icon: MessageCircle,
      },
    ],
  },

  /* ====================== NEW CATEGORIES ====================== */

  "social-media-discovery": {
    name: "Social Media Discovery",
    description:
      "Help people discover your brand, profile or content across major social platforms.",
    subcategories: [
      {
        id: "whatsapp-telegram",
        name: "WhatsApp / Telegram",
        description: "Grow your WhatsApp or Telegram presence and communities.",
        icon: Send,
      },
      {
        id: "instagram-tiktok",
        name: "Instagram / TikTok",
        description: "Increase discovery on Instagram and TikTok.",
        icon: Camera,
      },
      {
        id: "youtube-twitch",
        name: "YouTube / Twitch",
        description: "Boost discovery on YouTube and Twitch.",
        icon: Play,
      },
      {
        id: "facebook-snapchat",
        name: "Facebook / Snapchat",
        description: "Expand reach on Facebook and Snapchat.",
        icon: Users,
      },
      {
        id: "linkedin-x",
        name: "LinkedIn / X",
        description: "Grow visibility on LinkedIn and X (Twitter).",
        icon: Globe,
      },
      {
        id: "reddit-threads",
        name: "Reddit / Threads",
        description: "Get discovered on Reddit and Meta Threads.",
        icon: MessageCircle,
      },
      {
        id: "pinterest-discord",
        name: "Pinterest / Discord",
        description: "Increase discovery on Pinterest and Discord.",
        icon: Layers,
      },
      {
        id: "others",
        name: "Others",
        description: "Any other social platform or discovery method.",
        icon: Compass,
      },
    ],
  },

  "hashtag-trend": {
    name: "Hashtag & Trend Campaigns",
    description: "Ride trending topics and hashtags to increase visibility.",
    subcategories: [
      {
        id: "use-branded-hashtag",
        name: "Use Branded Hashtag",
        description: "Ask workers to post using your branded hashtag.",
        icon: Hash,
      },
      {
        id: "join-trending-topic",
        name: "Join Trending Topic",
        description: "Have workers engage with a current trending topic.",
        icon: TrendingUp,
      },
      {
        id: "create-trend-content",
        name: "Create Trend Content",
        description: "Ask workers to create content around a specific trend.",
        icon: PenTool,
      },
      {
        id: "hashtag-challenge",
        name: "Hashtag Challenge",
        description: "Launch or participate in a hashtag challenge.",
        icon: Zap,
      },
    ],
  },

  "influencer-ambassador": {
    name: "Influencer & Ambassadors",
    description: "Work with creators and brand ambassadors.",
    subcategories: [
      {
        id: "micro-influencer",
        name: "Micro-Influencer Collaboration",
        description: "Partner with micro-influencers for authentic reach.",
        icon: Sparkles,
      },
      {
        id: "brand-ambassador",
        name: "Brand Ambassador Program",
        description: "Recruit long-term brand ambassadors.",
        icon: Star,
      },
      {
        id: "product-seeding",
        name: "Product Seeding",
        description: "Send products to creators for organic content.",
        icon: Package,
      },
      {
        id: "sponsored-post",
        name: "Sponsored Post / Story",
        description: "Paid posts or stories from influencers.",
        icon: Share2,
      },
    ],
  },

  "content-sharing": {
    name: "Content Sharing / Viral",
    description: "Amplify posts, reels, and content across platforms.",
    subcategories: [
      {
        id: "share-post",
        name: "Share Post",
        description: "Ask workers to share a specific post.",
        icon: Share2,
      },
      {
        id: "repost-story",
        name: "Repost / Story Share",
        description: "Have workers repost or add to their stories.",
        icon: Camera,
      },
      {
        id: "viral-challenge",
        name: "Viral Challenge",
        description: "Encourage participation in a viral challenge.",
        icon: Zap,
      },
      {
        id: "cross-platform-share",
        name: "Cross-Platform Share",
        description: "Share content across multiple platforms.",
        icon: Layers,
      },
    ],
  },

  "podcast-audio": {
    name: "Podcast & Audio",
    description: "Podcast shoutouts, audio ads, and interviews.",
    subcategories: [
      {
        id: "podcast-listen",
        name: "Listen to Episode",
        description: "Ask workers to listen to a specific podcast episode.",
        icon: Headphones,
      },
      {
        id: "podcast-review",
        name: "Leave a Review",
        description: "Request ratings and reviews on podcast platforms.",
        icon: Star,
      },
      {
        id: "podcast-share",
        name: "Share Episode",
        description: "Have workers share a podcast episode.",
        icon: Share2,
      },
      {
        id: "audio-ad",
        name: "Audio Ad / Shoutout",
        description: "Paid or organic audio mentions and ads.",
        icon: Mic2,
      },
    ],
  },

  "live-streaming": {
    name: "Live Streaming",
    description: "Twitch, Kick, YouTube Live, Instagram Live campaigns.",
    subcategories: [
      {
        id: "watch-stream",
        name: "Watch Live Stream",
        description: "Ask workers to watch a live stream.",
        icon: Video,
      },
      {
        id: "follow-streamer",
        name: "Follow / Subscribe Streamer",
        description: "Grow followers or subscribers on streaming platforms.",
        icon: UserPlus,
      },
      {
        id: "chat-engage",
        name: "Engage in Chat",
        description: "Have workers participate in live chat.",
        icon: MessageCircle,
      },
      {
        id: "raid-host",
        name: "Raid / Host Support",
        description: "Support streamers with raids or hosts.",
        icon: Users,
      },
    ],
  },

  "linkedin-professional": {
    name: "LinkedIn / Professional",
    description: "B2B, thought leadership, and professional networking.",
    subcategories: [
      {
        id: "linkedin-follow",
        name: "Follow Company / Profile",
        description: "Ask workers to follow a LinkedIn page or profile.",
        icon: Building2,
      },
      {
        id: "linkedin-engage",
        name: "Engage with Post",
        description: "Like, comment, or share professional content.",
        icon: ThumbsUp,
      },
      {
        id: "linkedin-connect",
        name: "Connection Request",
        description: "Send or accept connection requests.",
        icon: UserPlus,
      },
      {
        id: "thought-leadership",
        name: "Thought Leadership Content",
        description: "Create or amplify professional insights.",
        icon: Building2,
      },
    ],
  },

  "email-newsletter": {
    name: "Email / Newsletter",
    description: "Newsletter growth and email list building.",
    subcategories: [
      {
        id: "newsletter-signup",
        name: "Newsletter Sign-Up",
        description: "Ask workers to subscribe to your newsletter.",
        icon: Mail,
      },
      {
        id: "email-open",
        name: "Open & Engage Email",
        description: "Have workers open and interact with emails.",
        icon: Eye,
      },
      {
        id: "forward-email",
        name: "Forward / Share Newsletter",
        description: "Encourage sharing of newsletter content.",
        icon: Share2,
      },
      {
        id: "list-growth",
        name: "List Growth Campaign",
        description: "Broader email list building activities.",
        icon: TrendingUp,
      },
    ],
  },

  "local-geo": {
    name: "Local / Geo-targeted",
    description: "Location-based campaigns and local discovery.",
    subcategories: [
      {
        id: "local-checkin",
        name: "Check-in / Visit Location",
        description: "Ask workers to check in or visit a physical location.",
        icon: MapPin,
      },
      {
        id: "local-review",
        name: "Local Business Review",
        description: "Leave reviews on Google, Yelp, or local platforms.",
        icon: Star,
      },
      {
        id: "geo-targeted-post",
        name: "Geo-targeted Post",
        description: "Create or engage with location-specific content.",
        icon: Target,
      },
      {
        id: "local-event",
        name: "Local Event Support",
        description: "Promote or attend local events.",
        icon: Users,
      },
    ],
  },

  "community-engagement": {
    name: "Community & Engagement",
    description: "Build communities and increase meaningful interactions.",
    subcategories: [
      {
        id: "join-community",
        name: "Join Community",
        description: "Ask workers to join a group, forum, or community.",
        icon: Users,
      },
      {
        id: "active-participation",
        name: "Active Participation",
        description: "Encourage regular posts, comments, or discussions.",
        icon: MessageCircle,
      },
      {
        id: "community-moderation",
        name: "Moderation Support",
        description: "Help moderate or welcome new members.",
        icon: Heart,
      },
      {
        id: "event-engagement",
        name: "Community Event",
        description: "Participate in community events or AMAs.",
        icon: Zap,
      },
    ],
  },

  "analytics-performance": {
    name: "Analytics & Performance",
    description: "Data-driven growth and performance campaigns.",
    subcategories: [
      {
        id: "performance-tracking",
        name: "Performance Tracking",
        description: "Track specific metrics or KPIs.",
        icon: BarChart3,
      },
      {
        id: "a-b-testing",
        name: "A/B Testing Support",
        description: "Help test different creative or messaging.",
        icon: Target,
      },
      {
        id: "conversion-actions",
        name: "Conversion Actions",
        description: "Drive specific conversion events.",
        icon: MousePointerClick,
      },
      {
        id: "reporting-feedback",
        name: "Reporting & Feedback",
        description: "Provide structured performance feedback.",
        icon: FileText,
      },
    ],
  },

  "ecommerce-product": {
    name: "E-commerce / Product",
    description: "Product seeding, reviews, and unboxings.",
    subcategories: [
      {
        id: "product-review",
        name: "Product Review",
        description: "Ask workers to review a product.",
        icon: Star,
      },
      {
        id: "unboxing",
        name: "Unboxing Content",
        description: "Create unboxing videos or posts.",
        icon: Package,
      },
      {
        id: "wishlist-add",
        name: "Add to Wishlist / Cart",
        description: "Add products to wishlist or shopping cart.",
        icon: ShoppingBag,
      },
      {
        id: "purchase-support",
        name: "Purchase / Trial Support",
        description: "Support product trials or purchases.",
        icon: Check,
      },
    ],
  },

  "growth-launch": {
    name: "Growth & Launch",
    description: "Product launches, growth hacks, and early adopters.",
    subcategories: [
      {
        id: "early-access",
        name: "Early Access / Beta",
        description: "Invite workers to early access or beta testing.",
        icon: Rocket,
      },
      {
        id: "waitlist-signup",
        name: "Waitlist Sign-Up",
        description: "Grow a product waitlist.",
        icon: UserPlus,
      },
      {
        id: "launch-day-support",
        name: "Launch Day Support",
        description: "Amplify activity on launch day.",
        icon: Zap,
      },
      {
        id: "referral-growth",
        name: "Referral / Invite Friends",
        description: "Encourage referrals and invites.",
        icon: Share2,
      },
    ],
  },

  "ugc-content-creation": {
    name: "UGC / Content Creation",
    description: "User-generated content and custom creative.",
    subcategories: [
      {
        id: "create-post",
        name: "Create Original Post",
        description: "Ask workers to create an original post about your brand.",
        icon: PenTool,
      },
      {
        id: "create-video",
        name: "Create Video / Reel",
        description: "Produce short-form video content.",
        icon: Video,
      },
      {
        id: "photo-content",
        name: "Photo / Image Content",
        description: "Create photo-based UGC.",
        icon: Camera,
      },
      {
        id: "testimonial",
        name: "Testimonial / Review Video",
        description: "Record video testimonials or reviews.",
        icon: Mic2,
      },
    ],
  },
};

export default function SelectSubcategoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryId = searchParams.get("category");

  const category = useMemo(() => {
    if (!categoryId) return null;
    return categoryData[categoryId] ?? null;
  }, [categoryId]);

  const handleSelectSubcategory = (subcategoryId: string) => {
    if (!categoryId) return;

    router.push(
      `/advertiser/dashboard/campaigns/create/details?category=${categoryId}&subcategory=${subcategoryId}`
    );
  };

  if (!category) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-2xl font-bold text-red-900">Category not found</h1>
          <p className="mt-3 text-sm text-red-700">
            Please return to the category page and select a valid campaign category.
          </p>
          <button
            type="button"
            onClick={() =>
              router.push("/advertiser/dashboard/campaigns/create")
            }
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B3939] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#082d2d]"
          >
            <ArrowLeft size={17} />
            Select Category
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Back button */}
      <button
        type="button"
        onClick={() =>
          router.push("/advertiser/dashboard/campaigns/create")
        }
        className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0B3939]"
      >
        <ArrowLeft size={18} />
        Change Category
      </button>

      {/* Heading */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B3939] text-sm font-bold text-white">
            2
          </span>
          <div>
            <p className="text-sm font-semibold text-[#0B3939]">
              Step 2 of 3
            </p>
            <h1 className="text-3xl font-bold text-slate-900">
              Select a Subcategory
            </h1>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
          Choose the specific task type for your campaign.
        </p>
      </div>

      {/* Selected category */}
      <div className="mb-8 rounded-2xl border border-[#0B3939]/15 bg-[#0B3939]/5 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B3939] text-white">
            <Check size={21} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Selected Category
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#0B3939]">
              {category.name}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {category.description}
            </p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-10">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-[#0B3939]">Category</span>
          <span className="text-[#0B3939]">Subcategory</span>
          <span className="text-slate-400">Campaign Details</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-2/3 rounded-full bg-[#0B3939]" />
        </div>
      </div>

      {/* Notice */}
      <div className="mb-8 flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <CheckCircle2
          size={21}
          className="mt-0.5 shrink-0 text-blue-600"
        />
        <div>
          <h2 className="font-semibold text-blue-950">
            Select the correct task type
          </h2>
          <p className="mt-1 text-sm leading-6 text-blue-800">
            The campaign form and instructions may change based on the
            subcategory you select.
          </p>
        </div>
      </div>

      {/* Subcategory cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {category.subcategories.map((subcategory) => {
          const Icon = subcategory.icon;

          return (
            <button
              key={subcategory.id}
              type="button"
              onClick={() => handleSelectSubcategory(subcategory.id)}
              className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#0B3939]/40 hover:shadow-lg"
            >
              <div className="mb-5 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0B3939]/10 text-[#0B3939] transition group-hover:bg-[#0B3939] group-hover:text-white">
                  <Icon size={23} />
                </div>
                <ChevronRight
                  size={20}
                  className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#0B3939]"
                />
              </div>

              <h2 className="text-lg font-bold text-slate-900">
                {subcategory.name}
              </h2>

              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                {subcategory.description}
              </p>

              <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0B3939]">
                Select task type
                <ArrowRight
                  size={16}
                  className="transition group-hover:translate-x-1"
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}