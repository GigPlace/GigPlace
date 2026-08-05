'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  LayoutDashboard,
  Loader2,
  LogOut,
  Wallet,
  X,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useState } from 'react';

type DashboardSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  fullName?: string | null;
  userName?: string | null;
};

const navigationItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Find Tasks',
    href: '/dashboard/tasks',
    icon: BriefcaseBusiness,
  },
  {
    label: 'My Submissions',
    href: '/dashboard/submissions',
    icon: CheckCircle2,
  },
  {
    label: 'My Wallet',
    href: '/dashboard/wallet',
    icon: Wallet,
  },
  {
    label: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
  },
];

export default function DashboardSidebar({
  isOpen,
  onClose,
  fullName,
  userName,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [loggingOut, setLoggingOut] =
    useState(false);

  const displayName =
    fullName || userName || 'GigPlace User';

  const getInitials = () => {
    return displayName
      .split(' ')
      .map((name) => name.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

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
      {/* Mobile background overlay */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close dashboard menu"
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
            <span className="text-emerald-300">
              Place
            </span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Account mode */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.07] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
            Current workspace
          </p>

          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-300 font-bold text-[#0B3939]">
              {getInitials()}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {displayName}
              </p>

              <p className="mt-0.5 text-xs text-white/55">
                User workspace
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-7 flex-1 space-y-2">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
            Main Menu
          </p>

          {navigationItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(
                    item.href
                  );

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
                      ? 'bg-white text-[#0B3939] shadow-sm'
                      : 'text-white/65 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                <Icon className="h-5 w-5" />

                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Dashboard switch */}
          <div className="pt-5">
            <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
              Account Mode
            </p>

            <Link
              href="/advertiser/dashboard"
              onClick={onClose}
              className="flex items-center justify-between rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-200 transition hover:bg-emerald-300/20"
            >
              <span className="flex items-center gap-3">
                <ArrowLeftRight className="h-5 w-5" />

                Switch to Advertiser
              </span>

              <span className="rounded-md bg-emerald-300/15 px-2 py-1 text-[9px] uppercase tracking-wider">
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