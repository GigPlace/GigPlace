"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Loader2,
  Megaphone,
  MoreVertical,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* =========================
   Types
========================= */
type Campaign = {
  id: string;
  title: string;
  status: string;
  cover_image_url: string | null;
  reward_per_task: number | null;
  total_slots: number | null;
  completed_slots: number | null;
  total_budget: number | null;
  starts_at: string | null;
  ends_at: string | null;
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
  updated_at: string | null;
  submission_count?: number;
  pending_count?: number;
  approved_count?: number;
  rejected_count?: number;
};

type TaskForm = {
  title: string;
  instructions: string;
  task_type: string;
  target_url: string;
  reward_amount: string;
  max_workers: string;
  proof_required: boolean;
  status: string;
};

type TaskStats = {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalWorkers: number;
  totalCompletedWorkers: number;
  totalTaskRewards: number;
};

const PAGE_SIZE = 20;

const EMPTY_FORM: TaskForm = {
  title: "",
  instructions: "",
  task_type: "engagement",
  target_url: "",
  reward_amount: "",
  max_workers: "",
  proof_required: true,
  status: "active",
};

export default function AdminCampaignTasksPage() {
  const params = useParams();
  const router = useRouter();

  const campaignId = Array.isArray(params?.id)
    ? params.id[0]
    : (params?.id as string | undefined);

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
  const [stats, setStats] = useState<TaskStats>({
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    totalWorkers: 0,
    totalCompletedWorkers: 0,
    totalTaskRewards: 0,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CampaignTask | null>(null);
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [viewTask, setViewTask] = useState<CampaignTask | null>(null);
  const [deleteTask, setDeleteTask] = useState<CampaignTask | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canManageTasks = useMemo(() => {
    if (!campaign) return false;
    return !["completed", "cancelled", "rejected"].includes(campaign.status);
  }, [campaign]);

  /* =========================
     Helpers
  ========================= */
  const formatNaira = (amount: number | null | undefined) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "—";
    return new Intl.DateTimeFormat("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  const shortId = (id: string) => id.slice(0, 8) + "…";

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const progressOf = (task: CampaignTask) => {
    if (!task.max_workers || task.max_workers <= 0) return 0;
    return Math.min(
      100,
      Math.round(((task.completed_workers || 0) / task.max_workers) * 100)
    );
  };

  /* =========================
     Fetchers
  ========================= */
  const fetchCampaign = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("campaigns")
      .select(
        `
        id, title, status, cover_image_url, reward_per_task,
        total_slots, completed_slots, total_budget, starts_at, ends_at
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Campaign not found");

    setCampaign(data);
    return data;
  }, []);

  const fetchStats = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("campaign_tasks")
      .select("status, max_workers, completed_workers, reward_amount")
      .eq("campaign_id", id);

    if (error) throw error;

    const rows = data || [];
    setStats({
      totalTasks: rows.length,
      activeTasks: rows.filter((t) => t.status === "active").length,
      completedTasks: rows.filter((t) => t.status === "completed").length,
      pendingTasks: rows.filter((t) => t.status === "pending").length,
      totalWorkers: rows.reduce((s, t) => s + Number(t.max_workers || 0), 0),
      totalCompletedWorkers: rows.reduce(
        (s, t) => s + Number(t.completed_workers || 0),
        0
      ),
      totalTaskRewards: rows.reduce(
        (s, t) => s + Number(t.reward_amount || 0),
        0
      ),
    });
  }, []);

  const fetchTasks = useCallback(
    async (id: string, pageNumber = 1) => {
      const from = (pageNumber - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("campaign_tasks")
        .select(
          `
          id, campaign_id, title, instructions, task_type, target_url,
          proof_required, reward_amount, max_workers, completed_workers,
          status, created_at, updated_at
        `,
          { count: "exact" }
        )
        .eq("campaign_id", id)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (typeFilter !== "all") {
        query = query.eq("task_type", typeFilter);
      }

      if (search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`title.ilike.${term},task_type.ilike.${term}`);
      }

      const { data, error, count } = await query.range(from, to);
      if (error) throw error;

      const taskList = (data || []) as CampaignTask[];
      setTotalCount(count ?? 0);

      // Submission counts
      const taskIds = taskList.map((t) => t.id);
      if (taskIds.length > 0) {
        const { data: subs } = await supabase
          .from("task_submissions")
          .select("task_id, status")
          .in("task_id", taskIds);

        const counts: Record<
          string,
          { total: number; pending: number; approved: number; rejected: number }
        > = {};

        (subs || []).forEach((s) => {
          if (!counts[s.task_id]) {
            counts[s.task_id] = {
              total: 0,
              pending: 0,
              approved: 0,
              rejected: 0,
            };
          }
          counts[s.task_id].total += 1;
          if (s.status === "pending") counts[s.task_id].pending += 1;
          if (s.status === "approved") counts[s.task_id].approved += 1;
          if (s.status === "rejected") counts[s.task_id].rejected += 1;
        });

        taskList.forEach((t) => {
          const c = counts[t.id];
          t.submission_count = c?.total || 0;
          t.pending_count = c?.pending || 0;
          t.approved_count = c?.approved || 0;
          t.rejected_count = c?.rejected || 0;
        });
      }

      setTasks(taskList);
      setPage(pageNumber);
    },
    [search, statusFilter, typeFilter]
  );

  const loadAll = useCallback(
    async (id: string, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        await fetchCampaign(id);
        await Promise.all([fetchStats(id), fetchTasks(id, 1)]);
      } catch (err: any) {
        console.error(err);
        setCampaign(null);
        setError(err.message || "Unable to load campaign tasks");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchCampaign, fetchStats, fetchTasks]
  );

  /* =========================
     Auth + Initial Load
  ========================= */
  useEffect(() => {
    const init = async () => {
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

        if (campaignId) {
          await loadAll(campaignId);
        } else {
          setLoading(false);
          setError("Invalid campaign ID");
        }
      } catch (err) {
        console.error(err);
        router.replace("/admin/login");
      }
    };

    init();
  }, [campaignId, loadAll, router]);

  /* Debounced filters */
  useEffect(() => {
    if (checkingAuth || !campaignId) return;

    const timer = setTimeout(() => {
      fetchTasks(campaignId, 1).catch((err) => {
        console.error(err);
        setError(err.message || "Unable to load tasks");
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [search, statusFilter, typeFilter, campaignId, checkingAuth, fetchTasks]);

  /* =========================
     Form Actions
  ========================= */
  const openCreateModal = () => {
    setEditingTask(null);
    setForm({
      ...EMPTY_FORM,
      reward_amount: campaign?.reward_per_task
        ? String(campaign.reward_per_task)
        : "",
    });
    setFormError("");
    setFormOpen(true);
  };

  const openEditModal = (task: CampaignTask) => {
    setEditingTask(task);
    setForm({
      title: task.title || "",
      instructions: task.instructions || "",
      task_type: task.task_type || "custom",
      target_url: task.target_url || "",
      reward_amount: String(task.reward_amount ?? ""),
      max_workers: String(task.max_workers ?? ""),
      proof_required: Boolean(task.proof_required),
      status: task.status || "active",
    });
    setFormError("");
    setFormOpen(true);
    setActionMenuOpen(null);
  };

  const validateForm = () => {
    if (!form.title.trim()) return "Task title is required.";
    if (!form.instructions.trim()) return "Instructions are required.";
    if (!form.reward_amount || Number(form.reward_amount) <= 0)
      return "Valid reward amount is required.";
    if (!form.max_workers || Number(form.max_workers) <= 0)
      return "Valid maximum workers is required.";
    return "";
  };

  const handleSaveTask = async () => {
    if (!campaignId) return;

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormLoading(true);
    setFormError("");

    try {
      const payload = {
        campaign_id: campaignId,
        title: form.title.trim(),
        instructions: form.instructions.trim(),
        task_type: form.task_type,
        target_url: form.target_url.trim() || null,
        proof_required: form.proof_required,
        reward_amount: Number(form.reward_amount),
        max_workers: Number(form.max_workers),
        status: form.status,
        updated_at: new Date().toISOString(),
      };

      if (editingTask) {
        const { error } = await supabase
          .from("campaign_tasks")
          .update(payload)
          .eq("id", editingTask.id);

        if (error) throw error;
        showToast("success", "Task updated successfully.");
      } else {
        const { error } = await supabase.from("campaign_tasks").insert({
          ...payload,
          completed_workers: 0,
        });

        if (error) throw error;
        showToast("success", "Task created successfully.");
      }

      setFormOpen(false);
      setEditingTask(null);
      await Promise.all([
        fetchStats(campaignId),
        fetchTasks(campaignId, page),
      ]);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Failed to save task");
    } finally {
      setFormLoading(false);
    }
  };

  const updateTaskStatus = async (task: CampaignTask, status: string) => {
    if (!campaignId) return;
    setActionMenuOpen(null);

    try {
      const { error } = await supabase
        .from("campaign_tasks")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", task.id);

      if (error) throw error;

      showToast("success", `Task ${status} successfully.`);
      await Promise.all([
        fetchStats(campaignId),
        fetchTasks(campaignId, page),
      ]);
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "Failed to update task");
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTask || !campaignId) return;
    setDeleteLoading(true);

    try {
      const { error } = await supabase
        .from("campaign_tasks")
        .delete()
        .eq("id", deleteTask.id);

      if (error) throw error;

      showToast("success", "Task deleted successfully.");
      setDeleteTask(null);
      await Promise.all([
        fetchStats(campaignId),
        fetchTasks(campaignId, page),
      ]);
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "Failed to delete task");
    } finally {
      setDeleteLoading(false);
    }
  };

  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "all" || typeFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, totalCount);

  /* =========================
     Render States
  ========================= */
  if (checkingAuth || loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FB] p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-36 animate-pulse rounded-3xl bg-slate-200" />
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
          <div className="h-80 animate-pulse rounded-3xl bg-slate-200" />
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
            Campaign not found
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {error || "The campaign you're looking for does not exist."}
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
            href={`/admin/dashboard/campaigns/${campaign.id}`}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#0b3939]"
          >
            <ArrowLeft size={16} />
            Back to Campaign
          </Link>

          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Admin / Campaigns / {campaign.title} / Tasks
          </p>

          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Campaign Tasks
              </h1>
              <p className="mt-1 text-slate-500">
                Create, manage and monitor tasks for this campaign.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => campaignId && loadAll(campaignId, true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-[#0b3939]"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>

              <button
                onClick={openCreateModal}
                disabled={!canManageTasks}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#062828] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={16} />
                Add New Task
              </button>
            </div>
          </div>
        </div>

        {/* Campaign Summary */}
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-100">
              {campaign.cover_image_url ? (
                <img
                  src={campaign.cover_image_url}
                  alt={campaign.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[#0b3939]">
                  <Megaphone size={22} />
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">
                  {campaign.title}
                </h2>
                <StatusBadge status={campaign.status} />
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
                <span>Reward: {formatNaira(campaign.reward_per_task)}</span>
                <span>
                  Slots: {campaign.completed_slots ?? 0}/{campaign.total_slots ?? 0}
                </span>
                <span>Budget: {formatNaira(campaign.total_budget)}</span>
                <span>
                  {formatDate(campaign.starts_at)} – {formatDate(campaign.ends_at)}
                </span>
              </div>
            </div>

            <Link
              href={`/admin/dashboard/campaigns/${campaign.id}`}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#0b3939] hover:text-[#0b3939]"
            >
              View Campaign
            </Link>
          </div>

          {!canManageTasks && (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This campaign is {campaign.status}. New tasks cannot be added.
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
          <StatCard label="Total Tasks" value={stats.totalTasks} />
          <StatCard label="Active" value={stats.activeTasks} />
          <StatCard label="Completed" value={stats.completedTasks} />
          <StatCard label="Pending" value={stats.pendingTasks} />
          <StatCard label="Total Workers" value={stats.totalWorkers} />
          <StatCard
            label="Completed Workers"
            value={stats.totalCompletedWorkers}
          />
          <StatCard
            label="Task Rewards"
            valueLabel={formatNaira(stats.totalTaskRewards)}
          />
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-[#0b3939]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
            >
              <option value="all">All Types</option>
              <option value="engagement">Engagement</option>
              <option value="like">Like</option>
              <option value="comment">Comment</option>
              <option value="share">Share</option>
              <option value="follow">Follow</option>
              <option value="subscribe">Subscribe</option>
              <option value="website_visit">Website Visit</option>
              <option value="custom">Custom</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600"
              >
                <X size={16} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {tasks.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {hasActiveFilters
                  ? "No tasks match your filters."
                  : "No tasks created yet"}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {hasActiveFilters
                  ? "Try adjusting your search or filters."
                  : "Create your first task for this campaign to allow workers to participate."}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="mt-6 rounded-xl bg-[#0b3939] px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Clear Filters
                </button>
              ) : (
                canManageTasks && (
                  <button
                    onClick={openCreateModal}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    <Plus size={16} />
                    Create First Task
                  </button>
                )
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Task</th>
                      <th className="px-5 py-4 font-semibold">Type</th>
                      <th className="px-5 py-4 font-semibold">Reward</th>
                      <th className="px-5 py-4 font-semibold">Workers</th>
                      <th className="px-5 py-4 font-semibold">Progress</th>
                      <th className="px-5 py-4 font-semibold">Proof</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">Created</th>
                      <th className="px-5 py-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tasks.map((task) => {
                      const pct = progressOf(task);
                      return (
                        <tr key={task.id} className="hover:bg-slate-50/80">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">
                              {task.title || "Untitled Task"}
                            </p>
                            <p className="text-xs text-slate-400">
                              ID: {shortId(task.id)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {task.submission_count ?? 0} submissions
                              {typeof task.pending_count === "number" && (
                                <> · P:{task.pending_count} A:{task.approved_count} R:{task.rejected_count}</>
                              )}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">
                              {task.task_type || "custom"}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-medium">
                            {formatNaira(task.reward_amount)}
                          </td>
                          <td className="px-5 py-4">
                            {task.completed_workers ?? 0} / {task.max_workers ?? 0}
                          </td>
                          <td className="px-5 py-4">
                            <div className="min-w-[110px]">
                              <div className="mb-1 text-xs text-slate-500">
                                {pct}%
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-[#0b3939]"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {task.proof_required ? "Required" : "Not Required"}
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={task.status || "pending"} />
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {formatDate(task.created_at)}
                          </td>
                          <td className="relative px-5 py-4">
                            <button
                              onClick={() =>
                                setActionMenuOpen(
                                  actionMenuOpen === task.id ? null : task.id
                                )
                              }
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            >
                              <MoreVertical size={18} />
                            </button>

                            {actionMenuOpen === task.id && (
                              <div className="absolute right-5 top-12 z-20 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                                <MenuItem
                                  label="View Task"
                                  onClick={() => {
                                    setViewTask(task);
                                    setActionMenuOpen(null);
                                  }}
                                />
                                {task.status !== "completed" && (
                                  <MenuItem
                                    label="Edit Task"
                                    onClick={() => openEditModal(task)}
                                  />
                                )}
                                <Link
                                  href={`/admin/dashboard/campaigns/${campaign.id}/tasks/${task.id}/submissions`}
                                  className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                                  onClick={() => setActionMenuOpen(null)}
                                >
                                  View Submissions
                                </Link>
                                {task.status === "active" && (
                                  <MenuItem
                                    label="Pause"
                                    onClick={() =>
                                      updateTaskStatus(task, "paused")
                                    }
                                  />
                                )}
                                {(task.status === "paused" ||
                                  task.status === "pending") && (
                                  <MenuItem
                                    label="Activate"
                                    onClick={() =>
                                      updateTaskStatus(task, "active")
                                    }
                                  />
                                )}
                                {task.status !== "completed" && (
                                  <MenuItem
                                    label="Delete"
                                    danger
                                    onClick={() => {
                                      setDeleteTask(task);
                                      setActionMenuOpen(null);
                                    }}
                                  />
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 px-6 py-4 sm:flex-row">
                <p className="text-sm text-slate-500">
                  Showing {showingFrom}–{showingTo} of {totalCount} tasks
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() =>
                      campaignId && fetchTasks(campaignId, page - 1)
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>
                  <span className="px-3 text-sm font-medium">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() =>
                      campaignId && fetchTasks(campaignId, page + 1)
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                {editingTask ? "Edit Task" : "Add New Task"}
              </h3>
              <button
                onClick={() => setFormOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <Field label="Task Title *">
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Like and share campaign post"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0b3939]"
                />
              </Field>

              <Field label="Instructions *">
                <textarea
                  value={form.instructions}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, instructions: e.target.value }))
                  }
                  rows={4}
                  placeholder="Visit the target URL, like the post, share it and submit proof."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0b3939]"
                />
              </Field>

              <Field label="Task Type">
                <select
                  value={form.task_type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, task_type: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                >
                  <option value="engagement">Engagement</option>
                  <option value="like">Like</option>
                  <option value="comment">Comment</option>
                  <option value="share">Share</option>
                  <option value="follow">Follow</option>
                  <option value="subscribe">Subscribe</option>
                  <option value="website_visit">Website Visit</option>
                  <option value="custom">Custom</option>
                </select>
              </Field>

              <Field label="Target URL">
                <input
                  value={form.target_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, target_url: e.target.value }))
                  }
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0b3939]"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Reward Amount *">
                  <input
                    type="number"
                    min="1"
                    value={form.reward_amount}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        reward_amount: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0b3939]"
                  />
                </Field>

                <Field label="Max Workers *">
                  <input
                    type="number"
                    min="1"
                    value={form.max_workers}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, max_workers: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0b3939]"
                  />
                </Field>
              </div>

              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </Field>

              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.proof_required}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      proof_required: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                Proof required
              </label>

              {formError && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setFormOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTask}
                  disabled={formLoading}
                  className="flex-1 rounded-xl bg-[#0b3939] py-3 text-sm font-semibold text-white hover:bg-[#062828]"
                >
                  {formLoading ? (
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  ) : editingTask ? (
                    "Update Task"
                  ) : (
                    "Create Task"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Drawer */}
      {viewTask && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
          <div className="absolute inset-0" onClick={() => setViewTask(null)} />
          <div className="relative z-50 h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
              <h3 className="text-lg font-bold">Task Details</h3>
              <button
                onClick={() => setViewTask(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-6 text-sm">
              <div>
                <h4 className="text-xl font-bold text-slate-900">
                  {viewTask.title}
                </h4>
                <p className="mt-1 text-xs text-slate-400">
                  ID: {viewTask.id}
                </p>
                <div className="mt-2">
                  <StatusBadge status={viewTask.status || "pending"} />
                </div>
              </div>

              <Info label="Type" value={viewTask.task_type || "—"} />
              <Info
                label="Reward"
                value={formatNaira(viewTask.reward_amount)}
              />
              <Info
                label="Workers"
                value={`${viewTask.completed_workers ?? 0} / ${
                  viewTask.max_workers ?? 0
                }`}
              />
              <Info
                label="Remaining"
                value={String(
                  Math.max(
                    0,
                    (viewTask.max_workers || 0) -
                      (viewTask.completed_workers || 0)
                  )
                )}
              />
              <Info
                label="Proof"
                value={viewTask.proof_required ? "Required" : "Not Required"}
              />
              <Info label="Created" value={formatDate(viewTask.created_at)} />
              <Info label="Updated" value={formatDate(viewTask.updated_at)} />

              {viewTask.target_url && (
                <div>
                  <p className="mb-1 text-slate-500">Target URL</p>
                  <a
                    href={viewTask.target_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 break-all text-[#0b3939] hover:underline"
                  >
                    {viewTask.target_url}
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}

              <div>
                <p className="mb-2 text-slate-500">Instructions</p>
                <p className="whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-slate-700">
                  {viewTask.instructions || "—"}
                </p>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-slate-500">
                  <span>Progress</span>
                  <span>{progressOf(viewTask)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#0b3939]"
                    style={{ width: `${progressOf(viewTask)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">
              Are you sure you want to delete this task?
            </h3>
            <p className="mt-3 text-sm text-slate-600">
              This action may also affect submissions associated with this task.
            </p>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setDeleteTask(null)}
                disabled={deleteLoading}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTask}
                disabled={deleteLoading}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700"
              >
                {deleteLoading ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                ) : (
                  "Delete Task"
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
    active: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    completed: "bg-blue-100 text-blue-700",
    paused: "bg-slate-100 text-slate-600",
    cancelled: "bg-red-100 text-red-700",
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

function StatCard({
  label,
  value,
  valueLabel,
}: {
  label: string;
  value?: number;
  valueLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-900">
        {valueLabel ?? value?.toLocaleString() ?? "0"}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 ${
        danger ? "text-red-600" : "text-slate-700"
      }`}
    >
      {label}
    </button>
  );
}