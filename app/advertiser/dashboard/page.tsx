'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FolderKanban,
  Loader2,
  PlusCircle,
  Wallet,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Campaign = {
  id: string;
  title: string | null;
  status: string | null;
  total_budget: number | null;
  total_slots: number | null;
  completed_slots: number | null;
  created_at: string;
};

type AdvertiserStats = {
  totalCampaigns: number;
  activeCampaigns: number;
  draftCampaigns: number;
  totalBudget: number;
  totalTasks: number;
  pendingSubmissions: number;
};

export default function AdvertiserDashboardPage() {
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<AdvertiserStats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    draftCampaigns: 0,
    totalBudget: 0,
    totalTasks: 0,
    pendingSubmissions: 0,
  });

  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) return;

      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          id,
          title,
          status,
          total_budget,
          total_slots,
          completed_slots,
          created_at
        `)
        .eq('advertiser_id', user.id)
        .order('created_at', { ascending: false });

      if (campaignsError) {
        console.error('Campaign error:', campaignsError);
        return;
      }

      const campaignList = campaigns || [];
      const campaignIds = campaignList.map((c) => c.id);

      const totalBudget = campaignList.reduce(
        (total, campaign) => total + Number(campaign.total_budget || 0),
        0
      );

      const activeCampaigns = campaignList.filter(
        (c) => c.status === 'active'
      ).length;

      const draftCampaigns = campaignList.filter(
        (c) => c.status === 'draft'
      ).length;

      let totalTasks = 0;
      let pendingSubmissions = 0;

      if (campaignIds.length > 0) {
        const { data: campaignTasks, error: tasksError } = await supabase
          .from('campaign_tasks')
          .select('id')
          .in('campaign_id', campaignIds);

        if (tasksError) {
          console.error('Campaign tasks error:', tasksError);
        }

        const taskIds = campaignTasks?.map((task) => task.id) || [];
        totalTasks = taskIds.length;

        if (taskIds.length > 0) {
          const { count, error: submissionsError } = await supabase
            .from('task_submissions')
            .select('*', { count: 'exact', head: true })
            .in('task_id', taskIds)
            .eq('status', 'pending');

          if (submissionsError) {
            console.error('Submission error:', submissionsError);
          }

          pendingSubmissions = count || 0;
        }
      }

      setStats({
        totalCampaigns: campaignList.length,
        activeCampaigns,
        draftCampaigns,
        totalBudget,
        totalTasks,
        pendingSubmissions,
      });

      setRecentCampaigns(campaignList.slice(0, 5));
    } catch (error) {
      console.error('Advertiser dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNaira = (amount: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));

  const dashboardCards = [
    {
      title: 'Total Campaigns',
      value: stats.totalCampaigns,
      description: 'All campaigns',
      href: '/advertiser/dashboard/campaigns',
      icon: FolderKanban,
      iconStyle: 'bg-[#0B3939]/10 text-[#0B3939]',
    },
    {
      title: 'Active Campaigns',
      value: stats.activeCampaigns,
      description: 'Currently running',
      href: '/advertiser/dashboard/campaigns?status=active',
      icon: BarChart3,
      iconStyle: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Draft Campaigns',
      value: stats.draftCampaigns,
      description: 'Not yet published',
      href: '/advertiser/dashboard/campaigns?status=draft',
      icon: FolderKanban,
      iconStyle: 'bg-amber-50 text-amber-600',
    },
    {
      title: 'Total Budget',
      value: formatNaira(stats.totalBudget),
      description: 'Across all campaigns',
      href: '/advertiser/dashboard/campaigns',
      icon: Wallet,
      iconStyle: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Tasks Created',
      value: stats.totalTasks,
      description: 'Across your campaigns',
      href: '/advertiser/dashboard/campaigns',
      icon: CheckCircle2,
      iconStyle: 'bg-violet-50 text-violet-600',
    },
    {
      title: 'Pending Reviews',
      value: stats.pendingSubmissions,
      description: 'Awaiting your review',
      href: '/advertiser/dashboard/submissions',
      icon: ClipboardCheck,
      iconStyle: 'bg-orange-50 text-orange-600',
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#0B3939]" />
          <p className="text-sm font-medium text-slate-500">
            Loading campaign data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl bg-[#0B3939] p-5 text-white sm:p-6 md:rounded-3xl md:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <span className="inline-flex rounded-full bg-cyan-300/15 px-3 py-1 text-xs font-bold text-cyan-200">
              GigPlace Advertiser
            </span>

            <h2 className="mt-3 max-w-2xl text-xl font-extrabold leading-tight sm:text-2xl md:text-3xl">
              Create campaigns and grow your reach.
            </h2>

            <p className="mt-3 max-w-xl text-xs leading-5 text-white/65 sm:text-sm sm:leading-6">
              Create campaigns, publish tasks, review submissions, and monitor
              campaign performance from one workspace.
            </p>
          </div>

          <Link
            href="/advertiser/dashboard/campaigns/create"
            className="inline-flex w-fit shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0B3939] transition hover:bg-cyan-50 sm:px-5 sm:py-3"
          >
            <PlusCircle className="h-4 w-4" />
            Create Campaign
          </Link>
        </div>
      </section>

      {/* Compact clickable stats */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-extrabold text-[#0B3939] sm:text-xl">
            Campaign Overview
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Real campaign statistics from Supabase.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {dashboardCards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.title}
                href={card.href}
                className="group rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-[#0B3939]/25 hover:shadow-md sm:p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[#0B3939] sm:text-sm">
                      {card.title}
                    </p>
                    <h3 className="mt-1.5 text-lg font-extrabold tracking-tight text-[#0B3939] sm:mt-2 sm:text-xl">
                      {card.value}
                    </h3>
                  </div>

                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${card.iconStyle}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-1">
                  <p className="truncate text-[11px] text-slate-400 sm:text-xs">
                    {card.description}
                  </p>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:text-[#0B3939]" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent campaigns */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-[#0B3939] sm:text-xl">
              Recent Campaigns
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Your latest campaign activity.
            </p>
          </div>

          <Link
            href="/advertiser/campaigns"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#0B3939]"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {recentCampaigns.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-10">
            <FolderKanban className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-base font-bold text-[#0B3939] sm:text-lg">
              No campaigns yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Create your first campaign and start reaching workers on GigPlace.
            </p>
            <Link
              href="/advertiser/dashboard/campaigns/create"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0B3939] px-4 py-2.5 text-sm font-bold text-white sm:px-5 sm:py-3"
            >
              <PlusCircle className="h-4 w-4" />
              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400 sm:px-5">
                      Campaign
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400 sm:px-5">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400 sm:px-5">
                      Budget
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400 sm:px-5">
                      Progress
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400 sm:px-5">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentCampaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="border-t border-slate-100 hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-3.5 sm:px-5">
                        <Link
                          href={`/advertiser/campaigns/${campaign.id}`}
                          className="font-bold text-slate-900 hover:text-[#0B3939] hover:underline"
                        >
                          {campaign.title || 'Untitled Campaign'}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <StatusBadge status={campaign.status || 'draft'} />
                      </td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-slate-700 sm:px-5">
                        {formatNaira(Number(campaign.total_budget || 0))}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-500 sm:px-5">
                        {campaign.completed_slots}/{campaign.total_slots}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-500 sm:px-5">
                        {formatDate(campaign.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700',
    draft: 'bg-amber-50 text-amber-700',
    paused: 'bg-slate-100 text-slate-600',
    completed: 'bg-blue-50 text-blue-700',
    cancelled: 'bg-red-50 text-red-700',
    pending: 'bg-amber-50 text-amber-700',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
        styles[status] || 'bg-slate-100 text-slate-600'
      }`}
    >
      {status}
    </span>
  );
}