// "use client";

// import { useEffect, useRef, useState } from "react";
// import Image from "next/image";
// import Link from "next/link";
// import {
//   ArrowLeftRight,
//   BriefcaseBusiness,
//   Globe2,
//   Sparkles,
//   Users,
// } from "lucide-react";

// /**
//  * Optional assets — replace with your own files under /public
//  * /public/about/hero-poster.jpg
//  * /public/about/hero-loop.mp4  (short, muted, compressed)
//  */
// const HERO_POSTER = "/abouthero.jpg";
// const HERO_VIDEO = "/about/hero-loop.mp4";

// export default function AboutHero() {
//   const videoRef = useRef<HTMLVideoElement | null>(null);
//   const [reducedMotion, setReducedMotion] = useState(false);
//   const [videoReady, setVideoReady] = useState(false);

//   useEffect(() => {
//     const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
//     const apply = () => setReducedMotion(mq.matches);
//     apply();
//     mq.addEventListener("change", apply);
//     return () => mq.removeEventListener("change", apply);
//   }, []);

//   useEffect(() => {
//     const video = videoRef.current;
//     if (!video || reducedMotion) return;

//     const play = async () => {
//       try {
//         await video.play();
//         setVideoReady(true);
//       } catch {
//         setVideoReady(false);
//       }
//     };

//     play();
//   }, [reducedMotion]);

//   return (
//     <section
//       aria-labelledby="about-hero-heading"
//       className="relative isolate overflow-hidden bg-[#062F2F] "
//     >
//       {/* Soft ambient layers */}
//       <div
//         aria-hidden
//         className="pointer-events-none absolute inset-0"
//       >
//         <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(7,94,94,0.35),transparent_55%),radial-gradient(ellipse_at_80%_70%,rgba(11,57,57,0.5),transparent_50%)]" />
//         <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(231,246,245,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(231,246,245,0.35)_1px,transparent_1px)] [background-size:48px_48px]" />
//         {!reducedMotion && (
//           <>
//             <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-[#075E5E]/25 blur-3xl motion-safe:animate-pulse" />
//             <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[#0B3939]/40 blur-3xl" />
//           </>
//         )}
//       </div>

//       <div className="relative mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-14 sm:px-6 sm:py-16 md:py-18 lg:flex-row lg:items-center lg:gap-12 lg:px-8 lg:py-20">
//         {/* Left — copy */}
//         <div className="relative z-10 w-full lg:w-[55%] lg:max-w-[620px]">
//           <p className="text-[12px] mt-5 font-semibold tracking-[0.18em] text-[#E7F6F5]/80 sm:text-[13px]">
//             ABOUT GIGPLACE
//           </p>

//           <h1
//             id="about-hero-heading"
//             className="mt-4 max-w-[18ch] text-[32px] font-bold leading-[1.15] tracking-tight text-white sm:text-[36px] md:text-[44px] lg:text-[45px] xl:text-[56px]"
//           >
//             Building a More Trusted Digital Work Economy in Africa.
//           </h1>

//           <p className="mt-5 max-w-[42ch] text-[14px] leading-relaxed text-[#E7F6F5]/85 sm:text-[16px] md:text-[17px]">
//             GigPlace Digital Services Ltd. is building a trusted digital
//             marketplace that connects people with legitimate digital work and
//             businesses with reliable digital talent.
//           </p>

//           <div className="mt-8 flex flex-col gap-3 xs:flex-row sm:flex-row sm:flex-wrap sm:items-center">
//             <Link
//               href="/gigs"
//               className="inline-flex items-center justify-center rounded-xl bg-[#E7F6F5] px-5 py-3 text-[14px] font-semibold text-[#0B3939] shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E7F6F5] sm:text-[15px]"
//             >
//               Explore Gigs
//             </Link>

//             <Link
//               href="/advertiser/dashboard/campaigns/create"
//               className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-[14px] font-semibold text-white backdrop-blur-sm transition hover:border-white/40 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 sm:text-[15px]"
//             >
//               Create a Campaign
//             </Link>
//           </div>

