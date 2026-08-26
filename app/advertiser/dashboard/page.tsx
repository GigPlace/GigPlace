'use client';

import {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';

import {
  ArrowRight,
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
  const [loading, setLoading] =
    useState(true);

  const [stats, setStats] =
    useState<AdvertiserStats>({
      totalCampaigns: 0,
      activeCampaigns: 0,
      draftCampaigns: 0,
      totalBudget: 0,
      totalTasks: 0,
      pendingSubmissions: 0,
    });

  const [recentCampaigns, setRecentCampaigns] =
    useState<Campaign[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return;
      }

      const {
        data: campaigns,
        error: campaignsError,
      } = await supabase
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
        .eq(
          'advertiser_id',
          user.id
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        );

      if (campaignsError) {
        console.error(
          'Campaign error:',
          campaignsError
        );

        return;
      }

      const campaignList =
        campaigns || [];

      const campaignIds =
        campaignList.map(
          (campaign) =>
            campaign.id
        );

      const totalBudget =
        campaignList.reduce(
          (total, campaign) =>
            total +
            Number(
              campaign.total_budget ||
                0
            ),
          0
        );

      const activeCampaigns =
        campaignList.filter(
          (campaign) =>
            campaign.status ===
            'active'
        ).length;

      const draftCampaigns =
        campaignList.filter(
          (campaign) =>
            campaign.status ===
            'draft'
        ).length;

      let totalTasks = 0;
      let pendingSubmissions = 0;

      if (
        campaignIds.length > 0
      ) {
        const {
          data: campaignTasks,
          error: tasksError,
        } = await supabase
          .from(
            'campaign_tasks'
          )
          .select(
            'id'
          )
          .in(
            'campaign_id',
            campaignIds
          );

        if (tasksError) {
          console.error(
            'Campaign tasks error:',
            tasksError
          );
        }

        const taskIds =
          campaignTasks?.map(
            (task) => task.id
          ) || [];

        totalTasks =
          taskIds.length;

        if (
          taskIds.length > 0
        ) {
          const {
            count,
            error:
              submissionsError,
          } = await supabase
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
            .in(
              'task_id',
              taskIds
            )
            .eq(
              'status',
              'pending'
            );

          if (
            submissionsError
          ) {
            console.error(
              'Submission error:',
              submissionsError
            );
          }

          pendingSubmissions =
            count || 0;
        }
      }

      setStats({
        totalCampaigns:
          campaignList.length,

        activeCampaigns,

        draftCampaigns,

        totalBudget,

        totalTasks,

        pendingSubmissions,
      });

      setRecentCampaigns(
        campaignList.slice(
          0,
          5
        )
      );
    } catch (error) {
      console.error(
        'Advertiser dashboard error:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const formatNaira = (
    amount: number
  ) => {
    return new Intl.NumberFormat(
      'en-NG',
      {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
      }
    ).format(amount);
  };

  const formatDate = (
    date: string
  ) => {
    return new Intl.DateTimeFormat(
      'en-NG',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }
    ).format(
      new Date(date)
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#172554]" />

          <p className="text-sm font-medium text-slate-500">
            Loading campaign data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">

      {/* Hero */}
      <section className="overflow-hidden rounded-3xl bg-[#0B3939] p-7 text-white md:p-9">

        <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-center">

          <div>
            <span className="inline-flex rounded-full bg-cyan-300/15 px-3 py-1 text-xs font-bold text-cyan-200">
              GigPlace Advertiser
            </span>

            <h2 className="mt-4 max-w-2xl md:text-3xl text-xl font-extrabold leading-tight ">
              Create campaigns and
              grow your reach.
            </h2>

            <p className="mt-4 max-w-xl md:text-sm text-xs md:leading-7 leading-4 text-white/65">
              Create campaigns, publish
              tasks, review submissions,
              and monitor campaign
              performance from one
              workspace.
            </p>
          </div>

          <Link
            href="/advertiser/dashboard/campaigns/create"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-[#172554] transition hover:bg-cyan-50"
          >
            <PlusCircle className="h-4 w-4" />

            Create Campaign
          </Link>
        </div>
      </section>

      {/* Main statistics */}
      <section className="mt-9">

        <div className="mb-5">
          <h2 className="text-xl font-extrabold text-[#0B3939]">
            Campaign Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Real campaign statistics
            from Supabase.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 tect">

          <StatCard
            title="Total Campaigns"
            value={
              stats.totalCampaigns
            }
            description="All campaigns created"
            icon={
              <FolderKanban className="h-6 w-6" />
            }
          />

          <StatCard
            title="Active Campaigns"
            value={
              stats.activeCampaigns
            }
            description="Currently running"
            icon={
              <BarChart3 className="h-6 w-6" />
            }
          />

          <StatCard
            title="Total Budget"
            value={formatNaira(
              stats.totalBudget
            )}
            description="Across all campaigns"
            icon={
              <Wallet className="h-6 w-6" />
            }
          />

          <StatCard
            title="Pending Reviews"
            value={
              stats.pendingSubmissions
            }
            description="Submissions awaiting review"
            icon={
              <Clock3 className="h-6 w-6" />
            }
          />
        </div>
      </section>

      {/* Activity */}
      <section className="mt-9">

        <div className="grid gap-5 md:grid-cols-3">

          <ActivityCard
            title="Draft Campaigns"
            value={
              stats.draftCampaigns
            }
            text="Campaigns not yet published"
            href="/advertiser/campaigns"
            icon={
              <FolderKanban className="h-6 w-6" />
            }
          />

          <ActivityCard
            title="Tasks Created"
            value={
              stats.totalTasks
            }
            text="Tasks across your campaigns"
            href="/advertiser/campaigns"
            icon={
              <CheckCircle2 className="h-6 w-6" />
            }
          />

          <ActivityCard
            title="Review Submissions"
            value={
              stats.pendingSubmissions
            }
            text="Open submissions awaiting action"
            href="/advertiser/submissions"
            icon={
              <ClipboardCheck className="h-6 w-6" />
            }
          />
        </div>
      </section>

      {/* Recent campaigns */}
      <section className="mt-9">

        <div className="flex flex-wrap items-end justify-between gap-4">

          <div>
            <h2 className="text-xl font-extrabold text-[#0B3939]">
              Recent Campaigns
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your latest campaign
              activity.
            </p>
          </div>

          <Link
            href="/advertiser/campaigns"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#172554]"
          >
            View all

            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {recentCampaigns.length ===
        0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">

            <FolderKanban className="mx-auto h-11 w-11 text-slate-300" />

            <h3 className="mt-4 text-lg font-bold text-[#0B3939]">
              No campaigns yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Create your first campaign
              and start reaching workers
              on GigPlace.
            </p>

            <Link
              href="/advertiser/campaigns/create"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B3939] px-5 py-3 text-sm font-bold text-white"
            >
              <PlusCircle className="h-4 w-4" />

              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">

            <div className="overflow-x-auto">

              <table className="min-w-full">

                <thead className="bg-slate-50">

                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                      Campaign
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                      Budget
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                      Progress
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                      Created
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {recentCampaigns.map(
                    (campaign) => (
                      <tr
                        key={
                          campaign.id
                        }
                        className="border-t border-slate-100"
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900">
                            {
                              campaign.title ||
                              'Untitled Campaign'
                            }
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={
                              campaign.status ||
                              'draft'
                            }
                          />
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                          {formatNaira(
                            Number(
                              campaign.total_budget ||
                                0
                            )
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-500">
                          {
                            campaign.completed_slots
                          }
                          /
                          {
                            campaign.total_slots
                          }
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-500">
                          {formatDate(
                            campaign.created_at
                          )}
                        </td>
                      </tr>
                    )
                  )}

                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between">

        <div>
          <p className="text-sm font-semibold text-[#0B3939]">
            {title}
          </p>

          <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-[#0B3939]">
            {value}
          </h3>
        </div>

        <div className="rounded-xl bg-[#172554]/10 p-3 text-[#0B3939]">
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
  text,
  href,
  icon,
}: {
  title: string;
  value: number;
  text: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-[#172554]/30 hover:shadow-lg"
    >
      <div className="flex items-center justify-between">

        <div className="rounded-xl bg-[#172554]/10 p-3 text-[#172554]">
          {icon}
        </div>

        <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#172554]" />
      </div>

      <p className="mt-5 text-3xl font-extrabold text-slate-900">
        {value}
      </p>

      <h3 className="mt-1 font-bold text-slate-800">
        {title}
      </h3>

      <p className="mt-2 text-sm text-slate-500">
        {text}
      </p>
    </Link>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<
    string,
    string
  > = {
    active:
      'bg-emerald-50 text-emerald-700',

    draft:
      'bg-amber-50 text-amber-700',

    paused:
      'bg-slate-100 text-slate-600',

    completed:
      'bg-blue-50 text-blue-700',

    cancelled:
      'bg-red-50 text-red-700',
  };

  return (
    <span
      className={`
        inline-flex rounded-full
        px-3 py-1
        text-xs font-bold
        capitalize
        ${
          styles[status] ||
          'bg-slate-100 text-slate-600'
        }
      `}
    >
      {status}
    </span>
  );
}