"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Compass,
  Megaphone,
  Network,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

type Benefit = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const benefits: Benefit[] = [
  {
    icon: Wallet,
    title: "Flexible Earning Opportunities",
    description:
      "Find tasks that fit your interests, skills, and available time.",
  },
  {
    icon: Compass,
    title: "Discover Tasks Easily",
    description:
      "Browse different task categories and quickly find opportunities that match you.",
  },
  {
    icon: BadgeCheck,
    title: "Clear & Transparent Rewards",
    description:
      "Know what a task offers before you decide to complete it.",
  },
  {
    icon: BarChart3,
    title: "Track Your Progress",
    description:
      "Monitor your submissions, campaign activity, and task progress from your dashboard.",
  },
  {
    icon: Network,
    title: "Built for Both Sides",
    description:
      "Workers and advertisers can connect through one organised marketplace.",
  },
];

const trustItems = [
  "Simple to use",
  "Built for Workers & Advertisers",
  "Multiple task categories",
] as const;

const listVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};

function EcosystemVisual({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45 }}
      className="relative mx-auto w-full max-w-sm rounded-2xl border border-[#0b3939]/10 bg-white/50 p-5 shadow-sm backdrop-blur-sm sm:p-6"
      aria-hidden
    >
      {/* Workers */}
      <div className="mb-4 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#0b3939]/10 bg-[#0b3939]/5 px-3 py-1.5 text-xs font-semibold text-[#0b3939]">
          <Users className="h-3.5 w-3.5" />
          Workers
        </div>
      </div>

      <div className="mx-auto mb-3 h-6 w-px bg-[#0b3939]/20" />

      {/* Centre hub */}
      <div className="mx-auto flex max-w-[200px] flex-col items-center rounded-2xl border border-[#0b3939]/15 bg-[#0b3939] px-4 py-4 text-center text-white shadow-md">
        <Sparkles className="mb-1.5 h-4 w-4 text-emerald-300" />
        <p className="text-sm font-bold tracking-wide">GigPlace</p>
        <p className="mt-0.5 text-[11px] text-white/70">Marketplace</p>
      </div>

      <div className="mx-auto mt-3 flex h-6 justify-center gap-16">
        <div className="h-full w-px bg-[#0b3939]/20" />
        <div className="h-full w-px bg-[#0b3939]/20" />
      </div>

      {/* Tasks / Campaigns */}
      <div className="mt-1 grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center rounded-xl border border-[#0b3939]/10 bg-white/70 px-3 py-3 text-center">
          <Compass className="mb-1.5 h-4 w-4 text-[#0b3939]" />
          <p className="text-xs font-semibold text-[#0b3939]">Tasks</p>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-[#0b3939]/10 bg-white/70 px-3 py-3 text-center">
          <Megaphone className="mb-1.5 h-4 w-4 text-[#0b3939]" />
          <p className="text-xs font-semibold text-[#0b3939]">Campaigns</p>
        </div>
      </div>

      <div className="mx-auto mt-3 h-6 w-px bg-[#0b3939]/20" />

      <div className="mt-1 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
          <BadgeCheck className="h-3.5 w-3.5" />
          Results
        </div>
      </div>
    </motion.div>
  );
}

export default function WhyGigPlace() {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <section
      className="relative overflow-hidden py-12 sm:py-14 md:py-16 lg:py-20"
      style={{
        background:
          "linear-gradient(135deg, #e7f6f5 0%, #f1fbfa 45%, #dff3f1 100%)",
      }}
    >
      {/* Decorations */}
      <div
        className={`pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-[#0b3939]/[0.06] blur-3xl ${
          reduceMotion ? "" : "animate-[whyfloat_20s_ease-in-out_infinite]"
        }`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#075e5e]/10 blur-3xl ${
          reduceMotion
            ? ""
            : "animate-[whyfloat_24s_ease-in-out_infinite_reverse]"
        }`}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(11,57,57,0.12) 1px, transparent 0)",
          backgroundSize: "26px 26px",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 md:px-8 lg:px-12">
        {/* Header */}
        <motion.div
          className="mx-auto mb-10 max-w-2xl text-center sm:mb-12 md:mb-14"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0b3939]/60 sm:text-sm">
            Why choose GigPlace?
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#0b3939] sm:text-3xl md:text-4xl">
            Why GigPlace?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#0b3939]/75 sm:text-base">
            Built to make earning from tasks and getting work done simpler,
            clearer, and more accessible.
          </p>
        </motion.div>

        {/* Main grid */}
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          {/* Left */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4 }}
          >
            <h3 className="text-2xl font-bold leading-tight tracking-tight text-[#0b3939] sm:text-3xl md:text-4xl">
              One Platform.
              <br />
              More Possibilities.
            </h3>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#0b3939]/75 sm:text-base">
              Whether you&apos;re looking for flexible tasks to complete or
              people to help move your campaign forward, GigPlace brings both
              sides together in one simple platform.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/gigs"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b3939] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#062b2b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b3939]"
              >
                Explore Gigs
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login?next=/advertiser/dashboard/campaigns/create"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0b3939]/25 bg-white/60 px-5 py-3 text-sm font-semibold text-[#0b3939] backdrop-blur-sm transition hover:border-[#0b3939]/40 hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b3939]"
              >
                Create a Campaign
              </Link>
            </div>

            <div className="mt-8 sm:mt-10">
              <EcosystemVisual reduceMotion={reduceMotion} />
            </div>
          </motion.div>

          {/* Right — benefit rows */}
          <motion.div
            className="overflow-hidden rounded-2xl border border-[#0b3939]/10 bg-white/55 shadow-sm backdrop-blur-sm"
            variants={listVariants}
            initial={reduceMotion ? false : "hidden"}
            whileInView={reduceMotion ? undefined : "visible"}
            viewport={{ once: true, margin: "-30px" }}
          >
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              const isLast = index === benefits.length - 1;

              return (
                <motion.div
                  key={benefit.title}
                  variants={itemVariants}
                  className={`group flex gap-3.5 px-4 py-4 transition-colors duration-200 hover:bg-[#0b3939]/[0.04] sm:gap-4 sm:px-5 sm:py-5 ${
                    isLast ? "" : "border-b border-[#0b3939]/8"
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b3939]/8 text-[#0b3939] transition-transform duration-200 group-hover:scale-105 sm:h-11 sm:w-11">
                    <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={1.75} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-[#102a2a] sm:text-base">
                        <span className="mr-2 text-xs font-bold text-[#0b3939]/45">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {benefit.title}
                      </h4>
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#0b3939]/25 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#0b3939]/55" />
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#0b3939]/70 sm:text-sm">
                      {benefit.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Trust indicators */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 sm:mt-12 sm:gap-3">
          {trustItems.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#0b3939]/10 bg-white/50 px-3 py-1.5 text-xs font-medium text-[#0b3939]/80 backdrop-blur-sm"
            >
              <BadgeCheck className="h-3.5 w-3.5 text-[#0b3939]" aria-hidden />
              {item}
            </span>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes whyfloat {
          0%,
          100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(10px, 14px);
          }
        }
      `}</style>
    </section>
  );
}