"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Megaphone,
  Clock3,
  CheckCircle2,
  Wallet,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  ClipboardCheck,
  ReceiptText,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Campaign = {
  id: string;
  title: string | null;
  reward_per_task: number | string | null;
  total_slots: number | null;
  completed_slots: number | null;
  total_budget: number | string | null;
  status: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

type DashboardStats = {
  totalUsers: number;
  totalCampaigns: number;
  activeCampaigns: number;
  pendingCampaigns: number;
  pendingSubmissions: number;
  totalWalletBalance: number;
  totalTransactions: number;
};

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    pendingCampaigns: 0,
    pendingSubmissions: 0,
    totalWalletBalance: 0,
    totalTransactions: 0,
  });

  const [recentCampaigns, setRecentCampaigns] = useState<
    Campaign[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (
    isRefreshing = false
  ) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const [
        usersResult,
        campaignsResult,
        activeCampaignsResult,
        pendingCampaignsResult,
        pendingSubmissionsResult,
        walletsResult,
        transactionsResult,
        recentCampaignsResult,
      ] = await Promise.all([
        // Total registered users
        supabase
          .from("profiles")
          .select("*", {
            count: "exact",
            head: true,
          }),

        // Total campaigns
        supabase
          .from("campaigns")
          .select("*", {
            count: "exact",
            head: true,
          }),

        // Active campaigns
        supabase
          .from("campaigns")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "active"),

        // Campaigns waiting for admin approval
        supabase
          .from("campaigns")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "pending"),

        // Task submissions waiting for review
        supabase
          .from("task_submissions")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "pending"),

        // Wallet balances
        supabase
          .from("wallets")
          .select("available_balance"),

        // Total transactions
        supabase
          .from("transactions")
          .select("*", {
            count: "exact",
            head: true,
          }),

        // Recent campaigns using the actual
        // columns in your campaigns table
        supabase
          .from("campaigns")
          .select(`
            id,
            title,
            reward_per_task,
            total_slots,
            completed_slots,
            total_budget,
            status,
            starts_at,
            ends_at,
            created_at
          `)
          .order("created_at", {
            ascending: false,
          })
          .limit(6),
      ]);

      const queryErrors = [
        usersResult.error,
        campaignsResult.error,
        activeCampaignsResult.error,
        pendingCampaignsResult.error,
        pendingSubmissionsResult.error,
        walletsResult.error,
        transactionsResult.error,
        recentCampaignsResult.error,
      ].filter(Boolean);

      if (queryErrors.length > 0) {
        console.error(
          "Dashboard query errors:",
          queryErrors
        );

        throw new Error(
          queryErrors[0]?.message ||
            "Unable to load dashboard data."
        );
      }

      const totalWalletBalance =
        walletsResult.data?.reduce(
          (total, wallet) => {
            return (
              total +
              Number(
                wallet.available_balance || 0
              )
            );
          },
          0
        ) || 0;

      setStats({
        totalUsers:
          usersResult.count || 0,

        totalCampaigns:
          campaignsResult.count || 0,

        activeCampaigns:
          activeCampaignsResult.count || 0,

        pendingCampaigns:
          pendingCampaignsResult.count || 0,

        pendingSubmissions:
          pendingSubmissionsResult.count || 0,

        totalWalletBalance,

        totalTransactions:
          transactionsResult.count || 0,
      });

      setRecentCampaigns(
        recentCampaignsResult.data || []
      );
    } catch (error) {
      console.error(
        "Dashboard loading error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatCurrency = (
    amount: number
  ) => {
    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      }
    ).format(amount);
  };

  const formatDate = (
    date: string | null
  ) => {
    if (!date) {
      return "Not set";
    }

    return new Intl.DateTimeFormat(
      "en-NG",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    ).format(new Date(date));
  };

  const getStatusStyle = (
    status: string | null
  ) => {
    switch (
      status?.toLowerCase()
    ) {
      case "active":
      case "approved":
      case "completed":
        return "border-emerald-100 bg-emerald-50 text-emerald-700";

      case "pending":
      case "draft":
        return "border-amber-100 bg-amber-50 text-amber-700";

      case "rejected":
      case "cancelled":
        return "border-red-100 bg-red-50 text-red-700";

      default:
        return "border-slate-200 bg-slate-100 text-slate-600";
    }
  };

  const dashboardCards = [
    {
      title: "Total Users",
      value:
        stats.totalUsers.toLocaleString(),
      description:
        "Registered GigPlace users",
      icon: Users,
      iconStyle:
        "bg-blue-50 text-blue-600",
    },
    {
      title: "Total Campaigns",
      value:
        stats.totalCampaigns.toLocaleString(),
      description:
        "All campaigns created",
      icon: Megaphone,
      iconStyle:
        "bg-violet-50 text-violet-600",
    },
    {
      title: "Active Campaigns",
      value:
        stats.activeCampaigns.toLocaleString(),
      description:
        "Campaigns currently running",
      icon: CheckCircle2,
      iconStyle:
        "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Pending Approval",
      value:
        stats.pendingCampaigns.toLocaleString(),
      description:
        "Campaigns waiting for review",
      icon: Clock3,
      iconStyle:
        "bg-amber-50 text-amber-600",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#0b3939]/15 border-t-[#0b3939]" />

          <p className="text-sm font-medium text-slate-500">
            Loading dashboard data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#0b3939]">
            Admin Dashboard
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Platform Overview
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Monitor users, campaigns,
            submissions, and platform activity.
          </p>
        </div>

        <button
          onClick={() =>
            loadDashboardData(true)
          }
          disabled={refreshing}
          className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing
                ? "animate-spin"
                : ""
            }`}
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh Data"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

          <div>
            <p className="text-sm font-semibold text-red-800">
              Unable to load dashboard data
            </p>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Main Statistics */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardCards.map(
          (card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {card.title}
                    </p>

                    <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                      {card.value}
                    </h2>
                  </div>

                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconStyle}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <p className="mt-4 text-xs text-slate-500">
                  {card.description}
                </p>
              </div>
            );
          }
        )}
      </div>

      {/* Secondary Statistics */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Pending Task Submissions
              </p>

              <h2 className="mt-3 text-3xl font-bold text-slate-900">
                {stats.pendingSubmissions.toLocaleString()}
              </h2>

              <p className="mt-2 text-xs text-slate-500">
                Proof submissions waiting
                for admin review.
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <ClipboardCheck className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Transactions
              </p>

              <h2 className="mt-3 text-3xl font-bold text-slate-900">
                {stats.totalTransactions.toLocaleString()}
              </h2>

              <p className="mt-2 text-xs text-slate-500">
                All recorded platform
                transactions.
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <ReceiptText className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Summary */}
      <div className="rounded-2xl bg-[#0b3939] p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-white/70">
              <Wallet className="h-4 w-4" />

              <span className="text-sm font-medium">
                Total User Wallet Balance
              </span>
            </div>

            <h2 className="mt-3 text-3xl font-bold">
              {formatCurrency(
                stats.totalWalletBalance
              )}
            </h2>

            <p className="mt-2 text-sm text-white/60">
              Combined available balance
              across all user wallets.
            </p>
          </div>

          <Link
            href="/admin/dashboard/wallet"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0b3939] transition hover:bg-slate-100"
          >
            Manage Wallets

            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="font-bold text-slate-900">
              Recent Campaigns
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Latest campaigns created
              by advertisers.
            </p>
          </div>

          <Link
            href="/admin/dashboard/campaigns"
            className="text-sm font-semibold text-[#0b3939] hover:underline"
          >
            View All
          </Link>
        </div>

        {recentCampaigns.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Megaphone className="mx-auto h-10 w-10 text-slate-300" />

            <h3 className="mt-4 font-semibold text-slate-700">
              No campaigns yet
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Campaigns created by
              advertisers will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">

              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Campaign
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total Budget
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Progress
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Created
                  </th>
                </tr>
              </thead>

              <tbody>
                {recentCampaigns.map(
                  (campaign) => (
                    <tr
                      key={campaign.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">
                          {campaign.title ||
                            "Untitled Campaign"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Reward:{" "}
                          {formatCurrency(
                            Number(
                              campaign.reward_per_task ||
                                0
                            )
                          )}
                          {" "}per task
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                        {formatCurrency(
                          Number(
                            campaign.total_budget ||
                              0
                          )
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-700">
                          {campaign.completed_slots ||
                            0}
                          {" / "}
                          {campaign.total_slots ||
                            0}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Completed slots
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusStyle(
                            campaign.status
                          )}`}
                        >
                          {campaign.status ||
                            "Unknown"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-500">
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
        )}
      </div>
    </div>
  );
}