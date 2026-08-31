

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  Loader2,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Campaign = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  total_budget: number;
  reward_per_task: number;
  total_slots: number;
  completed_slots: number;
  created_at: string;
  starts_at: string | null;
  ends_at: string | null;
  instructions: string | null;
  target_url: string | null;
};

type SubmissionStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

type AnonymousSubmission = {
  id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  // No worker name, email, or user_id shown
};

const formatNaira = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (date: string | null) => {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

const statusStyle = (status: string) => {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "completed":
      return "bg-blue-100 text-blue-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const submissionStatusStyle = (status: string) => {
  switch (status) {
    case "approved":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "rejected":
      return "bg-red-50 text-red-700 border-red-100";
    default:
      return "bg-amber-50 text-amber-700 border-amber-100";
  }
};

export default function AdvertiserCampaignViewPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<SubmissionStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [submissions, setSubmissions] = useState<AnonymousSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // 1. Campaign (must belong to this advertiser)
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select(
          `
          id,
          title,
          description,
          status,
          total_budget,
          reward_per_task,
          total_slots,
          completed_slots,
          created_at,
          starts_at,
          ends_at,
          instructions,
          target_url
        `
        )
        .eq("id", campaignId)
        .eq("advertiser_id", user.id)
        .single();

      if (campaignError) throw campaignError;
      if (!campaignData) {
        setError("Campaign not found.");
        setLoading(false);
        return;
      }

      setCampaign({
        ...campaignData,
        total_budget: Number(campaignData.total_budget || 0),
        reward_per_task: Number(campaignData.reward_per_task || 0),
        total_slots: Number(campaignData.total_slots || 0),
        completed_slots: Number(campaignData.completed_slots || 0),
      });

      // 2. Get task ids for this campaign
      const { data: tasks, error: tasksError } = await supabase
        .from("campaign_tasks")
        .select("id")
        .eq("campaign_id", campaignId);

      if (tasksError) throw tasksError;

      const taskIds = (tasks || []).map((t) => t.id);

      if (taskIds.length === 0) {
        setStats({ total: 0, pending: 0, approved: 0, rejected: 0 });
        setSubmissions([]);
        setLoading(false);
        return;
      }

      // 3. Submissions — only status + dates (no worker personal info)
      const { data: submissionData, error: subError } = await supabase
        .from("task_submissions")
        .select("id, status, created_at, reviewed_at")
        .in("task_id", taskIds)
        .order("created_at", { ascending: false });

      if (subError) throw subError;

      const list = (submissionData || []).map((s) => ({
        id: s.id,
        status: s.status as "pending" | "approved" | "rejected",
        created_at: s.created_at,
        reviewed_at: s.reviewed_at,
      }));

      setSubmissions(list);
      setStats({
        total: list.length,
        pending: list.filter((s) => s.status === "pending").length,
        approved: list.filter((s) => s.status === "approved").length,
        rejected: list.filter((s) => s.status === "rejected").length,
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load campaign.");
    } finally {
      setLoading(false);
    }
  }, [campaignId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#0b3939]" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Unable to load campaign
        </h2>
        <p className="mt-2 text-sm text-slate-500">{error || "Not found"}</p>
        <Link
          href="/advertiser/dashboard/campaigns"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-5 py-2.5 text-sm font-medium text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaigns
        </Link>
      </div>
    );
  }

  const progress =
    campaign.total_slots > 0
      ? Math.round((campaign.completed_slots / campaign.total_slots) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <Link
        href="/advertiser/dashboard/campaigns"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#0b3939]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Campaigns
      </Link>

      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle(
                campaign.status
              )}`}
            >
              {campaign.status}
            </span>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
              {campaign.title}
            </h1>
            {campaign.description && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                {campaign.description}
              </p>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="mt-8">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">
              People who completed this task
            </span>
            <span className="font-semibold text-slate-900">
              {campaign.completed_slots} / {campaign.total_slots}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#0b3939] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-xs text-slate-400">
            {progress}% of slots filled
          </p>
        </div>

        {/* Stats grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Users className="h-4 w-4" />
              <span className="text-xs">Completed</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {campaign.completed_slots}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Clock3 className="h-4 w-4" />
              <span className="text-xs">Pending review</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {stats.pending}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs">Approved</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {stats.approved}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <XCircle className="h-4 w-4" />
              <span className="text-xs">Rejected</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-red-600">
              {stats.rejected}
            </p>
          </div>
        </div>

        {/* Budget & dates */}
        <div className="mt-6 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Reward per task</p>
            <p className="mt-1 font-semibold text-slate-900">
              {formatNaira(campaign.reward_per_task)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total budget</p>
            <p className="mt-1 font-semibold text-slate-900">
              {formatNaira(campaign.total_budget)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Created</p>
            <p className="mt-1 font-semibold text-slate-900">
              {formatDate(campaign.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Anonymous activity list */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="font-bold text-slate-900">Completion activity</h2>
          <p className="mt-1 text-sm text-slate-500">
            Who completed this task — shown without personal information.
          </p>
        </div>

        {submissions.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Users className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-600">
              No one has submitted this task yet
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Activity will appear here as workers complete the gig.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {submissions.map((sub, index) => (
              <li
                key={sub.id}
                className="flex items-center justify-between gap-4 px-6 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Worker #{index + 1}
                    </p>
                    <p className="text-xs text-slate-400">
                      Submitted {formatDate(sub.created_at)}
                      {sub.reviewed_at && (
                        <> · Reviewed {formatDate(sub.reviewed_at)}</>
                      )}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${submissionStatusStyle(
                    sub.status
                  )}`}
                >
                  {sub.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {campaign.instructions && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="font-bold text-slate-900">Task instructions</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
            {campaign.instructions}
          </p>
        </div>
      )}
    </div>
  );
}