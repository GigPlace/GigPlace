"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Camera,
  ClipboardList,
  Database,
  Globe,
  LayoutGrid,
  Megaphone,
  MessageCircle,
  MonitorCheck,
  PenLine,
  Play,
  Search,
  Send,
  Share2,
  Smartphone,
  Star,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type CampaignCategory = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  sort_order: number | null;
};

type CategoryWithCount = CampaignCategory & {
  taskCount: number | null;
};

const categoryIcons: Record<string, LucideIcon> = {
  "sign-up": UserPlus,
  "whatsapp-telegram": Send,
  "instagram-tiktok": Camera,
  youtube: Play,
  "seo-website": Globe,
  discord: MessageCircle,
  facebook: Users,
  "search-review": Search,
  "social-media": Share2,
  surveys: ClipboardList,
  "surveys-research": ClipboardList,
  testing: MonitorCheck,
  "app-website-testing": Smartphone,
  marketing: Megaphone,
  content: PenLine,
  "content-engagement": PenLine,
  data: Database,
  "data-tasks": Database,
  reviews: Star,
  "reviews-feedback": Star,
  other: LayoutGrid,
};

function getCategoryIcon(slug: string | null): LucideIcon {
  if (!slug) return LayoutGrid;
  return categoryIcons[slug] ?? LayoutGrid;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

function CategorySkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-[#0b3939]/8 bg-white/70 p-4 sm:p-5">
      <div className="mb-4 h-10 w-10 rounded-xl bg-[#0b3939]/10" />
      <div className="mb-2 h-4 w-2/3 rounded bg-[#0b3939]/10" />
      <div className="mb-1 h-3 w-full rounded bg-[#0b3939]/8" />
      <div className="h-3 w-4/5 rounded bg-[#0b3939]/8" />
    </div>
  );
}

export default function PopularCategories() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("campaign_categories")
        .select("id, name, slug, description, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (categoriesError) throw categoriesError;

      const list = (categoriesData ?? []) as CampaignCategory[];

      // Optional real counts — only if campaigns expose category_id
      let countsByCategory: Record<string, number> = {};
      try {
        const { data: campaignsData, error: campaignsError } = await supabase
          .from("campaigns")
          .select("category_id")
          .eq("status", "active");

        if (!campaignsError && campaignsData) {
          countsByCategory = campaignsData.reduce<Record<string, number>>(
            (acc, row) => {
              const id = (row as { category_id?: string | null }).category_id;
              if (id) acc[id] = (acc[id] ?? 0) + 1;
              return acc;
            },
            {}
          );
        }
      } catch {
        // Counts are optional — ignore if schema differs
      }

      const withCounts: CategoryWithCount[] = list.map((cat) => ({
        ...cat,
        taskCount:
          Object.keys(countsByCategory).length > 0
            ? countsByCategory[cat.id] ?? 0
            : null,
      }));

      setCategories(withCounts);
    } catch (err: unknown) {
      console.error("Popular categories error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Categories are temporarily unavailable."
      );
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const exploreHref = "/gigs";

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <CategorySkeleton key={i} />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-red-200/80 bg-white/80 px-5 py-8 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={fetchCategories}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#0b3939] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#062b2b]"
          >
            Try again
          </button>
        </div>
      );
    }

    if (categories.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-[#0b3939]/20 bg-white/60 px-5 py-10 text-center">
          <p className="text-sm text-[#0b3939]/70">
            No gig categories available yet.
          </p>
        </div>
      );
    }

    return (
      <motion.div
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-30px" }}
      >
        {categories.map((category) => {
          const Icon = getCategoryIcon(category.slug);
          const href = category.slug
            ? `/gigs?category=${encodeURIComponent(category.slug)}`
            : `/gigs?categoryId=${encodeURIComponent(category.id)}`;

          return (
            <motion.div key={category.id} variants={cardVariants}>
              <Link
                href={href}
                className="group flex h-full flex-col rounded-2xl border border-[#0b3939]/10 bg-white/80 p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#0b3939]/25 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b3939] sm:p-5"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f3f2] text-[#0b3939] transition-colors duration-300 group-hover:bg-[#0b3939] group-hover:text-white sm:h-10 sm:w-10">
                    <Icon
                      className="h-4 w-4 sm:h-[18px] sm:w-[18px]"
                      strokeWidth={1.75}
                    />
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#0b3939]/35 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-[#0b3939]" />
                </div>

                <h3 className="text-sm font-semibold text-[#102a2a] sm:text-base">
                  {category.name}
                </h3>

                <p className="mt-1.5 line-clamp-2 flex-1 text-xs leading-relaxed text-[#0b3939]/70 sm:text-sm">
                  {category.description ||
                    "Explore tasks in this category on GigPlace."}
                </p>

                {category.taskCount !== null && (
                  <p className="mt-3 text-xs font-medium text-[#0b3939]/55">
                    {category.taskCount} available{" "}
                    {category.taskCount === 1 ? "gig" : "gigs"}
                  </p>
                )}
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    );
  }, [loading, error, categories]);

  return (
    <section
      className="relative overflow-hidden py-10 sm:py-12 md:py-16 lg:py-20"
      style={{
        background:
          "linear-gradient(135deg, #f0fafa 0%, #e5f4f3 50%, #f4f9f8 100%)",
      }}
    >
      {/* Subtle decorations */}
      <div
        className="pointer-events-none absolute -left-16 top-10 h-48 w-48 rounded-full bg-[#0b3939]/[0.04] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-0 h-56 w-56 rounded-full bg-teal-400/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 md:px-8 lg:px-12">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between md:mb-12">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-[#0b3939] sm:text-3xl md:text-4xl">
              Popular Gig Categories
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#0b3939]/75 sm:mt-3 sm:text-base">
              Explore tasks across different categories and find opportunities
              that match your skills and interests.
            </p>
          </div>

          <Link
            href={exploreHref}
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#0b3939] transition hover:gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b3939]"
          >
            Explore All Gigs
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {content}
      </div>
    </section>
  );
}