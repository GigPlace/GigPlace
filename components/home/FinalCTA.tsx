// components/home/FinalCTA.tsx
'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

export default function FinalCTA() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const items = section.querySelectorAll('.cta-reveal');

    if (prefersReduced) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            items.forEach((el) => el.classList.add('is-visible'));
            observer.disconnect();
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -30px 0px' }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="final-cta"
      className="relative overflow-hidden bg-[#0b3939]/95 py-12 sm:py-14 md:py-16 lg:py-20"
      aria-labelledby="final-cta-heading"
    >
      {/* Soft transparent overlays */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-1/4 top-0 h-[70%] w-[70%] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(20,184,166,0.14)_0%,_transparent_70%)] blur-3xl" />
        <div className="absolute -right-1/4 bottom-0 h-[60%] w-[60%] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(45,212,191,0.10)_0%,_transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />

        {/* Very light grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Soft orbs – fewer & smaller */}
        <div className="cta-float absolute left-[10%] top-[25%] h-16 w-16 rounded-full bg-teal-400/10 blur-2xl md:h-24 md:w-24" />
        <div className="cta-float-delayed absolute bottom-[20%] right-[10%] h-14 w-14 rounded-full bg-emerald-400/10 blur-2xl md:h-20 md:w-20" />
      </div>

      {/* Decorative cards – only xl+ to keep mobile clean */}
      <div className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden="true">
        <div className="cta-card absolute left-[5%] top-[30%] w-36 rotate-[-5deg] rounded-xl border border-white/10 bg-white/5 p-2.5 shadow-lg backdrop-blur-sm">
          <div className="mb-1.5 flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-teal-500/30" />
            <div className="h-1.5 w-12 rounded-full bg-white/20" />
          </div>
          <div className="mb-1 h-1.5 w-full rounded-full bg-white/15" />
          <div className="h-1.5 w-2/3 rounded-full bg-white/10" />
          <div className="mt-2 text-[9px] font-medium text-teal-300/80">+$12.50</div>
        </div>

        <div className="cta-card-delayed absolute right-[5%] top-[28%] w-32 rotate-[4deg] rounded-xl border border-white/10 bg-white/5 p-2.5 shadow-lg backdrop-blur-sm">
          <div className="mb-1.5 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/25 text-[9px] text-emerald-300">
              ✓
            </div>
            <div className="h-1.5 w-10 rounded-full bg-white/20" />
          </div>
          <div className="mb-1 h-1.5 w-full rounded-full bg-white/15" />
          <div className="mt-2 text-[9px] text-white/50">48 active</div>
        </div>
      </div>

      {/* Content – tighter */}
      <div className="relative z-10 mx-auto max-w-2xl px-5 text-center sm:px-6">
        {/* Badge */}
        <div className="cta-reveal mb-3 inline-flex items-center gap-2 rounded-full border border-teal-400/25 bg-teal-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-teal-200 sm:mb-4 sm:text-xs">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-400" />
          </span>
          Ready to get started?
        </div>

        {/* Headline */}
        <h2
          id="final-cta-heading"
          className="cta-reveal cta-reveal-delay-1 text-balance text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl"
        >
          Turn Tasks Into Opportunities.
        </h2>

        {/* Supporting text – shorter */}
        <p className="cta-reveal cta-reveal-delay-2 mx-auto mt-3 max-w-md text-pretty text-sm leading-relaxed text-teal-100/75 sm:mt-4 sm:text-base">
          Earn by completing tasks or reach workers for your campaigns. Get started in minutes.
        </p>

        {/* CTA Buttons */}
        <div className="cta-reveal cta-reveal-delay-3 mt-6 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row sm:gap-4">
          <Link
            href="/login"
            className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-teal-400 px-6 py-3 text-sm font-semibold text-[#0b3939] shadow-lg shadow-teal-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-300 hover:shadow-xl hover:shadow-teal-400/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 active:translate-y-0 sm:w-auto sm:min-w-[160px] sm:px-7 sm:py-3.5 sm:text-base"
          >
            <span className="relative z-10">Find Gigs</span>
            <svg
              className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          </Link>

          <Link
            href="/login"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-teal-400/40 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-300/70 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 active:translate-y-0 sm:w-auto sm:min-w-[160px] sm:px-7 sm:py-3.5 sm:text-base"
          >
            <svg
              className="h-4 w-4 transition-transform duration-300 group-hover:scale-110"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Post a Campaign</span>
          </Link>
        </div>

        {/* Trust line – optional, very light */}
        <p className="cta-reveal cta-reveal-delay-4 mt-5 text-[11px] text-teal-200/45 sm:mt-6 sm:text-xs">
          Free to join · Start in minutes
        </p>
      </div>
    </section>
  );
}