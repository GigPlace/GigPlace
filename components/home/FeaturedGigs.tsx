// components/home/FeaturedGigs.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  Loader2,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* =========================
   Types
========================= */

type CampaignEmbed = {
  id: string;
  title: string;
  cover_image_url: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  total_slots: number | null;
  completed_slots: number | null;
  total_budget: number | null;
};

type TaskRow = {
  id: string;
  campaign_id: string;
  title: string;
  task_type: string | null;
  proof_required: boolean | null;
  reward_amount: number | string | null;
  max_workers: number | string | null;
  completed_workers: number | string | null;
  status: string;
  created_at: string;
  campaigns: CampaignEmbed | CampaignEmbed[] | null;
};

type AvailableGig = {
  id: string;
  title: string;
  taskType: string;
  proofRequired: boolean;
  rewardAmount: number;
  maxWorkers: number;
  completedWorkers: number;
  remaining: number;
  createdAt: string;
  campaign: {
    id: string;
    title: string;
    coverImageUrl: string | null;
    endsAt: string | null;
  };
};

const LIMIT = 6;

/* =========================
   Helpers
========================= */

const formatNaira = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);

const formatEndsLabel = (endsAt: string | null): string | null => {
  if (!endsAt) return null;
  const end = new Date(endsAt);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return null;

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Ends today";
  if (days === 1) return "Ends in 1 day";
  if (days <= 7) return `Ends in ${days} days`;

  return `Ends ${end.toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
  })}`;
};

const isCampaignAvailable = (c: CampaignEmbed | null): boolean => {
  if (!c || c.status !== "active") return false;

  const now = new Date();

  // Only hide if already ended (same as Find Tasks)
  if (c.ends_at && new Date(c.ends_at) < now) return false;

  const total = Number(c.total_slots ?? 0);
  const done = Number(c.completed_slots ?? 0);
  if (total > 0 && done >= total) return false;

  return true;
};

const normalizeCampaign = (
  raw: CampaignEmbed | CampaignEmbed[] | null
): CampaignEmbed | null => {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
};

/* =========================
   Skeleton
========================= */

function GigSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] animate-pulse">
      <div className="aspect-video bg-white/10" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/3 rounded bg-white/10" />
        <div className="h-4 w-4/5 rounded bg-white/15" />
        <div className="h-3 w-1/2 rounded bg-white/10" />
        <div className="h-10 rounded-xl bg-white/10" />
        <div className="h-9 rounded-lg bg-white/10" />
      </div>
    </div>
  );
}

/* =========================
   Card
========================= */