//           {/* Trust strip */}
//           <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-6 text-[12px] text-[#E7F6F5]/65 sm:text-[13px]">
//             <span className="inline-flex items-center gap-1.5">
//               <Globe2 className="h-3.5 w-3.5 text-[#E7F6F5]/80" aria-hidden />
//               Africa-focused
//             </span>
//             <span className="hidden h-1 w-1 rounded-full bg-white/25 sm:inline-block" aria-hidden />
//             <span className="inline-flex items-center gap-1.5">
//               <Sparkles className="h-3.5 w-3.5 text-[#E7F6F5]/80" aria-hidden />
//               Trusted marketplace
//             </span>
//             <span className="hidden h-1 w-1 rounded-full bg-white/25 sm:inline-block" aria-hidden />
//             <span className="inline-flex items-center gap-1.5">
//               <Users className="h-3.5 w-3.5 text-[#E7F6F5]/80" aria-hidden />
//               People &amp; businesses
//             </span>
//           </div>
//         </div>

//         {/* Right — visual */}
//         <div className="relative w-full lg:w-[45%]">
//           <div className="relative mx-auto aspect-[4/3] w-full max-w-[520px] overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/30 sm:aspect-[5/4] lg:max-w-none">
//             {/* Poster / image */}
//             <div
//               className={`absolute inset-0 transition-transform duration-[12s] ease-out ${
//                 reducedMotion ? "" : "scale-105 motion-safe:animate-[about-hero-zoom_18s_ease-in-out_infinite_alternate]"
//               }`}
//             >
//               <Image
//                 src={HERO_POSTER}
//                 alt="African professionals collaborating on digital work with laptops in a modern workspace"
//                 fill
//                 priority
//                 sizes="(max-width: 768px) 100vw, (max-width: 1280px) 45vw, 560px"
//                 className="object-cover"
//               />
//             </div>

//             {/* Video layer (when available & motion allowed) */}
//             {!reducedMotion && (
//               <video
//                 ref={videoRef}
//                 className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
//                   videoReady ? "opacity-100" : "opacity-0"
//                 }`}
//                 poster={HERO_POSTER}
//                 muted
//                 loop
//                 playsInline
//                 autoPlay
//                 preload="metadata"
//                 aria-hidden
//               >
//                 <source src={HERO_VIDEO} type="video/mp4" />
//               </video>
//             )}

//             {/* Overlays for readability & depth */}
//             <div
//               aria-hidden
//               className="absolute inset-0 bg-gradient-to-t from-[#062F2F]/85 via-[#0B3939]/25 to-[#0B3939]/15"
//             />
//             <div
//               aria-hidden
//               className="absolute inset-0 shadow-[inset_0_0_80px_rgba(6,47,47,0.55)]"
//             />

//             {/* Floating marketplace card */}
//             <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-auto sm:right-5 sm:w-[220px]">
//               <div className="rounded-xl border border-white/15 bg-[#0B3939]/75 p-3.5 shadow-lg backdrop-blur-md">
//                 <p className="mb-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E7F6F5]/70">
//                   The GigPlace ecosystem
//                 </p>

//                 <div className="flex flex-col items-center gap-1.5">
//                   <div className="flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-[12px] font-medium text-white">
//                     <Users className="h-3.5 w-3.5 text-[#E7F6F5]" aria-hidden />
//                     Workers
//                   </div>

//                   <ArrowLeftRight
//                     className="h-3.5 w-3.5 text-[#E7F6F5]/60"
//                     aria-hidden
//                   />

//                   <div className="flex items-center gap-2 rounded-lg bg-[#E7F6F5] px-2.5 py-1.5 text-[12px] font-semibold text-[#0B3939]">
//                     <Globe2 className="h-3.5 w-3.5" aria-hidden />
//                     GigPlace
//                   </div>

//                   <ArrowLeftRight
//                     className="h-3.5 w-3.5 text-[#E7F6F5]/60"
//                     aria-hidden
//                   />

