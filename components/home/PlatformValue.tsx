// components/home/PlatformValue.tsx
"use client";

import {
  Wallet,
  Search,
  Users,
  ChartNoAxesCombined,
  type LucideIcon,
} from "lucide-react";

type ValueCard = {
  icon: LucideIcon;
  title: string;
  description: string;
  label: string;
};

const cards: ValueCard[] = [
  {
    icon: Wallet,
    title: "Earn Flexibly",
    description:
      "Discover available tasks, complete them on your schedule, submit your proof, and earn rewards.",
    label: "For Workers",
  },
  {
    icon: Search,
    title: "Find the Right Tasks",
    description:
      "Explore tasks across different categories and choose opportunities that match your skills and interests.",
    label: "Explore Gigs",
  },
  {
    icon: Users,
    title: "Reach More Workers",
    description:
      "Create campaigns and connect with workers who can help complete your marketing, research, engagement, and other tasks.",
    label: "For Advertisers",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Simple & Trackable",
    description:
      "Manage your campaigns, monitor submissions, review task progress, and keep everything organised in one place.",
    label: "Manage Campaigns",
  },
];

export default function PlatformValue() {
  return (
    <section className="bg-[#f7faf9] py-14 sm:py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 lg:px-12">
        {/* Header */}
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12 md:mb-14">
          <h2 className="text-2xl font-bold tracking-tight text-[#0b3939] sm:text-3xl md:text-4xl">
            Everything You Need to Get More Done
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#0b3939]/80 sm:mt-4 sm:text-base md:text-lg">
            GigPlace makes it simple to earn from tasks and get your campaigns
            completed by real workers.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.title}
                className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#0b3939]/15 hover:shadow-md sm:p-6"
              >
                {/* Icon */}
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f3f2] text-[#0b3939] transition-colors duration-300 group-hover:bg-[#0b3939] group-hover:text-white sm:h-11 sm:w-11 sm:rounded-2xl">
                  <Icon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" strokeWidth={1.75} />
                </div>

                {/* Label */}
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#0b3939]/60 sm:text-xs">
                  {card.label}
                </p>

                {/* Title */}
                <h3 className="text-base font-semibold text-[#102a2a] sm:text-lg">
                  {card.title}
                </h3>

                {/* Description */}
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[#0b3939]/75">
                  {card.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}