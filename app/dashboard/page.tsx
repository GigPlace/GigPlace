'use client';

import {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';

import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  Wallet,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

type WalletData = {
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
};

type DashboardStats = {
  activeTasks: number;
  completedTasks: number;
  pendingSubmissions: number;
  unreadNotifications: number;
};

export default function DashboardPage() {
  const [loading, setLoading] =
    useState(true);

  const [wallet, setWallet] =
    useState<WalletData | null>(
      null
    );

  const [stats, setStats] =
    useState<DashboardStats>({
      activeTasks: 0,
      completedTasks: 0,
      pendingSubmissions: 0,
      unreadNotifications: 0,
    });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData =
    async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          return;
        }

        const [
          walletResponse,
          activeTasksResponse,
          completedResponse,
          pendingResponse,
          notificationResponse,
        ] = await Promise.all([
          supabase
            .from('wallets')
            .select(`
              available_balance,
              pending_balance,
              total_earned,
              total_withdrawn
            `)
            .eq(
              'user_id',
              user.id
            )
            .single(),

          supabase
            .from(
              'campaign_tasks'
            )
            .select(
              '*',
              {
                count: 'exact',
                head: true,
              }
            )
            .eq(
              'status',
              'active'
            ),

          supabase
            .from(
              'task_submissions'
            )
            .select(
              '*',
              {
                count: 'exact',
                head: true,
              }
            )
            .eq(
              'worker_id',
              user.id
            )
            .eq(
              'status',
              'approved'
            ),

          supabase
            .from(
              'task_submissions'
            )
            .select(
              '*',
              {
                count: 'exact',
                head: true,
              }
            )
            .eq(
              'worker_id',
              user.id
            )
            .eq(
              'status',
              'pending'
            ),

          supabase
            .from(
              'notifications'
            )
            .select(
              '*',
              {
                count: 'exact',
                head: true,
              }
            )
            .eq(
              'user_id',
              user.id
            )
            .eq(
              'is_read',
              false
            ),
        ]);

        if (
          walletResponse.error
        ) {
          console.error(
            'Wallet error:',
            walletResponse.error
          );
        } else {
          setWallet(
            walletResponse.data
          );
        }

        setStats({
          activeTasks:
            activeTasksResponse.count ||
            0,

          completedTasks:
            completedResponse.count ||
            0,

          pendingSubmissions:
            pendingResponse.count ||
            0,

          unreadNotifications:
            notificationResponse.count ||
            0,
        });
      } catch (error) {
        console.error(
          'Dashboard data error:',
          error
        );
      } finally {
        setLoading(false);
      }
    };

  const formatNaira = (
    amount?: number
  ) => {
    return new Intl.NumberFormat(
      'en-NG',
      {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
      }
    ).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#0B3939]" />

          <p className="text-sm font-medium text-slate-500">
            Loading dashboard data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">

      {/* Welcome section */}
      <section className="overflow-hidden rounded-3xl bg-[#0B3939] p-7 text-white md:p-9">

        <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-center">

          <div>
            <span className="inline-flex rounded-full bg-emerald-300/15 px-3 py-1 text-xs font-bold text-emerald-200">
              GigPlace User Workspace
            </span>

            <h2 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight md:text-4xl">
              Complete tasks and
              grow your earnings.
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-7 text-white/65">
              Discover available tasks,
              submit your proof, monitor
              approvals, and manage your
              earnings from one place.
            </p>
          </div>

          <Link
            href="/dashboard/tasks"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-[#0B3939] transition hover:bg-emerald-50"
          >
            Find Tasks

            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Wallet section */}
      <section className="mt-9">

        <div className="mb-5">
          <h2 className="text-xl font-extrabold text-slate-900">
            Earnings Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Your wallet values are loaded
            from Supabase.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

          <WalletCard
            title="Available Balance"
            value={formatNaira(
              wallet?.available_balance
            )}
            description="Available for withdrawal"
            icon={
              <Wallet className="h-6 w-6" />
            }
          />

          <WalletCard
            title="Pending Balance"
            value={formatNaira(
              wallet?.pending_balance
            )}
            description="Awaiting task approval"
            icon={
              <Clock3 className="h-6 w-6" />
            }
          />

          <WalletCard
            title="Total Earned"
            value={formatNaira(
              wallet?.total_earned
            )}
            description="All approved earnings"
            icon={
              <CheckCircle2 className="h-6 w-6" />
            }
          />

          <WalletCard
            title="Total Withdrawn"
            value={formatNaira(
              wallet?.total_withdrawn
            )}
            description="Successfully withdrawn"
            icon={
              <CreditCard className="h-6 w-6" />
            }
          />
        </div>
      </section>

      {/* Activity section */}
      <section className="mt-9">

        <div className="mb-5">
          <h2 className="text-xl font-extrabold text-slate-900">
            Your Activity
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Real statistics from your
            GigPlace account.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

          <ActivityCard
            title="Available Tasks"
            value={
              stats.activeTasks
            }
            href="/dashboard/tasks"
            icon={
              <BriefcaseBusiness className="h-5 w-5" />
            }
          />

          <ActivityCard
            title="Completed Tasks"
            value={
              stats.completedTasks
            }
            href="/dashboard/submissions"
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
          />

          <ActivityCard
            title="Pending Reviews"
            value={
              stats.pendingSubmissions
            }
            href="/dashboard/submissions"
            icon={
              <Clock3 className="h-5 w-5" />
            }
          />

          <ActivityCard
            title="Unread Alerts"
            value={
              stats.unreadNotifications
            }
            href="/dashboard/notifications"
            icon={
              <CreditCard className="h-5 w-5" />
            }
          />
        </div>
      </section>

      {/* Quick actions */}
      <section className="mt-9">

        <h2 className="text-xl font-extrabold text-slate-900">
          Quick Actions
        </h2>

        <div className="mt-5 grid gap-5 md:grid-cols-3">

          <QuickAction
            href="/dashboard/tasks"
            title="Find Available Tasks"
            description="Browse active tasks and begin earning."
            icon={
              <BriefcaseBusiness className="h-6 w-6" />
            }
          />

          <QuickAction
            href="/dashboard/submissions"
            title="Track Submissions"
            description="Check pending, approved, and rejected tasks."
            icon={
              <CheckCircle2 className="h-6 w-6" />
            }
          />

          <QuickAction
            href="/dashboard/wallet"
            title="Manage Wallet"
            description="View your balance and request a withdrawal."
            icon={
              <Wallet className="h-6 w-6" />
            }
          />
        </div>
      </section>
    </div>
  );
}

function WalletCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between">

        <div>
          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
            {value}
          </h3>
        </div>

        <div className="rounded-xl bg-[#0B3939]/10 p-3 text-[#0B3939]">
          {icon}
        </div>
      </div>

      <p className="mt-5 text-xs text-slate-400">
        {description}
      </p>
    </article>
  );
}

function ActivityCard({
  title,
  value,
  href,
  icon,
}: {
  title: string;
  value: number;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-[#0B3939]/30 hover:shadow-lg"
    >
      <div className="flex items-center justify-between">

        <div className="rounded-xl bg-[#0B3939]/10 p-3 text-[#0B3939]">
          {icon}
        </div>

        <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#0B3939]" />
      </div>

      <p className="mt-5 text-3xl font-extrabold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-500">
        {title}
      </p>
    </Link>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-[#0B3939]/30 hover:shadow-lg"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0B3939]/10 text-[#0B3939]">
        {icon}
      </div>

      <h3 className="mt-5 font-extrabold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#0B3939]">
        Open

        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </span>
    </Link>
  );
}