//                   <div className="flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-[12px] font-medium text-white">
//                     <BriefcaseBusiness
//                       className="h-3.5 w-3.5 text-[#E7F6F5]"
//                       aria-hidden
//                     />
//                     Businesses
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Decorative nodes — desktop only */}
//           <div
//             aria-hidden
//             className="pointer-events-none absolute -right-2 top-8 hidden h-3 w-3 rounded-full bg-[#E7F6F5]/40 blur-[1px] lg:block"
//           />
//           <div
//             aria-hidden
//             className="pointer-events-none absolute -left-3 bottom-16 hidden h-2 w-2 rounded-full bg-[#075E5E] lg:block"
//           />
//         </div>
//       </div>

//       {/* Bottom fade into next section */}
//       <div
//         aria-hidden
//         className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#062F2F] to-transparent"
//       />

//       <style jsx global>{`
//         @keyframes about-hero-zoom {
//           from {
//             transform: scale(1.05);
//           }
//           to {
//             transform: scale(1.12);
//           }
//         }

//         @media (prefers-reduced-motion: reduce) {
//           .motion-safe\\:animate-\\[about-hero-zoom_18s_ease-in-out_infinite_alternate\\] {
//             animation: none !important;
//           }
//         }
//       `}</style>
//     </section>
//   );
// }



"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftRight,
  BriefcaseBusiness,
  Globe2,
  Sparkles,
  Users,
} from "lucide-react";

/**
 * Free stock (Pexels / Unsplash) — commercial use allowed under their licenses.
 * Prefer downloading into /public for production reliability.
 */
const HERO_POSTER =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80";
// Diverse team collaborating with laptops (Unsplash License)

const HERO_POSTER_ALT =
  "Diverse professionals collaborating with laptops in a modern workspace";

// Pexels: multicultural team collaborating in office (ID 7983984)
// https://www.pexels.com/video/people-busy-at-work-7983984/
const HERO_VIDEO =
  "https://videos.pexels.com/video-files/7983984/7983984-hd_1920_1080_25fps.mp4";

// Optional secondary still if video fails
const HERO_FALLBACK_STILL =
  "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1600";

