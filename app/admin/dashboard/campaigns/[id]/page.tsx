"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ExternalLink,
  FileText,
  Loader2,
  Megaphone,
  PlayCircle,
  RefreshCw,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* =========================
   Types
========================= */
type Campaign = {
  id: string;
  created_at: string;
  updated_at: string | null;
  advertiser_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  target_url: string | null;
  reward_per_task: number | null;
  total_slots: number | null;
  completed_slots: number | null;
  total_budget: number | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  instructions: string | null;
  proof_required: boolean | null;
  advertiser_name?: string | null;
};

type CampaignTask = {
  id: string;
  campaign_id: string;
  title: string | null;
  instructions: string | null;
  task_type: string | null;
  target_url: string | null;
  proof_required: boolean | null;
  reward_amount: number | null;
  max_workers: number | null;
  completed_workers: number | null;
  status: string | null;
  created_at: string;
};

type TaskSubmission = {
  id: string;
  task_id: string;
  worker_id: string;
  proof_url: string | null;
  proof_note: string | null;
  status: string;
  reward_amount: number | null;
  reviewed_by: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  task_title?: string | null;
};

type Analytics = {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  totalRewards: number;
};

export default function AdminCampaignDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [tasks, setTasks] = useState<CampaignTask[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    totalSubmissions: 0,
    pendingSubmissions: 0,
    approvedSubmissions: 0,
    rejectedSubmissions: 0,
    totalRewards: 0,
  });

  const [confirmAction, setConfirmAction] = useState<
    "approve" | "reject" | "cancel" | null
  >(null);
  const [actionLoading, setActionLoading] = useState(false);

  /* =========================
     Auth
  ========================= */
  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/admin/login");
          return;
        }

        const { data: adminProfile, error: adminError } = await supabase
          .from("admin_profiles")
          .select("role, status")
          .eq("id", user.id)
          .single();

        if (
          adminError ||
          !adminProfile ||
          adminProfile.role !== "admin" ||
          adminProfile.status !== "approved"
        ) {
          router.replace("/admin/login");
          return;
        }

        setCheckingAuth(false);
        if (id) loadAll();
      } catch {
        router.replace("/admin/login");
      }
    };

    verifyAdmin();
  }, [id, router]);

  /* =========================
     Data Fetching
  ========================= */
  const loadAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      await Promise.all([
        fetchCampaign(),
        fetchTasksAndSubmissions(),
      ]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to load campaign");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCampaign = async () => {
    const { data, error: fetchError } = await supabase
      .from("campaigns")
      .select(
        `
        id, created_at, updated_at, advertiser_id, title, description,
        cover_image_url, target_url, reward_per_task, total_slots,
        completed_slots, total_budget, status, starts_at, ends_at,
        category_id, subcategory_id, instructions, proof_required
      `
      )
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    let advertiserName = "Unknown";
    if (data.advertiser_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, user_name")
        .eq("id", data.advertiser_id)
        .maybeSingle();

      advertiserName =
        profile?.full_name || profile?.user_name || "Unknown";
    }

    setCampaign({
      ...data,
      advertiser_name: advertiserName,
    });
  };

  const fetchTasksAndSubmissions = async () => {
    // Tasks
    const { data: tasksData, error: tasksError } = await supabase
      .from("campaign_tasks")
      .select(
        `
        id, campaign_id, title, instructions, task_type, target_url,
        proof_required, reward_amount, max_workers, completed_workers,
        status, created_at, updated_at
      `
      )
      .eq("campaign_id", id)
      .order("created_at", { ascending: false });

    if (tasksError) throw tasksError;

    const taskList = (tasksData || []) as CampaignTask[];
    setTasks(taskList);

    const taskIds = taskList.map((t) => t.id);
    let submissionList: TaskSubmission[] = [];

    if (taskIds.length > 0) {
      const { data: submissionsData, error: subError } = await supabase
        .from("task_submissions")
        .select(
          `
          id, task_id, worker_id, proof_url, proof_note, status,
          reward_amount, reviewed_by, review_note, reviewed_at, created_at
        `
        )
        .in("task_id", taskIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (subError) throw subError;

      const taskTitleMap = taskList.reduce((acc, t) => {
        acc[t.id] = t.title;
        return acc;
      }, {} as Record<string, string | null>);

      submissionList = (submissionsData || []).map((s) => ({
        ...s,
        task_title: taskTitleMap[s.task_id] || "Task",
      }));
    }

    setSubmissions(submissionList);

    // Analytics
    const totalTasks = taskList.length;
    const activeTasks = taskList.filter((t) => t.status === "active").length;
    const completedTasks = taskList.filter(
      (t) => t.status === "completed"
    ).length;

    const totalSubmissions = submissionList.length;
    const pendingSubmissions = submissionList.filter(
      (s) => s.status === "pending"
    ).length;
    const approvedSubmissions = submissionList.filter(
      (s) => s.status === "approved"
    ).length;
    const rejectedSubmissions = submissionList.filter(
      (s) => s.status === "rejected"
    ).length;
    const totalRewards = submissionList
      .filter((s) => s.status === "approved")
      .reduce((sum, s) => sum + Number(s.reward_amount || 0), 0);

    setAnalytics({
      totalTasks,
      activeTasks,
      completedTasks,
      totalSubmissions,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      totalRewards,
    });
  };

  /* =========================
     Helpers
  ========================= */
  const formatNaira = (amount: number | null | undefined) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Intl.DateTimeFormat("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const shortId = (value: string) => value.slice(0, 8) + "…";

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const getScheduleState = () => {
    if (!campaign) return "Unknown";
    const now = new Date();
    const start = campaign.starts_at ? new Date(campaign.starts_at) : null;
    const end = campaign.ends_at ? new Date(campaign.ends_at) : null;

    if (end && now > end) return "Campaign Ended";
    if (start && now < start) return "Not Started";
    if (campaign.status === "active") return "Currently Active";
    return campaign.status;
  };

  const progressPercent = () => {
    if (!campaign?.total_slots || campaign.total_slots <= 0) return 0;
    const pct =
      ((campaign.completed_slots || 0) / campaign.total_slots) * 100;
    return Math.min(100, Math.max(0, Math.round(pct)));
  };

  const remainingSlots = () => {
    if (!campaign) return 0;
    return Math.max(
      0,
      (campaign.total_slots || 0) - (campaign.completed_slots || 0)
    );
  };

  /* =========================
     Admin Actions
  ========================= */
  const updateStatus = async (
    newStatus: "active" | "rejected" | "cancelled"
  ) => {
    if (!campaign) return;
    setActionLoading(true);

    try {
      const { error: updateError } = await supabase
        .from("campaigns")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);

      if (updateError) throw updateError;

      setCampaign({ ...campaign, status: newStatus });
      setConfirmAction(null);

      const messages = {
        active: "Campaign approved successfully.",
        rejected: "Campaign rejected successfully.",
        cancelled: "Campaign cancelled successfully.",
      };
      showToast("success", messages[newStatus]);
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================
     Render States
  ========================= */
  if (checkingAuth || loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FB] p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-slate-200"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Campaign Not Found
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {error ||
              "The campaign you're looking for does not exist or may have been removed."}
          </p>
          <Link
            href="/admin/dashboard/campaigns"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-5 py-3 text-sm font-semibold text-white"
          >
            <ArrowLeft size={16} />
            Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  const pct = progressPercent();

  return (
    <div className="min-h-screen bg-[#F5F7FB] p-4 md:p-6 lg:p-8">
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 rounded-2xl px-5 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/dashboard/campaigns"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#0b3939]"
          >
            <ArrowLeft size={16} />
            Back to Campaigns
          </Link>

          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Admin / Campaigns / Campaign Details
          </p>

          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900">
                  {campaign.title}
                </h1>
                <StatusBadge status={campaign.status} />
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Campaign ID:{" "}
                <span className="font-mono text-slate-700">
                  {shortId(campaign.id)}
                </span>
              </p>
            </div>

            <button
              onClick={() => loadAll(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-[#0b3939] hover:text-[#0b3939]"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Hero Summary */}
        <div className="mb-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {campaign.cover_image_url ? (
              <img
                src={campaign.cover_image_url}
                alt={campaign.title}
                className="h-56 w-full object-cover"
              />
            ) : (
              <div className="flex h-56 items-center justify-center bg-slate-100 text-[#0b3939]">
                <Megaphone size={40} />
              </div>
            )}
            <div className="p-6">
              <div className="mb-3 flex items-center gap-2">
                <StatusBadge status={campaign.status} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                {campaign.title}
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {campaign.description || "No description provided."}
              </p>
              <p className="mt-4 text-sm text-slate-500">
                Advertiser:{" "}
                <span className="font-medium text-slate-800">
                  {campaign.advertiser_name}
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MiniStat
              label="Total Budget"
              value={formatNaira(campaign.total_budget)}
              icon={<Wallet size={18} />}
            />
            <MiniStat
              label="Reward / Task"
              value={formatNaira(campaign.reward_per_task)}
              icon={<Wallet size={18} />}
            />
            <MiniStat
              label="Total Slots"
              value={String(campaign.total_slots ?? 0)}
              icon={<Users size={18} />}
            />
            <MiniStat
              label="Completed"
              value={String(campaign.completed_slots ?? 0)}
              icon={<CheckCircle2 size={18} />}
            />
            <MiniStat
              label="Remaining"
              value={String(remainingSlots())}
              icon={<Clock3 size={18} />}
            />
            <MiniStat
              label="Start Date"
              value={formatDate(campaign.starts_at)}
              icon={<CalendarDays size={18} />}
            />
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">
              Campaign Progress
            </h3>
            <span className="text-sm font-medium text-slate-600">
              {campaign.completed_slots ?? 0} / {campaign.total_slots ?? 0}{" "}
              completed
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#0b3939] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-3 flex justify-between text-sm text-slate-500">
            <span>{pct}% complete</span>
            <span>{remainingSlots()} remaining</span>
          </div>
        </div>

        {/* Info + Schedule */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <FileText className="text-[#0b3939]" size={22} />
              <h3 className="text-lg font-bold text-slate-900">
                Campaign Information
              </h3>
            </div>
            <div className="space-y-4 text-sm">
              <InfoRow label="Title" value={campaign.title} />
              <InfoRow
                label="Reward / Task"
                value={formatNaira(campaign.reward_per_task)}
              />
              <InfoRow
                label="Total Budget"
                value={formatNaira(campaign.total_budget)}
              />
              <InfoRow
                label="Proof Required"
                value={campaign.proof_required ? "Yes" : "No"}
              />
              <InfoRow
                label="Created"
                value={formatDate(campaign.created_at)}
              />
              <InfoRow
                label="Updated"
                value={formatDate(campaign.updated_at)}
              />
            </div>

            {campaign.instructions && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Instructions
                </p>
                <p className="whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  {campaign.instructions}
                </p>
              </div>
            )}

            {campaign.target_url && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Target URL
                </p>
                <a
                  href={campaign.target_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 break-all text-sm text-[#0b3939] hover:underline"
                >
                  {campaign.target_url}
                  <ExternalLink size={14} />
                </a>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <CalendarDays className="text-[#0b3939]" size={22} />
              <h3 className="text-lg font-bold text-slate-900">Schedule</h3>
            </div>
            <div className="space-y-4 text-sm">
              <InfoRow
                label="Start Date"
                value={formatDate(campaign.starts_at)}
              />
              <InfoRow
                label="End Date"
                value={formatDate(campaign.ends_at)}
              />
              <InfoRow label="Current State" value={getScheduleState()} />
            </div>
          </div>
        </div>

        {/* Analytics */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <MiniStat label="Total Tasks" value={String(analytics.totalTasks)} />
          <MiniStat
            label="Active Tasks"
            value={String(analytics.activeTasks)}
          />
          <MiniStat
            label="Total Submissions"
            value={String(analytics.totalSubmissions)}
          />
          <MiniStat
            label="Approved Rewards"
            value={formatNaira(analytics.totalRewards)}
          />
          <MiniStat
            label="Pending Submissions"
            value={String(analytics.pendingSubmissions)}
          />
          <MiniStat
            label="Approved"
            value={String(analytics.approvedSubmissions)}
          />
          <MiniStat
            label="Rejected"
            value={String(analytics.rejectedSubmissions)}
          />
          <MiniStat
            label="Completed Tasks"
            value={String(analytics.completedTasks)}
          />
        </div>

        {/* Tasks */}
        <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-3">
      <ClipboardList className="text-[#0b3939]" size={22} />
      <h3 className="text-lg font-bold text-slate-900">
        Campaign Tasks
      </h3>
    </div>

    <Link
      href={`/admin/dashboard/campaigns/${campaign.id}/task`}
      className="inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b3939]/90"
    >
      <ClipboardList size={16} />
      Manage Tasks
    </Link>
  </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-500">
              No tasks found for this campaign.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Task</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Reward</th>
                    <th className="px-4 py-3 font-semibold">Workers</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.map((task) => {
                    const taskPct =
                      task.max_workers && task.max_workers > 0
                        ? Math.min(
                            100,
                            Math.round(
                              ((task.completed_workers || 0) /
                                task.max_workers) *
                                100
                            )
                          )
                        : 0;

                    return (
                      <tr key={task.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-4 font-medium text-slate-900">
                          {task.title || "Untitled Task"}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {task.task_type || "—"}
                        </td>
                        <td className="px-4 py-4 text-slate-800">
                          {formatNaira(task.reward_amount)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="min-w-[120px]">
                            <p className="mb-1 text-slate-700">
                              {task.completed_workers ?? 0} /{" "}
                              {task.max_workers ?? 0}
                            </p>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-[#0b3939]"
                                style={{ width: `${taskPct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={task.status || "draft"} />
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {formatDate(task.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Submissions */}
        <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <PlayCircle className="text-[#0b3939]" size={22} />
            <h3 className="text-lg font-bold text-slate-900">
              Recent Task Submissions
            </h3>
          </div>

          {submissions.length === 0 ? (
            <p className="text-sm text-slate-500">
              No submissions yet for this campaign.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Task</th>
                    <th className="px-4 py-3 font-semibold">Worker ID</th>
                    <th className="px-4 py-3 font-semibold">Reward</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Submitted</th>
                    <th className="px-4 py-3 font-semibold">Reviewed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-4 font-medium text-slate-900">
                        {sub.task_title || "Task"}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-slate-600">
                        {shortId(sub.worker_id)}
                      </td>
                      <td className="px-4 py-4 text-slate-800">
                        {formatNaira(sub.reward_amount)}
                      </td>
                      <td className="px-4 py-4">
                        <SubmissionBadge status={sub.status} />
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {formatDate(sub.created_at)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {formatDate(sub.reviewed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Admin Actions */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">
            Admin Actions
          </h3>

          <div className="flex flex-wrap gap-3">
            {campaign.status === "pending" && (
              <>
                <button
                  onClick={() => setConfirmAction("approve")}
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Approve Campaign
                </button>
                <button
                  onClick={() => setConfirmAction("reject")}
                  className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Reject Campaign
                </button>
              </>
            )}

            {campaign.status === "active" && (
              <button
                onClick={() => setConfirmAction("cancel")}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
              >
                Cancel Campaign
              </button>
            )}

            {campaign.status === "completed" && (
              <p className="text-sm text-slate-500">
                This campaign is completed. Review final results in submissions
                above.
              </p>
            )}

            {campaign.status === "rejected" && (
              <p className="text-sm text-slate-500">
                This campaign was rejected.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">
              {confirmAction === "approve" && "Approve Campaign?"}
              {confirmAction === "reject" && "Reject Campaign?"}
              {confirmAction === "cancel" && "Cancel Campaign?"}
            </h3>
            <p className="mt-3 text-sm text-slate-600">
              {confirmAction === "approve" &&
                "This campaign will become active and visible to workers."}
              {confirmAction === "reject" &&
                "This campaign will be marked as rejected."}
              {confirmAction === "cancel" &&
                "This campaign will be cancelled and stop accepting workers."}
            </p>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={actionLoading}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  updateStatus(
                    confirmAction === "approve"
                      ? "active"
                      : confirmAction === "reject"
                      ? "rejected"
                      : "cancelled"
                  )
                }
                disabled={actionLoading}
                className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white ${
                  confirmAction === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionLoading ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   UI Helpers
========================= */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    active: "bg-emerald-100 text-emerald-700",
    completed: "bg-blue-100 text-blue-700",
    rejected: "bg-red-100 text-red-700",
    cancelled: "bg-red-100 text-red-700",
    draft: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
        map[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

function SubmissionBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
        map[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{value}</p>
        </div>
        {icon && (
          <div className="rounded-xl bg-[#0b3939]/10 p-2 text-[#0b3939]">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  );
}