function GigCard({
  gig,
  index,
  reduceMotion,
}: {
  gig: AvailableGig;
  index: number;
  reduceMotion: boolean;
}) {
  const endsLabel = formatEndsLabel(gig.campaign.endsAt);
  const href = `/login?next=${encodeURIComponent(`/dashboard/tasks/${gig.id}`)}`;

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/12 bg-white/[0.08] shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-xl"
    >
      {/* Cover */}
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-[#0b3939] to-[#075e5e]">
        {gig.campaign.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gig.campaign.coverImageUrl}
            alt={`Campaign cover for ${gig.campaign.title}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Megaphone className="h-10 w-10 text-white/35" aria-hidden />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium capitalize text-white backdrop-blur-sm">
            {gig.taskType || "Task"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="line-clamp-1 text-xs text-white/55">
          {gig.campaign.title}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-white sm:text-base">
          {gig.title}
        </h3>

        <div className="mt-3 rounded-xl bg-white/[0.08] px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-white/50">
            Reward
          </p>
          <p className="text-base font-bold text-emerald-300 sm:text-lg">
            {formatNaira(gig.rewardAmount)}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/65 sm:text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-1">
            <Users className="h-3 w-3" aria-hidden />
            {gig.remaining} spot{gig.remaining === 1 ? "" : "s"} left
          </span>
          {endsLabel && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-1">
              <CalendarClock className="h-3 w-3" aria-hidden />
              {endsLabel}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-1">
            <ShieldCheck className="h-3 w-3" aria-hidden />
            {gig.proofRequired ? "Proof Required" : "Proof Not Required"}
          </span>
        </div>

        <div className="mt-4 flex-1" />

        <Link
          href={href}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F47B20] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-sm"
        >
          View Task
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </motion.article>
  );
}

/* =========================
   Section
========================= */

export default function FeaturedGigs() {
  const reduceMotion = useReducedMotion() ?? false;
  const [gigs, setGigs] = useState<AvailableGig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGigs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("campaign_tasks")
        .select(
          `
          id,
          campaign_id,
          title,
          task_type,
          proof_required,
          reward_amount,
          max_workers,
          completed_workers,
          status,
          created_at,
          campaigns (
            id,
            title,
            cover_image_url,
            status,
            starts_at,
            ends_at,
            total_slots,
            completed_slots,
            total_budget
          )
        `
        )
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(24);

      if (fetchError) throw fetchError;

      const now = Date.now();
      const rows = (data ?? []) as TaskRow[];

      const available: AvailableGig[] = [];

      for (const row of rows) {
        const campaign = normalizeCampaign(row.campaigns);
        if (!isCampaignAvailable(campaign) || !campaign) continue;

        const maxWorkers = Number(row.max_workers ?? 0);
        const completedWorkers = Number(row.completed_workers ?? 0);
        const remaining = Math.max(0, maxWorkers - completedWorkers);

        if (maxWorkers > 0 && remaining <= 0) continue;

        available.push({
          id: row.id,
          title: row.title,
          taskType: row.task_type ?? "general",
          proofRequired: Boolean(row.proof_required),
          rewardAmount: Number(row.reward_amount ?? 0),
          maxWorkers,
          completedWorkers,
          remaining: maxWorkers > 0 ? remaining : 0,
          createdAt: row.created_at,
          campaign: {
            id: campaign.id,
            title: campaign.title,
            coverImageUrl: campaign.cover_image_url,
            endsAt: campaign.ends_at,
          },
        });

        if (available.length >= LIMIT) break;
      }

      setGigs(available);
    } catch (err: unknown) {
      console.error("Featured gigs error:", err);
      const message =
        err instanceof Error ? err.message : "Unable to load available gigs.";
      setError(message);
      setGigs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGigs();
  }, [loadGigs]);

  return (
    <section
      className="relative overflow-hidden py-12 sm:py-14 md:py-16 lg:py-20"
      style={{
        background:
          "linear-gradient(135deg, #062f2f 0%, #0b3939 45%, #075e5e 100%)",
      }}
    >
      {/* Animated decorations */}
      <div
        className={`pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl ${
          reduceMotion ? "" : "animate-[float_18s_ease-in-out_infinite]"
        }`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-teal-300/10 blur-3xl ${
          reduceMotion ? "" : "animate-[float_22s_ease-in-out_infinite_reverse]"
        }`}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.45) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 md:px-8 lg:px-12">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between md:mb-12">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
              Featured Gigs
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/70 sm:mt-3 sm:text-base">
              Discover available tasks, complete them, and earn rewards on your
              schedule.
            </p>
            <p className="mt-1 text-xs text-white/55 sm:text-sm">
              New opportunities are added regularly.
            </p>
          </div>

          <Link
            href="/gigs"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-emerald-300 transition hover:gap-2 hover:text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            View All Gigs
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <GigSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-10 text-center backdrop-blur-sm">
            <p className="text-sm text-red-100">{error}</p>
            <button
              type="button"
              onClick={loadGigs}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        ) : gigs.length === 0 ? (
          <div className="rounded-2xl border border-white/12 bg-white/[0.06] px-5 py-12 text-center backdrop-blur-sm">
            <Megaphone className="mx-auto h-10 w-10 text-white/30" />
            <h3 className="mt-4 text-lg font-semibold text-white">
              No gigs available right now
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
              New opportunities will appear here when they become available.
            </p>
            <Link
              href="/gigs"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#F47B20] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Explore Gigs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {gigs.map((gig, index) => (
              <GigCard
                key={gig.id}
                gig={gig}
                index={index}
                reduceMotion={reduceMotion}
              />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(12px, 18px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.animate-\\[float_18s_ease-in-out_infinite\\]),
          :global(.animate-\\[float_22s_ease-in-out_infinite_reverse\\]) {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}