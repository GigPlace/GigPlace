// components/home/HowItWorks.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  MousePointerClick,
  Upload,
  Wallet,
  PlusCircle,
  ListPlus,
  Users,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

type Step = {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

const workerSteps: Step[] = [
  {
    number: "01",
    icon: Search,
    title: "Find a Task",
    description:
      "Browse available gigs and choose tasks that match your interests and skills.",
  },
  {
    number: "02",
    icon: MousePointerClick,
    title: "Complete the Task",
    description:
      "Follow the task instructions and complete the required activity.",
  },
  {
    number: "03",
    icon: Upload,
    title: "Submit Proof",
    description:
      "Submit the required proof so your work can be reviewed.",
  },
  {
    number: "04",
    icon: Wallet,
    title: "Get Rewarded",
    description:
      "Once your submission is approved, your reward is added to your account.",
  },
];

const advertiserSteps: Step[] = [
  {
    number: "01",
    icon: PlusCircle,
    title: "Create a Campaign",
    description:
      "Set up your campaign with clear instructions, rewards, and task requirements.",
  },
  {
    number: "02",
    icon: ListPlus,
    title: "Publish Your Tasks",
    description:
      "Create tasks and make them available to workers on GigPlace.",
  },
  {
    number: "03",
    icon: Users,
    title: "Receive Submissions",
    description:
      "Workers complete your tasks and submit their proof for review.",
  },
  {
    number: "04",
    icon: CheckCircle2,
    title: "Review & Track",
    description:
      "Review submissions, track progress, and monitor your campaign performance.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const stepVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

function StepItem({
  step,
  isLast,
}: {
  step: Step;
  isLast: boolean;
}) {
  const Icon = step.icon;

  return (
    <motion.li variants={stepVariants} className="relative flex gap-4">
      {!isLast && (
        <span
          className="absolute left-[19px] top-12 h-[calc(100%-1.5rem)] w-px bg-white/15 sm:left-[21px]"
          aria-hidden
        />
      )}

      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-sm transition-transform duration-300 group-hover:scale-105 sm:h-11 sm:w-11">
        <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={1.75} />
      </div>

      <div className="min-w-0 flex-1 pb-6 last:pb-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold tracking-wider text-emerald-300/90">
            {step.number}
          </span>
          <h4 className="text-base font-semibold text-white sm:text-lg">
            {step.title}
          </h4>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-white/65">
          {step.description}
        </p>
      </div>
    </motion.li>
  );
}

function PathCard({
  title,
  subtitle,
  steps,
}: {
  title: string;
  subtitle: string;
  steps: Step[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="group rounded-2xl border border-white/12 bg-white/[0.08] p-5 shadow-lg backdrop-blur-md transition-shadow duration-300 hover:shadow-xl sm:p-6 md:p-7"
    >
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white sm:text-2xl">{title}</h3>
        <p className="mt-1.5 text-sm text-white/65 sm:text-base">{subtitle}</p>
      </div>

      <motion.ol
        className="space-y-0"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-20px" }}
      >
        {steps.map((step, index) => (
          <StepItem
            key={step.number + step.title}
            step={step}
            isLast={index === steps.length - 1}
          />
        ))}
      </motion.ol>
    </motion.div>
  );
}

export default function HowItWorks() {
  return (
    <section
      className="relative overflow-hidden py-14 sm:py-16 md:py-20 lg:py-24"
      style={{
        background:
          "linear-gradient(135deg, #062f2f 0%, #0b3939 45%, #075e5e 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-teal-300/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.03] blur-2xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 md:px-8 lg:px-12">
        <motion.div
          className="mx-auto mb-10 max-w-2xl text-center sm:mb-12 md:mb-14"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            How GigPlace Works
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70 sm:mt-4 sm:text-base md:text-lg">
            Whether you&apos;re here to earn or get things done, GigPlace makes
            the process simple.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-start lg:gap-8">
          <PathCard
            title="For Workers"
            subtitle="Find tasks, complete them, and earn rewards."
            steps={workerSteps}
          />

          <div className="hidden flex-col items-center justify-center gap-3 self-center py-8 lg:flex">
            <div className="h-12 w-px bg-white/20" aria-hidden />
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-white backdrop-blur-sm">
              Gig
              <br />
              Place
            </div>
            <div className="h-12 w-px bg-white/20" aria-hidden />
          </div>

          <div className="flex items-center justify-center gap-3 py-1 lg:hidden">
            <div className="h-px flex-1 bg-white/15" aria-hidden />
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/90">
              GigPlace
            </span>
            <div className="h-px flex-1 bg-white/15" aria-hidden />
          </div>

          <PathCard
            title="For Advertisers"
            subtitle="Create campaigns and get tasks completed."
            steps={advertiserSteps}
          />
        </div>

        {/* CTA — both go to login */}
        <motion.div
          className="mt-12 text-center sm:mt-14 md:mt-16"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h3 className="text-lg font-semibold text-white sm:text-xl">
            Ready to get started?
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/65 sm:text-base">
            Find your next task or launch your next campaign on GigPlace.
          </p>

          <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/login?next=/gigs"
              className="inline-flex items-center justify-center rounded-xl bg-[#F47B20] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Explore Gigs
            </Link>
            <Link
              href="/login?next=/advertiser/dashboard/campaigns/create"
              className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Post a Campaign
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}