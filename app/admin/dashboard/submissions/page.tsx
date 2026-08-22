"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ClipboardX,
  Clock3,
  ExternalLink,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type SubmissionStatus = "pending" | "approved" | "rejected";

type WorkerProfile = {
  id: string;
  full_name: string | null;
  user_name: string | null;
  email: string | null;
};

type AdminProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type Campaign = {
  id: string;
  title: string | null;
};

type CampaignTask = {
  id: string;
  title: string;
  campaign_id: string;
};

type Submission = {
  id: string;
  task_id: string;
  worker_id: string;
  proof_url: any;
  proof_note: string | null;
  proof_text?: string | null;
  status: SubmissionStatus;
  reward_amount: number;
  reviewed_by: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;

  task?: {
    id: string;
    title: string;
    campaign_id: string;
  };

  campaign?: {
    id: string;
    title: string | null;
  };

  worker?: WorkerProfile;
  reviewer?: AdminProfile;
};

type DashboardStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

type ReviewMode = "approve" | "reject" | null;

const PAGE_SIZE = 10;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const parseProofUrls = (proofUrl: any): string[] => {
  if (!proofUrl) return [];

  // Already an array (jsonb)
  if (Array.isArray(proofUrl)) {
    return proofUrl.filter((u) => typeof u === "string" && u.trim());
  }

  // Stored as JSON string
  if (typeof proofUrl === "string") {
    try {
      const parsed = JSON.parse(proofUrl);
      if (Array.isArray(parsed)) {
        return parsed.filter((u) => typeof u === "string" && u.trim());
      }
      return [proofUrl];
    } catch {
      return [proofUrl];
    }
  }

  return [];
};

const isVideoUrl = (url: string) =>
  /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url) ||
  url.includes("/video") ||
  url.includes("video/");

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));

const formatTime = (date: string) =>
  new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));