export default function AboutHero() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reducedMotion || videoFailed) return;

    const play = async () => {
      try {
        await video.play();
        setVideoReady(true);
      } catch {
        setVideoReady(false);
      }
    };

    play();
  }, [reducedMotion, videoFailed]);

  return (
    <section
      aria-labelledby="about-hero-heading"
      className="relative isolate overflow-hidden bg-[#062F2F]"
    >
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(7,94,94,0.35),transparent_55%),radial-gradient(ellipse_at_80%_70%,rgba(11,57,57,0.5),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(231,246,245,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(231,246,245,0.35)_1px,transparent_1px)] [background-size:48px_48px]" />
        {!reducedMotion && (
          <>
            <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-[#075E5E]/25 blur-3xl motion-safe:animate-pulse" />
            <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[#0B3939]/40 blur-3xl" />
          </>
        )}
      </div>

      <div className="relative mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:flex-row lg:items-center lg:gap-12 lg:px-8 lg:py-20">
        {/* Left — copy */}
        <div className="relative z-10 w-full lg:w-[55%] lg:max-w-[620px]">
          <p className="text-[12px] font-semibold tracking-[0.18em] text-[#E7F6F5]/80 sm:text-[13px]">
            ABOUT GIGPLACE
          </p>

          <h1
            id="about-hero-heading"
            className="mt-4 max-w-[18ch] text-[32px] font-bold leading-[1.15] tracking-tight text-white sm:text-[36px] md:text-[44px] lg:text-[52px] xl:text-[56px]"
          >
            Building a More Trusted Digital Work Economy in Africa.
          </h1>

          <p className="mt-5 max-w-[42ch] text-[14px] leading-relaxed text-[#E7F6F5]/85 sm:text-[16px] md:text-[17px]">
            GigPlace Digital Services Ltd. is building a trusted digital
            marketplace that connects people with legitimate digital work and
            businesses with reliable digital talent.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/gigs"
              className="inline-flex items-center justify-center rounded-xl bg-[#E7F6F5] px-5 py-3 text-[14px] font-semibold text-[#0B3939] shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E7F6F5] sm:text-[15px]"
            >
              Explore Gigs
            </Link>

            <Link
              href="/advertiser/dashboard/campaigns/create"
              className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-[14px] font-semibold text-white backdrop-blur-sm transition hover:border-white/40 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 sm:text-[15px]"
            >
              Create a Campaign
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-6 text-[12px] text-[#E7F6F5]/65 sm:text-[13px]">
            <span className="inline-flex items-center gap-1.5">
              <Globe2 className="h-3.5 w-3.5 text-[#E7F6F5]/80" aria-hidden />
              Africa-focused
            </span>
            <span
              className="hidden h-1 w-1 rounded-full bg-white/25 sm:inline-block"
              aria-hidden
            />
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#E7F6F5]/80" aria-hidden />
              Trusted marketplace
            </span>
            <span
              className="hidden h-1 w-1 rounded-full bg-white/25 sm:inline-block"
              aria-hidden
            />
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[#E7F6F5]/80" aria-hidden />
              People &amp; businesses
            </span>
          </div>
        </div>

        {/* Right — media */}
        <div className="relative w-full lg:w-[45%]">
          <div className="relative mx-auto aspect-[4/3] w-full max-w-[520px] overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/30 sm:aspect-[5/4] lg:max-w-none">
            {/* Poster / still */}
            <div
              className={`absolute inset-0 ${
                reducedMotion
                  ? ""
                  : "scale-105 motion-safe:animate-[about-hero-zoom_18s_ease-in-out_infinite_alternate]"
              }`}
            >
              <Image
                src={videoFailed ? HERO_FALLBACK_STILL : HERO_POSTER}
                alt={HERO_POSTER_ALT}
                fill
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 45vw, 560px"
                className="object-cover"
              />
            </div>

            {/* Looping muted video */}
            {!reducedMotion && !videoFailed && (
              <video
                ref={videoRef}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                  videoReady ? "opacity-100" : "opacity-0"
                }`}
                poster={HERO_POSTER}
                muted
                loop
                playsInline
                autoPlay
                preload="metadata"
                aria-hidden
                onError={() => setVideoFailed(true)}
              >
                <source src={HERO_VIDEO} type="video/mp4" />
              </video>
            )}

            {/* Overlays */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-[#062F2F]/85 via-[#0B3939]/25 to-[#0B3939]/15"
            />
            <div
              aria-hidden
              className="absolute inset-0 shadow-[inset_0_0_80px_rgba(6,47,47,0.55)]"
            />

            {/* Ecosystem card */}
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-auto sm:right-5 sm:w-[220px]">
              <div className="rounded-xl border border-white/15 bg-[#0B3939]/75 p-3.5 shadow-lg backdrop-blur-md">
                <p className="mb-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E7F6F5]/70">
                  The GigPlace ecosystem
                </p>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-[12px] font-medium text-white">
                    <Users className="h-3.5 w-3.5 text-[#E7F6F5]" aria-hidden />
                    Workers
                  </div>
                  <ArrowLeftRight
                    className="h-3.5 w-3.5 text-[#E7F6F5]/60"
                    aria-hidden
                  />
                  <div className="flex items-center gap-2 rounded-lg bg-[#E7F6F5] px-2.5 py-1.5 text-[12px] font-semibold text-[#0B3939]">
                    <Globe2 className="h-3.5 w-3.5" aria-hidden />
                    GigPlace
                  </div>
                  <ArrowLeftRight
                    className="h-3.5 w-3.5 text-[#E7F6F5]/60"
                    aria-hidden
                  />
                  <div className="flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-[12px] font-medium text-white">
                    <BriefcaseBusiness
                      className="h-3.5 w-3.5 text-[#E7F6F5]"
                      aria-hidden
                    />
                    Businesses
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute -right-2 top-8 hidden h-3 w-3 rounded-full bg-[#E7F6F5]/40 blur-[1px] lg:block"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-3 bottom-16 hidden h-2 w-2 rounded-full bg-[#075E5E] lg:block"
          />
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#062F2F] to-transparent"
      />

      <style jsx global>{`
        @keyframes about-hero-zoom {
          from {
            transform: scale(1.05);
          }
          to {
            transform: scale(1.12);
          }
        }
      `}</style>
    </section>
  );
}