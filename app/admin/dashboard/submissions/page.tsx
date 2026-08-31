"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ClipboardX,
  Clock3,
  ExternalLink,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  Megaphone,
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
  task?: { id: string; title: string; campaign_id: string };
  campaign?: { id: string; title: string | null };
  worker?: WorkerProfile;
  reviewer?: AdminProfile;
};

type CampaignCardData = {
  id: string;
  title: string;
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
  if (Array.isArray(proofUrl)) {
    return proofUrl.filter((u) => typeof u === "string" && u.trim());
  }
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

  // Drill-down: null = campaign cards, string = selected campaign id
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [taskFilter, setTaskFilter] = useState("all");
  const [campaignSearch, setCampaignSearch] = useState("");
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
    setStatusFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
  }, [selectedCampaignId]);

  /* -------------------- Campaign cards data -------------------- */

  const campaignCards: CampaignCardData[] = useMemo(() => {
    const byCampaign = new Map<string, CampaignCardData>();

    // Seed with known campaigns
    campaigns.forEach((c) => {
      byCampaign.set(c.id, {
        id: c.id,
        title: c.title || "Untitled Campaign",
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      });
    });

    submissions.forEach((s) => {
      const id = s.campaign?.id;
      if (!id) return;

      if (!byCampaign.has(id)) {
        byCampaign.set(id, {
          id,
          title: s.campaign?.title || "Untitled Campaign",
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
        });
      }

      const card = byCampaign.get(id)!;
      card.total += 1;
      if (s.status === "pending") card.pending += 1;
      if (s.status === "approved") card.approved += 1;
      if (s.status === "rejected") card.rejected += 1;
    });

    let list = Array.from(byCampaign.values());

    // Only show campaigns that have at least one submission (optional)
    // list = list.filter((c) => c.total > 0);

    const q = campaignSearch.toLowerCase().trim();
    if (q) {
      list = list.filter((c) => c.title.toLowerCase().includes(q));
    }

    // Pending first, then by total
    list.sort((a, b) => {
      if (b.pending !== a.pending) return b.pending - a.pending;
      return b.total - a.total;
    });

    return list;
  }, [campaigns, submissions, campaignSearch]);

  const selectedCampaign = useMemo(
    () => campaignCards.find((c) => c.id === selectedCampaignId) || null,
    [campaignCards, selectedCampaignId]
  );

  /* -------------------- Submissions for selected campaign -------------------- */

  const availableTasks = useMemo(() => {
    if (!selectedCampaignId) return [];
    return tasks.filter((t) => t.campaign_id === selectedCampaignId);
  }, [tasks, selectedCampaignId]);

  const campaignSubmissions = useMemo(() => {
    if (!selectedCampaignId) return [];
    return submissions.filter((s) => s.campaign?.id === selectedCampaignId);
  }, [submissions, selectedCampaignId]);

  const stats = useMemo(
    () => ({
      total: campaignSubmissions.length,
      pending: campaignSubmissions.filter((s) => s.status === "pending").length,
      approved: campaignSubmissions.filter((s) => s.status === "approved")
        .length,
      rejected: campaignSubmissions.filter((s) => s.status === "rejected")
        .length,
    }),
    [campaignSubmissions]
  );

  const filteredSubmissions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return campaignSubmissions.filter((submission) => {
      const workerName = submission.worker?.full_name || "";
      const userName = submission.worker?.user_name || "";
      const workerEmail = submission.worker?.email || "";
      const taskTitle = submission.task?.title || "";

      const matchesSearch =
        !query ||
        submission.id.toLowerCase().includes(query) ||
        workerName.toLowerCase().includes(query) ||
        userName.toLowerCase().includes(query) ||
        workerEmail.toLowerCase().includes(query) ||
        taskTitle.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || submission.status === statusFilter;

      const matchesTask =
        taskFilter === "all" || submission.task_id === taskFilter;

      return matchesSearch && matchesStatus && matchesTask;
    });
  }, [campaignSubmissions, searchQuery, statusFilter, taskFilter]);

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

  const globalStats = useMemo(
    () => ({
      total: submissions.length,
      pending: submissions.filter((s) => s.status === "pending").length,
      approved: submissions.filter((s) => s.status === "approved").length,
      rejected: submissions.filter((s) => s.status === "rejected").length,
    }),
    [submissions]
  );

  const dashboardCards = [
    {
      title: "Total Submissions",
      value: globalStats.total,
      description: "All worker task submissions",
      icon: ClipboardCheck,
      iconStyle: "bg-blue-50 text-blue-600",
    },
    {
      title: "Pending Review",
      value: globalStats.pending,
      description: "Waiting for admin review",
      icon: Clock3,
      iconStyle: "bg-amber-50 text-amber-600",
    },
    {
      title: "Approved",
      value: globalStats.approved,
      description: "Successfully verified + paid",
      icon: CheckCircle2,
      iconStyle: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Rejected",
      value: globalStats.rejected,
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

  /* ======================================================================== */
  /* VIEW 1: Campaign cards                                                   */
  /* ======================================================================== */

  if (!selectedCampaignId) {
    return (
      <div className="space-y-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0b3939]">
              Submission Management
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Task Submissions
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Select a campaign to review its worker task submissions.
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

        {/* Search campaigns */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={campaignSearch}
            onChange={(e) => setCampaignSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#0b3939] focus:ring-2 focus:ring-[#0b3939]/10"
          />
        </div>

        {/* Campaign cards grid */}
        {campaignCards.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center shadow-sm">
            <Megaphone className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 font-semibold text-slate-700">
              No campaigns found
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Campaigns with task submissions will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {campaignCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => setSelectedCampaignId(card.id)}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[#0b3939]/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0b3939]/10 text-[#0b3939]">
                      <Megaphone className="h-5 w-5" />
                    </div>
                    <h3 className="truncate text-lg font-bold text-slate-900 group-hover:text-[#0b3939]">
                      {card.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {card.total} submission{card.total === 1 ? "" : "s"}
                    </p>
                  </div>
                  {card.pending > 0 && (
                    <span className="shrink-0 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      {card.pending} pending
                    </span>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-xs text-slate-400">Pending</p>
                    <p className="mt-0.5 text-sm font-bold text-amber-600">
                      {card.pending}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Approved</p>
                    <p className="mt-0.5 text-sm font-bold text-emerald-600">
                      {card.approved}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Rejected</p>
                    <p className="mt-0.5 text-sm font-bold text-red-600">
                      {card.rejected}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs font-semibold text-[#0b3939] opacity-0 transition group-hover:opacity-100">
                  View submissions →
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ======================================================================== */
  /* VIEW 2: Submissions for selected campaign                                */
  /* ======================================================================== */

  return (
    <div className="space-y-7">
      {/* Header with back */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => setSelectedCampaignId(null)}
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0b3939] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to campaigns
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {selectedCampaign?.title || "Campaign submissions"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Review worker submissions for this campaign and approve to credit
            rewards.
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

      {/* Campaign-level stats */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Total",
            value: stats.total,
            icon: ClipboardCheck,
            iconStyle: "bg-blue-50 text-blue-600",
          },
          {
            title: "Pending",
            value: stats.pending,
            icon: Clock3,
            iconStyle: "bg-amber-50 text-amber-600",
          },
          {
            title: "Approved",
            value: stats.approved,
            icon: CheckCircle2,
            iconStyle: "bg-emerald-50 text-emerald-600",
          },
          {
            title: "Rejected",
            value: stats.rejected,
            icon: XCircle,
            iconStyle: "bg-red-50 text-red-600",
          },
        ].map((card) => {
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
            </div>
          );
        })}
      </div>

      {/* Submissions table card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-slate-100 px-5 py-5 lg:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Submissions</h2>
              <p className="mt-1 text-sm text-slate-500">
                Task completion records for this campaign.
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              Total: {filteredSubmissions.length} submissions
            </span>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_160px_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search worker, task or submission ID..."
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

        {campaignSubmissions.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <ClipboardX className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 font-semibold text-slate-700">
              No submissions yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Workers haven’t submitted proof for this campaign’s tasks yet.
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
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Worker
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Task
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
                  {Math.min(
                    currentPage * PAGE_SIZE,
                    filteredSubmissions.length
                  )}{" "}
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

      {/* Review Modal — unchanged from your original */}
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