const getInitials = (name?: string | null) => {
  if (!name) return "GP";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tasks, setTasks] = useState<CampaignTask[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [taskFilter, setTaskFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [reviewMode, setReviewMode] = useState<ReviewMode>(null);
  const [reviewNote, setReviewNote] = useState("");

  /* -------------------- Load Data -------------------- */

  const loadSubmissions = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const [
        submissionsResult,
        tasksResult,
        campaignsResult,
        workersResult,
        adminsResult,
      ] = await Promise.all([
        supabase
          .from("task_submissions")
          .select(
            `
            id,
            task_id,
            worker_id,
            proof_url,
            proof_note,
            proof_text,
            status,
            reward_amount,
            reviewed_by,
            review_note,
            reviewed_at,
            created_at,
            updated_at
          `
          )
          .order("created_at", { ascending: false }),

        supabase.from("campaign_tasks").select("id, title, campaign_id"),
        supabase.from("campaigns").select("id, title"),
        supabase.from("profiles").select("id, full_name, user_name, email"),
        supabase
          .from("admin_profiles")
          .select("id, first_name, last_name, email"),
      ]);

      const queryErrors = [
        submissionsResult.error,
        tasksResult.error,
        campaignsResult.error,
        workersResult.error,
        adminsResult.error,
      ].filter(Boolean);

      if (queryErrors.length > 0) {
        throw new Error(
          queryErrors[0]?.message || "Unable to load submission data."
        );
      }

      const submissionsData = submissionsResult.data || [];
      const tasksData = tasksResult.data || [];
      const campaignsData = campaignsResult.data || [];
      const workersData = workersResult.data || [];
      const adminsData = adminsResult.data || [];

      const taskMap = new Map(tasksData.map((t) => [t.id, t]));
      const campaignMap = new Map(campaignsData.map((c) => [c.id, c]));
      const workerMap = new Map(workersData.map((w) => [w.id, w]));
      const adminMap = new Map(adminsData.map((a) => [a.id, a]));

      const mapped: Submission[] = submissionsData.map((submission) => {
        const task = taskMap.get(submission.task_id);
        const campaign = task ? campaignMap.get(task.campaign_id) : undefined;
        const worker = workerMap.get(submission.worker_id);
        const reviewer = submission.reviewed_by
          ? adminMap.get(submission.reviewed_by)
          : undefined;

        return {
          ...submission,
          status: submission.status as SubmissionStatus,
          reward_amount: Number(submission.reward_amount || 0),
          task: task
            ? {
                id: task.id,
                title: task.title,
                campaign_id: task.campaign_id,
              }
            : undefined,
          campaign: campaign
            ? { id: campaign.id, title: campaign.title }
            : undefined,
          worker: worker
            ? {
                id: worker.id,
                full_name: worker.full_name,
                user_name: worker.user_name,
                email: worker.email,
              }
            : undefined,
          reviewer: reviewer
            ? {
                id: reviewer.id,
                first_name: reviewer.first_name,
                last_name: reviewer.last_name,
                email: reviewer.email,
              }
            : undefined,
        };
      });

      setSubmissions(mapped);
      setTasks(tasksData);
      setCampaigns(campaignsData);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to load submissions."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-task-submissions-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_submissions",
        },
        () => loadSubmissions(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSubmissions]);

  useEffect(() => {
    setTaskFilter("all");
    setCurrentPage(1);
  }, [campaignFilter]);

  /* -------------------- Derived data -------------------- */

  const availableTasks = useMemo(() => {
    if (campaignFilter === "all") return tasks;
    return tasks.filter((t) => t.campaign_id === campaignFilter);
  }, [tasks, campaignFilter]);

  const stats: DashboardStats = useMemo(
    () => ({
      total: submissions.length,
      pending: submissions.filter((s) => s.status === "pending").length,
      approved: submissions.filter((s) => s.status === "approved").length,
      rejected: submissions.filter((s) => s.status === "rejected").length,
    }),
    [submissions]
  );

  const filteredSubmissions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return submissions.filter((submission) => {
      const workerName = submission.worker?.full_name || "";
      const userName = submission.worker?.user_name || "";
      const workerEmail = submission.worker?.email || "";
      const campaignTitle = submission.campaign?.title || "";
      const taskTitle = submission.task?.title || "";

      const matchesSearch =
        !query ||
        submission.id.toLowerCase().includes(query) ||
        workerName.toLowerCase().includes(query) ||
        userName.toLowerCase().includes(query) ||
        workerEmail.toLowerCase().includes(query) ||
        campaignTitle.toLowerCase().includes(query) ||
        taskTitle.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || submission.status === statusFilter;

      const matchesCampaign =
        campaignFilter === "all" ||
        submission.campaign?.id === campaignFilter;

      const matchesTask =
        taskFilter === "all" || submission.task_id === taskFilter;

      return matchesSearch && matchesStatus && matchesCampaign && matchesTask;
    });
  }, [submissions, searchQuery, statusFilter, campaignFilter, taskFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSubmissions.length / PAGE_SIZE)
  );

  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSubmissions.slice(start, start + PAGE_SIZE);
  }, [filteredSubmissions, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCampaignFilter("all");
    setTaskFilter("all");
    setCurrentPage(1);
  };

  /* -------------------- Review actions -------------------- */

  const openReviewModal = (submission: Submission, mode: ReviewMode) => {
    setSelectedSubmission(submission);
    setReviewMode(mode);
    setReviewNote("");
    setActiveActionId(null);
  };

  const closeReviewModal = () => {
    if (actionLoading) return;
    setSelectedSubmission(null);
    setReviewMode(null);
    setReviewNote("");
  };

  const handleReview = async () => {
    if (!selectedSubmission || !reviewMode) return;

    if (reviewMode === "reject" && !reviewNote.trim()) {
      setError("Please provide a reason for rejecting this submission.");
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("You must be logged in as an administrator.");
      }

      const updateData =
        reviewMode === "approve"
          ? {
              status: "approved" as const,
              reviewed_by: user.id,
              review_note: reviewNote.trim() || "Approved",
              reviewed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          : {
              status: "rejected" as const,
              reviewed_by: user.id,
              review_note: reviewNote.trim(),
              reviewed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

      const { error: updateError } = await supabase
        .from("task_submissions")
        .update(updateData)
        .eq("id", selectedSubmission.id);

      if (updateError) throw updateError;

      // The database trigger will automatically:
      // 1. Credit the worker's wallet
      // 2. Create a transaction
      // 3. Increase completed_slots / completed_workers

      setSuccessMessage(
        reviewMode === "approve"
          ? `Submission approved! ₦${selectedSubmission.reward_amount.toLocaleString()} has been credited to the worker automatically.`
          : "Submission rejected successfully."
      );

      closeReviewModal();
      await loadSubmissions(true);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to review submission."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const getWorkerName = (submission: Submission) =>
    submission.worker?.full_name ||
    submission.worker?.user_name ||
    submission.worker?.email ||
    "Unknown Worker";

  const getReviewerName = (submission: Submission) => {
    if (!submission.reviewer) return null;
    const name = [submission.reviewer.first_name, submission.reviewer.last_name]
      .filter(Boolean)
      .join(" ");
    return name || submission.reviewer.email || "Admin";
  };

  const getStatusStyle = (status: SubmissionStatus) => {
    switch (status) {
      case "approved":
        return "border-emerald-100 bg-emerald-50 text-emerald-700";
      case "rejected":
        return "border-red-100 bg-red-50 text-red-700";
      default:
        return "border-amber-100 bg-amber-50 text-amber-700";
    }
  };

  const getProofNote = (submission: Submission) =>
    submission.proof_text || submission.proof_note || null;

  const dashboardCards = [
    {
      title: "Total Submissions",
      value: stats.total,
      description: "All worker task submissions",
      icon: ClipboardCheck,
      iconStyle: "bg-blue-50 text-blue-600",
    },
    {
      title: "Pending Review",
      value: stats.pending,
      description: "Waiting for admin review",
      icon: Clock3,
      iconStyle: "bg-amber-50 text-amber-600",
    },
    {
      title: "Approved",
      value: stats.approved,
      description: "Successfully verified + paid",
      icon: CheckCircle2,
      iconStyle: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Rejected",
      value: stats.rejected,
      description: "Returned or declined",
      icon: XCircle,
      iconStyle: "bg-red-50 text-red-600",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#0b3939]" />
          <p className="text-sm font-medium text-slate-500">
            Loading submissions...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#0b3939]">
            Submission Management
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Task Submissions
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Review worker submissions, verify proof, and approve to automatically
            credit rewards.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadSubmissions(true)}
          disabled={refreshing}
          className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {successMessage && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-800">
              {successMessage}
            </p>
          </div>
          <button type="button" onClick={() => setSuccessMessage("")}>
            <X className="h-4 w-4 text-emerald-700" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-800">Error</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setError("");
              loadSubmissions(true);
            }}
            className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-red-700 shadow-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardCards.map((card) => {
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
                  <h2 className="mt-3 text-3xl font-bold text-slate-900">
                    {card.value.toLocaleString()}
                  </h2>
                </div>
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconStyle}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-500">{card.description}</p>
            </div>
          );
        })}
      </div>

      {/* Main Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-slate-100 px-5 py-5 lg:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">All Submissions</h2>
              <p className="mt-1 text-sm text-slate-500">
                Monitor and review worker task completion records.
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              Total: {filteredSubmissions.length} submissions
            </span>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_160px_200px_200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search worker, campaign, task or submission ID..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#0b3939] focus:ring-2 focus:ring-[#0b3939]/10"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={campaignFilter}
              onChange={(e) => {
                setCampaignFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="all">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title || "Untitled Campaign"}
                </option>
              ))}
            </select>

            <select
              value={taskFilter}
              onChange={(e) => {
                setTaskFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="all">All Tasks</option>
              {availableTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <ClipboardX className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 font-semibold text-slate-700">
              No submissions found
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Worker task submissions will appear here once tasks are completed.
            </p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <Search className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-4 font-semibold text-slate-700">
              No matching submissions found
            </h3>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-xl bg-[#0b3939] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1300px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Worker
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Campaign & Task
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Proof Preview
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Reward
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Submitted
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Reviewed By
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedSubmissions.map((submission) => {
                    const workerName = getWorkerName(submission);
                    const reviewerName = getReviewerName(submission);
                    const proofUrls = parseProofUrls(submission.proof_url);
                    const proofNote = getProofNote(submission);

                    return (
                      <tr
                        key={submission.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0b3939]/10 text-xs font-bold text-[#0b3939]">
                              {getInitials(workerName)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-800">
                                {workerName}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-slate-400">
                                {submission.worker?.user_name
                                  ? `@${submission.worker.user_name}`
                                  : submission.worker?.email || "No email"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800">
                            {submission.campaign?.title || "Unknown Campaign"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {submission.task?.title || "Unknown Task"}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          {proofUrls.length > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-2">
                                {proofUrls.slice(0, 3).map((url, i) => (
                                  <div
                                    key={i}
                                    className="h-10 w-10 overflow-hidden rounded-lg border-2 border-white bg-slate-100 shadow-sm"
                                  >
                                    {isVideoUrl(url) ? (
                                      <div className="flex h-full w-full items-center justify-center bg-slate-800">
                                        <FileVideo className="h-4 w-4 text-white" />
                                      </div>
                                    ) : (
                                      <img
                                        src={url}
                                        alt={`Proof ${i + 1}`}
                                        className="h-full w-full object-cover"
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                              {proofUrls.length > 3 && (
                                <span className="text-xs font-medium text-slate-500">
                                  +{proofUrls.length - 3}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  openReviewModal(submission, "approve")
                                }
                                className="ml-1 text-xs font-semibold text-[#0b3939] hover:underline"
                              >
                                View all
                              </button>
                            </div>
                          ) : proofNote ? (
                            <span className="text-sm text-slate-600">
                              Text proof only
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">
                              No proof
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-800">
                            {formatCurrency(submission.reward_amount)}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusStyle(
                              submission.status
                            )}`}
                          >
                            {submission.status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-slate-700">
                            {formatDate(submission.created_at)}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatTime(submission.created_at)}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          {reviewerName ? (
                            <>
                              <p className="text-sm font-medium text-slate-700">
                                {reviewerName}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {submission.reviewed_at
                                  ? formatDate(submission.reviewed_at)
                                  : ""}
                              </p>
                            </>
                          ) : (
                            <span className="text-sm text-slate-400">
                              Not reviewed
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="relative inline-flex items-center gap-1">
                            {submission.status === "pending" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openReviewModal(submission, "approve")
                                  }
                                  className="flex h-9 w-9 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50"
                                  title="Approve"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openReviewModal(submission, "reject")
                                  }
                                  className="flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                                  title="Reject"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                setActiveActionId(
                                  activeActionId === submission.id
                                    ? null
                                    : submission.id
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </button>

                            {activeActionId === submission.id && (
                              <div className="absolute right-0 top-11 z-20 w-48 rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-lg">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openReviewModal(submission, "approve")
                                  }
                                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  View & Review
                                </button>

                                {submission.status === "pending" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openReviewModal(submission, "approve")
                                      }
                                      className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openReviewModal(submission, "reject")
                                      }
                                      className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredSubmissions.length > PAGE_SIZE && (
              <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
                <p className="text-sm text-slate-500">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                  {Math.min(currentPage * PAGE_SIZE, filteredSubmissions.length)}{" "}
                  of {filteredSubmissions.length} submissions
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-sm font-medium text-slate-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Review Modal */}
      {selectedSubmission && reviewMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {reviewMode === "approve"
                    ? "Review & Approve Submission"
                    : "Review & Reject Submission"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {reviewMode === "approve"
                    ? "Approving will automatically credit the reward to the worker."
                    : "Inspect the worker’s proof before making a decision."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeReviewModal}
                disabled={actionLoading}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-6">
              <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Worker</p>
                  <p className="font-semibold text-slate-800">
                    {getWorkerName(selectedSubmission)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Reward</p>
                  <p className="font-bold text-[#0b3939]">
                    {formatCurrency(selectedSubmission.reward_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Campaign</p>
                  <p className="font-semibold text-slate-800">
                    {selectedSubmission.campaign?.title || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Task</p>
                  <p className="font-semibold text-slate-800">
                    {selectedSubmission.task?.title || "Unknown"}
                  </p>
                </div>
              </div>

              {getProofNote(selectedSubmission) && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">
                    Worker’s Note
                  </h3>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    {getProofNote(selectedSubmission)}
                  </div>
                </div>
              )}

              {(() => {
                const urls = parseProofUrls(selectedSubmission.proof_url);
                if (urls.length === 0) {
                  return (
                    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                      No image or video proof uploaded.
                    </div>
                  );
                }

                return (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-slate-700">
                      Uploaded Proof ({urls.length})
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {urls.map((url, index) => (
                        <div
                          key={index}
                          className="overflow-hidden rounded-xl border border-slate-200"
                        >
                          {isVideoUrl(url) ? (
                            <video
                              src={url}
                              controls
                              className="w-full max-h-72 object-contain bg-black"
                            />
                          ) : (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={url}
                                alt={`Proof ${index + 1}`}
                                className="w-full max-h-72 object-contain"
                              />
                            </a>
                          )}
                          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-3 py-2">
                            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                              {isVideoUrl(url) ? (
                                <FileVideo className="h-3.5 w-3.5" />
                              ) : (
                                <ImageIcon className="h-3.5 w-3.5" />
                              )}
                              Proof {index + 1}
                            </span>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-[#0b3939] hover:underline"
                            >
                              Open
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {reviewMode === "approve"
                    ? "Review Note (Optional)"
                    : "Reason for Rejection *"}
                </label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={4}
                  placeholder={
                    reviewMode === "approve"
                      ? "Add an optional note..."
                      : "Enter the reason for rejection..."
                  }
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0b3939] focus:ring-2 focus:ring-[#0b3939]/10"
                />
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={closeReviewModal}
                disabled={actionLoading}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReview}
                disabled={
                  actionLoading ||
                  (reviewMode === "reject" && !reviewNote.trim())
                }
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${
                  reviewMode === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {reviewMode === "approve"
                  ? actionLoading
                    ? "Approving..."
                    : "Approve & Pay Reward"
                  : actionLoading
                  ? "Rejecting..."
                  : "Reject Submission"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}