// components/layout/Footer.tsx
'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Navigation data – easy to maintain / wire up later                */
/* ------------------------------------------------------------------ */

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
  highlight?: boolean; // slightly more prominent
};

const platformLinks: FooterLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Explore Gigs', href: '#explore' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'About', href: '#about' },
];

const workerLinks: FooterLink[] = [
  { label: 'Explore Gigs', href: '#explore' },
  { label: 'Find Tasks', href: '#explore' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'My Earnings', href: '#dashboard/earnings' },
  { label: 'Submit Proof', href: '#dashboard/submissions' },
  { label: 'Help Center', href: '#help' },
];

const advertiserLinks: FooterLink[] = [
  { label: 'Post a Campaign', href: '#campaigns/new', highlight: true },
  { label: 'Create a Task', href: '#campaigns/new' },
  { label: 'Manage Campaigns', href: '#dashboard/campaigns' },
  { label: 'Review Submissions', href: '#dashboard/reviews' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Advertiser Guide', href: '#guides/advertisers' },
];

const supportLinks: FooterLink[] = [
  { label: 'Help Center', href: '#help' },
  { label: 'Contact Us', href: '#contact' },
  { label: 'FAQs', href: '#faq' },
  { label: 'Terms of Service', href: '#terms' },
  { label: 'Privacy Policy', href: '#privacy' },
];

const legalLinks: FooterLink[] = [
  { label: 'Terms', href: '#terms' },
  { label: 'Privacy', href: '#privacy' },
  { label: 'Cookies', href: '#cookies' },
];

/* Social – only include platforms you actually use.
   Leave href empty or remove the entry to hide the icon. */
const socialLinks = [
  {
    name: 'Facebook',
    href: '', // e.g. 'https://facebook.com/gigplace'
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
      </svg>
    ),
  },
  {
    name: 'Instagram',
    href: '',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
      </svg>
    ),
  },
  {
    name: 'X',
    href: '',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: 'LinkedIn',
    href: '',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
].filter((s) => s.href); // hide icons without a real URL

/* ------------------------------------------------------------------ */
/*  Accordion section (mobile)                                        */
/* ------------------------------------------------------------------ */

function FooterAccordion({
  title,
  links,
  defaultOpen = false,
}: {
  title: string;
  links: FooterLink[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `footer-panel-${title.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="border-b border-white/10 md:border-none">
      <button
        type="button"
        className="flex w-full items-center justify-between py-3 text-left text-sm font-semibold text-white md:pointer-events-none md:cursor-default md:py-0"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        {title}
        <svg
          className={`h-4 w-4 text-teal-300/70 transition-transform duration-200 md:hidden ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <ul
        id={panelId}
        className={`space-y-2.5 overflow-hidden transition-all duration-200 md:mt-4 md:block md:max-h-none ${
          open ? 'max-h-96 pb-4' : 'max-h-0 md:max-h-none'
        }`}
      >
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className={`text-sm transition-colors duration-200 hover:text-teal-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
                link.highlight
                  ? 'font-medium text-teal-300'
                  : 'text-teal-100/60'
              }`}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Newsletter (placeholder – ready for backend integration)          */
/* ------------------------------------------------------------------ */

type NewsletterStatus = 'idle' | 'loading' | 'success' | 'error';

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<NewsletterStatus>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      // TODO: replace with real API call
      // await fetch('/api/newsletter', { method: 'POST', body: JSON.stringify({ email }) });
      await new Promise((r) => setTimeout(r, 800)); // simulate

      setStatus('success');
      setMessage('Thanks for subscribing!');
      setEmail('');
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5" noValidate>
      <label htmlFor="footer-email" className="sr-only">
        Email address
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
        <input
          id="footer-email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status !== 'idle') setStatus('idle');
          }}
          placeholder="Enter your email"
          autoComplete="email"
          disabled={status === 'loading' || status === 'success'}
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-teal-200/40 outline-none transition focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-teal-400 px-5 py-2.5 text-sm font-semibold text-[#0b3939] transition hover:bg-teal-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
        </button>
      </div>
      {message && (
        <p
          role="status"
          className={`mt-2 text-xs ${
            status === 'success' ? 'text-emerald-300' : 'text-red-300'
          }`}
        >
          {message}
        </p>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Footer                                                       */
/* ------------------------------------------------------------------ */

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-gradient-to-b from-[#062626] to-[#0b3939] text-white">
      {/* Subtle background details */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-1/4 top-0 h-64 w-64 rounded-full bg-teal-500/5 blur-3xl" />
        <div className="absolute -right-1/4 bottom-0 h-48 w-48 rounded-full bg-emerald-400/5 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        {/* ---------- Main grid ---------- */}
        <div className="grid grid-cols-1 gap-10 pt-12 pb-10 md:grid-cols-2 md:gap-8 lg:grid-cols-12 lg:gap-8 lg:pt-16 lg:pb-12">
          {/* Brand column */}
          <div className="lg:col-span-4">
            <Link href="/" className="inline-block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400">
              {/* Replace with your real logo component / image */}
              <span className="text-xl font-bold tracking-tight text-white">
                Gig<span className="text-teal-400">Place</span>
              </span>
            </Link>

            <p className="mt-3 text-sm font-medium text-teal-200/90">
              Earn by completing tasks. Grow your campaigns.
            </p>

            <p className="mt-2 max-w-sm text-sm leading-relaxed text-teal-100/55">
              GigPlace connects people looking for flexible task opportunities with
              advertisers who need reliable workers to complete their campaigns.
            </p>

            {/* Social icons – only rendered if URLs exist */}
            {socialLinks.length > 0 && (
              <div className="mt-5 flex items-center gap-3">
                {socialLinks.map((s) => (
                  <a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`GigPlace on ${s.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-teal-200/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-400/30 hover:bg-white/10 hover:text-teal-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            )}

            {/* Newsletter */}
            <div className="mt-8 max-w-sm">
              <h3 className="text-sm font-semibold text-white">Stay in the loop</h3>
              <p className="mt-1 text-xs leading-relaxed text-teal-100/50">
                Get updates about new opportunities, platform features and GigPlace news.
              </p>
              <NewsletterForm />
            </div>
          </div>

          {/* Nav columns – accordion on mobile, open on md+ */}
          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 md:col-span-1 md:grid-cols-2 lg:col-span-8 lg:grid-cols-4 lg:gap-6">
            <FooterAccordion title="Platform" links={platformLinks} />
            <FooterAccordion title="For Workers" links={workerLinks} />
            <FooterAccordion title="For Advertisers" links={advertiserLinks} />
            <FooterAccordion title="Support" links={supportLinks} />
          </div>
        </div>

        {/* ---------- Trust line + divider ---------- */}
        <div className="border-t border-white/10 pt-6 pb-6">
          <p className="text-center text-xs text-teal-100/40 sm:text-sm">
            Built to make task-based opportunities simpler, clearer and more accessible.
          </p>
        </div>

        {/* ---------- Bottom bar ---------- */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 py-5 sm:flex-row">
          <p className="text-xs text-teal-100/40">
            © {currentYear} GigPlace. All rights reserved.
          </p>

          <nav aria-label="Legal">
            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-xs text-teal-100/40 transition-colors duration-200 hover:text-teal-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}