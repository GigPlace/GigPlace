'use client';

import Link from 'next/link';
import {
  Search,
  ArrowRight,
  CheckCircle,
  Megaphone,
  Wallet,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Hero() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/explore?search=${encodeURIComponent(q)}`);
    } else {
      router.push('/explore');
    }
  };

  const popularCategories = [
    { label: 'Social Media Engagement', slug: 'social-media-engagement' },
    { label: 'Website Visits', slug: 'website-visits' },
    { label: 'Product Promotion', slug: 'product-promotion' },
    { label: 'App Testing', slug: 'app-testing' },
    { label: 'Surveys', slug: 'surveys' },
    { label: 'Content Engagement', slug: 'content-engagement' },
  ];

  return (
    <section
      className="relative flex items-center overflow-hidden bg-cover bg-center bg-no-repeat
        min-h-[auto] py-14
        sm:py-16
        md:min-h-[70vh] md:py-20
        lg:min-h-[85vh] lg:py-24"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=2070')",
      }}
    >
      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/85 to-[#0b3939]/65" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          {/* Left content */}
          <div className="max-w-2xl space-y-6 sm:space-y-7 md:space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-2 text-[11px] font-medium text-[#0b3939] shadow backdrop-blur-md sm:px-5 sm:py-2.5 sm:text-sm">
              <Megaphone className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span>Create campaigns. Complete tasks. Earn rewards.</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl font-bold leading-[1.15] tracking-tight text-white sm:text-4xl md:text-4xl lg:text-5xl">
              Promote what matters.
              <br />
              Complete gigs.{' '}
              <span className="text-[#8ed1c8]">Earn rewards.</span>
            </h1>

            {/* Description */}
            <p className="max-w-xl text-sm leading-relaxed text-white/85 sm:text-base md:text-lg">
              GigPlace connects campaign creators with active users. Create
              promotional gigs, discover available tasks, complete verified
              activities, and earn rewards—all from one platform.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8ed1c8] px-6 py-3.5 text-sm font-semibold text-[#0b3939] transition hover:bg-[#7bc4ba] active:scale-[0.98]"
              >
                <UserPlus className="h-4 w-4" />
                Create free account
              </Link>

              <Link
                href="#explore"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white hover:text-[#0b3939]"
              >
                Explore gigs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="relative max-w-2xl">
              <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all focus-within:ring-4 focus-within:ring-white/30 sm:flex-row sm:rounded-3xl">
                <div className="flex flex-1 items-center px-4 sm:px-5">
                  <Search className="mr-2 h-5 w-5 shrink-0 text-gray-400 sm:mr-3" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search available gigs or campaigns..."
                    className="w-full bg-transparent py-3.5 text-sm text-gray-900 outline-none placeholder:text-gray-500 sm:py-5 sm:text-base"
                    aria-label="Search available gigs"
                  />
                </div>

                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 bg-[#0b3939] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#062828] active:scale-[0.98] sm:px-8 sm:py-5 sm:text-base"
                >
                  Explore Gigs
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
            </form>

            {/* Categories */}
            <div>
              <p className="mb-2.5 text-xs font-medium text-white/80 sm:mb-3 sm:text-sm">
                Explore popular gig categories
              </p>

              <div className="flex flex-wrap gap-2 sm:gap-2.5">
                {popularCategories.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/explore?category=${encodeURIComponent(category.slug)}`}
                    className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-white hover:text-[#0b3939] sm:px-4 sm:py-2 sm:text-sm"
                  >
                    {category.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Trust bar */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-white/90 sm:gap-x-6 sm:gap-y-3 sm:pt-2 sm:text-sm">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-[#8ed1c8] sm:h-5 sm:w-5" />
                <span>Verified task process</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-[#8ed1c8] sm:h-5 sm:w-5" />
                <span>Transparent rewards</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-[#8ed1c8] sm:h-5 sm:w-5" />
                <span>Secure wallet system</span>
              </div>
            </div>
          </div>

          {/* Right visual – desktop only */}
          <div className="relative hidden lg:block">
            <div className="ml-auto max-w-md rounded-3xl border border-white/30 bg-white/95 p-7 shadow-2xl backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#647575]">Your GigPlace wallet</p>
                  <h2 className="mt-1 text-3xl font-bold text-[#102a2a]">
                    ₦25,000
                  </h2>
                </div>
                <div className="rounded-2xl bg-[#e8f3f2] p-3 text-[#0b3939]">
                  <Wallet className="h-6 w-6" />
                </div>
              </div>

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

              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#102a2a]">
                  Recent activity
                </p>

                <div className="flex items-center justify-between rounded-xl bg-[#f5f8f8] p-4">
                  <div>
                    <p className="font-medium text-[#102a2a]">Task completed</p>
                    <p className="text-xs text-[#647575]">
                      Reward added to wallet
                    </p>
                  </div>
                  <span className="font-semibold text-emerald-600">+₦500</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#f5f8f8] p-4">
                  <div>
                    <p className="font-medium text-[#102a2a]">
                      New promotional gig
                    </p>
                    <p className="text-xs text-[#647575]">Reward: ₦200</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-[#0b3939]" />
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-8 rounded-2xl border border-white/30 bg-white/95 p-4 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-100 p-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#102a2a]">
                    Gig approved
                  </p>
                  <p className="text-xs text-[#647575]">Your reward is ready</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}