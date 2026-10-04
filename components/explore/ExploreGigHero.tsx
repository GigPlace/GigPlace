"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  Briefcase,
  Compass,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* =========================================
   TYPES
========================================= */

export type ExploreGigsHeroProps = {
  searchValue?: string;
  onSearch?: (query: string) => void;
  onPopularClick?: (label: string) => void;
  className?: string;
};

type CampaignCard = {
  id: string;
  title: string;
  reward_per_task: number;
  total_slots: number;
  completed_slots: number;
};

const POPULAR_SEARCHES = [
  "Social Media",
  "Surveys",
  "App Testing",
  "Data Tasks",
  "Marketing",
  "Research",
] as const;

/** Fixed professional marketplace / work background */
const HERO_BG =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80";

/* =========================================
   HELPERS
========================================= */

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

/* =========================================
   FLOATING CARD
========================================= */

function FloatingGigCard({
  title,
  reward,
  slots,
  className = "",
}: {
  title: string;
  reward: string;
  slots?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-white/20 bg-white/12 p-3.5 shadow-lg backdrop-blur-md sm:rounded-2xl sm:p-4 ${className}`}
      aria-hidden="true"
    >
      <p className="line-clamp-2 text-sm font-semibold leading-snug text-white sm:text-[15px]">
        {title}
      </p>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-emerald-300">{reward}</span>
        {slots && (
          <span className="text-[10px] text-teal-100/70 sm:text-[11px]">
            {slots}
          </span>
        )}
      </div>
    </div>
  );
}

/* =========================================
   HERO
========================================= */

export default function ExploreGigsHero({
  searchValue,
  onSearch,
  onPopularClick,
  className = "",
}: ExploreGigsHeroProps) {
  const searchId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(searchValue ?? "");
  const [isFocused, setIsFocused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [entered, setEntered] = useState(false);

  const [campaigns, setCampaigns] = useState<CampaignCard[]>([]);
  const [activeCount, setActiveCount] = useState<number | null>(null);

  useEffect(() => {
    if (typeof searchValue === "string") setQuery(searchValue);
  }, [searchValue]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const t = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Simple campaign fetch for cards + count
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { count } = await supabase
          .from("campaigns")
          .select("id", { count: "exact", head: true })
          .in("status", ["active", "pending", "approved"]);

        if (!cancelled && typeof count === "number") {
          setActiveCount(count);
        }

        const { data, error } = await supabase
          .from("campaigns")
          .select("id, title, reward_per_task, total_slots, completed_slots")
          .in("status", ["active", "pending", "approved"])
          .order("created_at", { ascending: false })
          .limit(3);

        if (error) {
          console.error("Hero campaigns:", error);
          return;
        }

        if (!cancelled && data) {
          setCampaigns(
            data.map((row) => ({
              id: row.id,
              title: row.title,
              reward_per_task: Number(row.reward_per_task) || 0,
              total_slots: Number(row.total_slots) || 0,
              completed_slots: Number(row.completed_slots) || 0,
            }))
          );
        }
      } catch (err) {
        console.error(err);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      onSearch?.(query.trim());
    },
    [query, onSearch]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    onSearch?.("");
    inputRef.current?.focus();
  }, [onSearch]);

  const handlePopular = useCallback(
    (label: string) => {
      setQuery(label);
      onPopularClick?.(label);
      onSearch?.(label);
    },
    [onPopularClick, onSearch]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" && query) handleClear();
  };

  const fade = () =>
    reduceMotion
      ? "opacity-100 translate-y-0"
      : entered
        ? "opacity-100 translate-y-0 transition-all duration-600 ease-out"
        : "opacity-0 translate-y-3";

  const fadeStyle = (ms: number) =>
    reduceMotion ? undefined : { transitionDelay: entered ? `${ms}ms` : "0ms" };

  const visualCards =
    campaigns.length > 0
      ? campaigns.map((c) => {
          const remaining = c.total_slots - c.completed_slots;
          return {
            title: c.title,
            reward: `${formatNaira(c.reward_per_task)} / task`,
            slots: remaining > 0 ? `${remaining} slots left` : undefined,
          };
        })
      : [
          {
            title: "Promote a New App",
            reward: "₦250 / task",
            slots: "Slots available",
          },
          {
            title: "Complete Market Research",
            reward: "₦500 / task",
            slots: undefined,
          },
          {
            title: "Test Mobile Features",
            reward: "₦350 / task",
            slots: "Open slots",
          },
        ];

  return (
    <section
      className={`relative isolate overflow-hidden ${className}`}
      aria-labelledby="explore-gigs-heading"
    >
      {/* ========== FIXED ONLINE BACKGROUND IMAGE ========== */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${HERO_BG})` }}
        />
        {/* Dark teal overlay so text stays readable */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(
                135deg,
                rgba(6, 40, 40, 0.90) 0%,
                rgba(11, 57, 57, 0.86) 50%,
                rgba(8, 42, 42, 0.88) 100%
              )
            `,
          }}
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at 25% 35%, rgba(45, 160, 150, 0.25) 0%, transparent 55%)",
          }}
        />
      </div>

      {/* ========== CONTENT ========== */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 md:py-14 lg:px-8 lg:py-16">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10 xl:gap-12">
          {/* LEFT */}
          <div className="min-w-0">
            <div
              className={`mb-3 inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 sm:mb-4 ${fade()}`}
              style={fadeStyle(0)}
            >
              <Compass size={13} className="text-teal-300" aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-teal-200 sm:text-[11px]">
                Explore Gigs
              </span>
            </div>

            <h1
              id="explore-gigs-heading"
              className={`text-[1.75rem] font-bold leading-[1.2] tracking-tight text-white sm:text-3xl md:text-4xl lg:text-[2.5rem] xl:text-5xl ${fade()}`}
              style={fadeStyle(60)}
            >
              Discover Gigs.
              <br />
              <span className="bg-gradient-to-r from-teal-200 via-emerald-200 to-teal-100 bg-clip-text text-transparent">
                Find Opportunities.
              </span>
            </h1>

            <p
              className={`mt-3 max-w-lg text-sm leading-relaxed text-teal-100/80 sm:mt-3.5 sm:text-[15px] md:text-base ${fade()}`}
              style={fadeStyle(120)}
            >
              Explore available tasks from campaigns on GigPlace, discover
              opportunities that match your interests, and find your next task.
            </p>

            <form
              onSubmit={handleSubmit}
              className={`mt-5 sm:mt-6 ${fade()}`}
              style={fadeStyle(180)}
              role="search"
              aria-label="Search gigs"
            >
              <div
                className={`flex flex-col gap-2 rounded-xl border bg-white/95 p-1.5 shadow-lg shadow-black/15 transition-all sm:flex-row sm:items-center sm:gap-1.5 sm:rounded-2xl sm:p-2 ${
                  isFocused
                    ? "border-teal-400 ring-4 ring-teal-400/20"
                    : "border-white/25"
                }`}
              >
                <div className="relative min-w-0 flex-1">
                  <label htmlFor={searchId} className="sr-only">
                    Search gigs, tasks or campaigns
                  </label>
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    ref={inputRef}
                    id={searchId}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search gigs, tasks or campaigns..."
                    autoComplete="off"
                    className="w-full min-w-0 rounded-lg border-0 bg-transparent py-2.5 pl-10 pr-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 sm:rounded-xl sm:py-3 sm:text-[15px]"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b3939]"
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0b3939] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#062828] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 active:scale-[0.98] sm:rounded-xl sm:px-5 sm:py-3"
                >
                  <Search size={16} aria-hidden="true" />
                  Search Gigs
                </button>
              </div>
            </form>

            <div
              className={`mt-4 flex flex-wrap items-center gap-1.5 sm:gap-2 ${fade()}`}
              style={fadeStyle(240)}
            >
              <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-200/70 sm:text-xs">
                Popular:
              </span>
              {POPULAR_SEARCHES.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handlePopular(label)}
                  className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-teal-100 transition hover:border-teal-300/40 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 active:scale-[0.97] sm:px-3 sm:py-1.5 sm:text-xs"
                >
                  {label}
                </button>
              ))}
            </div>

            <div
              className={`mt-4 flex items-center gap-2 sm:mt-5 ${fade()}`}
              style={fadeStyle(300)}
            >
              <span className="relative flex h-2 w-2">
                {!reduceMotion && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                )}
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <p className="text-xs text-teal-100/75 sm:text-sm">
                {typeof activeCount === "number" && activeCount > 0 ? (
                  <>
                    <span className="font-semibold text-white">
                      {activeCount.toLocaleString()} Active Gig
                      {activeCount === 1 ? "" : "s"}
                    </span>
                    <span className="text-teal-100/55">
                      {" "}
                      · available right now
                    </span>
                  </>
                ) : (
                  <span>
                    Browse available opportunities from active campaigns
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* RIGHT — desktop cards from campaigns */}
          <div
            className={`relative mx-auto hidden w-full max-w-sm lg:block ${
              reduceMotion
                ? "opacity-100"
                : entered
                  ? "opacity-100 transition-opacity duration-700 delay-200"
                  : "opacity-0"
            }`}
            aria-hidden="true"
          >
            <div className="relative h-[280px] w-full xl:h-[300px]">
              <div
                className={`absolute left-0 top-0 w-[210px] xl:w-[230px] ${
                  reduceMotion ? "" : "animate-[float_6s_ease-in-out_infinite]"
                }`}
              >
                <FloatingGigCard {...visualCards[0]} />
              </div>

              {visualCards[1] && (
                <div
                  className={`absolute right-0 top-[85px] w-[200px] xl:w-[220px] ${
                    reduceMotion
                      ? ""
                      : "animate-[float_7s_ease-in-out_infinite]"
                  }`}
                  style={reduceMotion ? undefined : { animationDelay: "1s" }}
                >
                  <FloatingGigCard {...visualCards[1]} />
                </div>
              )}

              {visualCards[2] && (
                <div
                  className={`absolute bottom-0 left-6 w-[195px] xl:w-[210px] ${
                    reduceMotion
                      ? ""
                      : "animate-[float_5.5s_ease-in-out_infinite]"
                  }`}
                  style={reduceMotion ? undefined : { animationDelay: "0.5s" }}
                >
                  <FloatingGigCard {...visualCards[2]} />
                </div>
              )}

              <div className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
                <Sparkles size={14} className="text-teal-200/80" />
              </div>
              <div className="absolute bottom-12 right-1 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
                <Briefcase size={13} className="text-teal-200/70" />
              </div>
            </div>
          </div>

          {/* Mobile cards */}
          <div
            className={`mx-auto w-full max-w-md lg:hidden ${
              reduceMotion
                ? "opacity-100"
                : entered
                  ? "opacity-100 transition-opacity duration-600 delay-300"
                  : "opacity-0"
            }`}
            aria-hidden="true"
          >
            <div className="flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {visualCards.slice(0, 2).map((card, i) => (
                <FloatingGigCard
                  key={i}
                  {...card}
                  className="min-w-[170px] flex-1"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {!reduceMotion && (
        <style jsx global>{`
          @keyframes float {
            0%,
            100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-8px);
            }
          }
        `}</style>
      )}
    </section>
  );
}