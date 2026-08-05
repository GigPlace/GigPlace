'use client';

import Link from 'next/link';
import {
  Search,
  ArrowRight,
  CheckCircle,
  Megaphone,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';

export default function Hero() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (searchQuery.trim()) {
      window.location.href = `/explore?search=${encodeURIComponent(
        searchQuery
      )}`;
    }
  };

  const popularCategories = [
    'Social Media Engagement',
    'Website Visits',
    'Product Promotion',
    'App Testing',
    'Surveys',
    'Content Engagement',
  ];

  return (
    <section
      className="relative min-h-[90vh] flex items-center overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=2070')",
      }}
    >
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#000000]/95 via-[#000000]/85 to-[#0b3939]/65" />

      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20 md:px-8 lg:px-12">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-12">
          {/* Left Content */}
          <div className="max-w-2xl space-y-8">
            {/* Badge */}
            <div className="inline-flex mt-5 items-center gap-2 rounded-full bg-white/95 px-5 py-2.5 md:text-sm text-[12px] font-medium text-[#0b3939] shadow backdrop-blur-md">
              <Megaphone className="h-4 w-4" />
              Create campaigns. Complete tasks. Earn rewards.
            </div>

            {/* Headline */}
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-4xl lg:text-5xl">
              Promote what matters.
              <br />
              Complete gigs.{' '}
              <span className="text-[#8ed1c8]">Earn rewards.</span>
            </h1>

            {/* Description */}
            <p className="max-w-xl text-base leading-relaxed text-white/85 md:text-lg">
              GigPlace connects campaign creators with active users. Create
              promotional gigs, discover available tasks, complete verified
              activities, and earn rewards-all from one platform.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative max-w-2xl">
              <div className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl transition-all focus-within:ring-4 focus-within:ring-white/30 sm:flex-row">
                <div className="flex flex-1 items-center px-5">
                  <Search className="mr-3 h-5 w-5 shrink-0 text-gray-400" />

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search available gigs or campaigns..."
                    className="w-full bg-transparent md:py-5 py-2 text-base text-gray-900 outline-none placeholder:text-gray-500"
                    aria-label="Search available gigs"
                  />
                </div>

                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 bg-[#0b3939] px-8 sm:py-5 py-2 font-semibold text-white transition hover:bg-[#062828] active:scale-[0.98]"
                >
                  Explore Gigs
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </form>

            {/* Popular Categories */}
            <div>
              <p className="mb-3 text-sm font-medium text-white/80">
                Explore popular gig categories
              </p>

              <div className="flex flex-wrap gap-2.5">
                {popularCategories.map((category) => (
                  <Link
                    key={category}
                    href={`/explore?category=${encodeURIComponent(
                      category.toLowerCase().replace(/\s+/g, '-')
                    )}`}
                    className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white hover:text-[#0b3939]"
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </div>

            {/* Trust Bar */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2 text-sm text-white/90">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-[#8ed1c8]" />
                <span>Verified task process</span>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-[#8ed1c8]" />
                <span>Transparent rewards</span>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-[#8ed1c8]" />
                <span>Secure wallet system</span>
              </div>
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative hidden lg:block">
            <div className="ml-auto max-w-md rounded-3xl border border-white/30 bg-white/95 p-7 shadow-2xl backdrop-blur-xl">
              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#647575]">
                    Your GigPlace wallet
                  </p>

                  <h2 className="mt-1 text-3xl font-bold text-[#102a2a]">
                    ₦25,000
                  </h2>
                </div>

                <div className="rounded-2xl bg-[#e8f3f2] p-3 text-[#0b3939]">
                  <Wallet className="h-6 w-6" />
                </div>
              </div>

              {/* Earnings Card */}
              <div className="mb-5 rounded-2xl bg-[#0b3939] p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70">
                      Available earning opportunities
                    </p>

                    <p className="mt-1 text-2xl font-bold">24 Gigs</p>
                  </div>

                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs">
                    Updated today
                  </span>
                </div>
              </div>

              {/* Activity */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#102a2a]">
                  Recent activity
                </p>

                <div className="flex items-center justify-between rounded-xl bg-[#f5f8f8] p-4">
                  <div>
                    <p className="font-medium text-[#102a2a]">
                      Task completed
                    </p>

                    <p className="text-xs text-[#647575]">
                      Reward added to wallet
                    </p>
                  </div>

                  <span className="font-semibold text-emerald-600">
                    +₦500
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#f5f8f8] p-4">
                  <div>
                    <p className="font-medium text-[#102a2a]">
                      New promotional gig
                    </p>

                    <p className="text-xs text-[#647575]">
                      Reward: ₦200
                    </p>
                  </div>

                  <ArrowRight className="h-5 w-5 text-[#0b3939]" />
                </div>
              </div>
            </div>

            {/* Floating Card */}
            <div className="absolute -bottom-6 -left-8 rounded-2xl border border-white/30 bg-white/95 p-4 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-100 p-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#102a2a]">
                    Gig approved
                  </p>

                  <p className="text-xs text-[#647575]">
                    Your reward is ready
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}