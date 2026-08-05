'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  usePathname,
  useRouter,
} from 'next/navigation';

import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  ClipboardCheck,
  FolderKanban,
  LayoutDashboard,
  Loader2,
  LogOut,
  PlusCircle,
  Wallet,
  X,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

type AdvertiserSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  fullName?: string | null;
  userName?: string | null;
};

const navigationItems = [
  {
    label: 'Dashboard',
    href: '/advertiser/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Create Campaign',
    href: '/advertiser/dashboard/campaigns/create',
    icon: PlusCircle,
  },
  {
    label: 'My Campaigns',
    href: '/advertiser/dashboard/campaigns',
    icon: FolderKanban,
  },
  {
    label: 'Task Submissions',
    href: '/advertiser/dashboard/submissions',
    icon: ClipboardCheck,
  },
  {
    label: 'Campaign Analytics',
    href: '/advertiser/dashboard/analytics',
    icon: BarChart3,
  },
  {
    label: 'Notifications',
    href: '/advertiser/dashboard/notifications',
    icon: Bell,
  },
  {
    label: 'wallet',
    href: '/advertiser/dashboard/wallet',
    icon: Wallet,
  },
];

export default function AdvertiserSidebar({
  isOpen,
  onClose,
  fullName,
  userName,
}: AdvertiserSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [loggingOut, setLoggingOut] =
    useState(false);

  const displayName =
    fullName ||
    userName ||
    'GigPlace Advertiser';

  const initials = displayName
    .split(' ')
    .map((name) => name.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          'Logout error:',
          error
        );

        return;
      }

      router.replace('/login');
      router.refresh();
    } catch (error) {
      console.error(
        'Logout error:',
        error
      );
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close advertiser menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-[280px] flex-col
          bg-[#0B3939]
          px-5 py-6
          text-white
          shadow-2xl
          transition-transform
          duration-300
          lg:translate-x-0
          ${
            isOpen
              ? 'translate-x-0'
              : '-translate-x-full'
          }
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-2">
          <Link
            href="/"
            onClick={onClose}
            className="text-2xl font-extrabold tracking-tight"
          >
            Gig
            <span className="text-cyan-300">
              Place
            </span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-white/70 transition hover:bg-white/10 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Workspace */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.07] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
            Current workspace
          </p>

          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-300 font-bold text-[#172554]">
              {initials}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {displayName}
              </p>

              <p className="mt-0.5 text-xs text-white/55">
                Advertiser workspace
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-7 flex-1 space-y-2">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
            Advertiser Menu
          </p>

          {navigationItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              item.href ===
              '/advertiser/dashboard'
                ? pathname ===
                  '/advertiser/dashboard'
                : pathname ===
                  item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3
                  rounded-xl px-4 py-1
                  text-sm font-semibold
                  transition
                  ${
                    isActive
                      ? 'bg-white text-[#172554] shadow-sm'
                      : 'text-white/65 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                <Icon className="h-5 w-5" />

                <span>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Switch to user */}
          <div className="pt-5">
            <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
              Account Mode
            </p>

            <Link
              href="/dashboard"
              onClick={onClose}
              className="flex items-center justify-between rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-300/20"
            >
              <span className="flex items-center gap-3">
                <ArrowLeftRight className="h-5 w-5" />

                Switch to User
              </span>

              <span className="rounded-md bg-cyan-300/15 px-2 py-1 text-[9px] uppercase tracking-wider">
                Switch
              </span>
            </Link>
          </div>
        </nav>

        {/* Logout */}
        <div className="border-t border-white/10 pt-5">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/65 transition hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingOut ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5" />
            )}

            {loggingOut
              ? 'Logging out...'
              : 'Log out'}
          </button>
        </div>
      </aside>
    </>
  );
}