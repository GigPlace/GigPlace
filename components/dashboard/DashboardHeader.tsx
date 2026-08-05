'use client';

import Link from 'next/link';
import {
  Bell,
  Menu,
} from 'lucide-react';

type DashboardHeaderProps = {
  onMenuClick: () => void;
  firstName?: string;
};

export default function DashboardHeader({
  onMenuClick,
  firstName = 'User',
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur lg:px-9">

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
          aria-label="Open dashboard menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0B3939]">
            User Workspace
          </p>

          <h1 className="mt-1 text-lg font-bold text-slate-900">
            Welcome back, {firstName}
          </h1>
        </div>
      </div>

      <Link
        href="/dashboard/notifications"
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
        aria-label="Open notifications"
      >
        <Bell className="h-5 w-5" />

        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-emerald-500" />
      </Link>
    </header>
  );
}