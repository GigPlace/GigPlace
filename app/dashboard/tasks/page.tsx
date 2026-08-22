"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleCheck,
  ClipboardX,
  Clock3,
  Loader2,
  Megaphone,
  RefreshCw,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Campaign = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
};

type Submission = {
  id: string;
  task_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type Task = {
  id: string;
  campaign_id: string;
  title: string;
  instructions: string;
  task_type: string;
  target_url: string | null;
  proof_required: boolean;
  reward_amount: number;
  max_workers: number;
  completed_workers: number;
  status: string;
  created_at: string;
  campaign?: Campaign | null;
  submission?: Submission | null;
};

type RewardFilter = "all" | "0-50" | "51-100" | "101-500" | "500+";
type AvailabilityFilter = "all" | "available" | "submitted";
type SortOption = "newest" | "highest" | "lowest" | "ending";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const formatNaira = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);

const isCampaignActive = (campaign?: Campaign | null) => {
  if (!campaign) return false;
  if (campaign.status !== "active") return false;

  const now = new Date();

  // Only hide if the campaign has already ended
  if (campaign.ends_at) {
    const ends = new Date(campaign.ends_at);
    if (ends < now) return false;
  }

  // Allow campaigns that start in the future
  return true;
};

const getEndsInLabel = (endsAt: string | null | undefined) => {
  if (!endsAt) return "No deadline";
  const end = new Date(endsAt);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return "Ended";
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Ends today";
  if (days === 1) return "Ends in 1 day";
  return `Ends in ${days} days`;
};

const REWARD_FILTERS = [
  { value: "all" as const, label: "All Rewards" },
  { value: "0-50" as const, label: "₦0 - ₦50" },
  { value: "51-100" as const, label: "₦51 - ₦100" },
  { value: "101-500" as const, label: "₦101 - ₦500" },
  { value: "500+" as const, label: "Above ₦500" },
];

const AVAILABILITY_FILTERS = [
  { value: "all" as const, label: "All Tasks" },
  { value: "available" as const, label: "Available" },
  { value: "submitted" as const, label: "Already Submitted" },
];

const SORT_OPTIONS = [
  { value: "newest" as const, label: "Newest First" },
  { value: "highest" as const, label: "Highest Reward" },
  { value: "lowest" as const, label: "Lowest Reward" },
  { value: "ending" as const, label: "Ending Soon" },
];

const PAGE_SIZE = 9;

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function FindTasksSection() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [taskType, setTaskType] = useState("All Task Types");
  const [rewardFilter, setRewardFilter] = useState<RewardFilter>("all");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);

  /* -------------------- Load Tasks -------------------- */

  const loadTasks = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        setUserId(user.id);

        const { data: taskData, error: taskError } = await supabase
          .from("campaign_tasks")
          .select(
            `
            id,
            campaign_id,
            title,
            instructions,
            task_type,
            target_url,
            proof_required,
            reward_amount,
            max_workers,
            completed_workers,
            status,
            created_at,
            campaigns (
              id,
              title,
              description,
              cover_image_url,
              status,
              starts_at,
              ends_at
            )
          `
          )
          .eq("status", "active")
          .order("created_at", { ascending: false });

        // Debug logs – remove later
        console.log("Raw taskData:", taskData);
        console.log("Task error:", taskError);

        if (taskError) throw taskError;

        const { data: submissions, error: subError } = await supabase
          .from("task_submissions")
          .select("id, task_id, status, created_at")
          .eq("worker_id", user.id);

        if (subError) throw subError;

        const submittedMap = new Map(
          (submissions ?? []).map((s: any) => [s.task_id, s as Submission])
        );

        const enriched: Task[] = (taskData ?? [])
          .map((t: any) => {
            const campaign = Array.isArray(t.campaigns)
              ? t.campaigns[0]
              : t.campaigns;

            return {
              ...t,
              reward_amount: Number(t.reward_amount ?? 0),
              max_workers: Number(t.max_workers ?? 0),
              completed_workers: Number(t.completed_workers ?? 0),
              campaign: campaign ?? null,
              submission: submittedMap.get(t.id) ?? null,
            } as Task;
          })
          .filter((t) => isCampaignActive(t.campaign));

        console.log("Enriched & filtered tasks:", enriched);

        setTasks(enriched);
      } catch (err: any) {
        console.error("Load tasks error:", err);
        setError(err?.message ?? "Failed to load tasks");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  /* -------------------- Realtime -------------------- */

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("customer-find-tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaign_tasks" },
        () => loadTasks(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaigns" },
        () => loadTasks(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_submissions",
          filter: `worker_id=eq.${userId}`,
        },
        () => loadTasks(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadTasks]);

  /* -------------------- Stats & Filters -------------------- */

  const availableTasks = useMemo(
    () => tasks.filter((t) => !t.submission),
    [tasks]
  );

  const stats = useMemo(() => {
    const totalPotential = availableTasks.reduce(
      (sum, t) => sum + (t.reward_amount || 0),
      0
    );
    const inProgress = tasks.filter(
      (t) => t.submission?.status === "pending"
    ).length;
    const completed = tasks.filter(
      (t) => t.submission?.status === "approved"
    ).length;

    return {
      available: availableTasks.length,
      totalPotential,
      inProgress,
      completed,
    };
  }, [tasks, availableTasks]);

  const dynamicTaskTypes = useMemo(() => {
    const set = new Set(tasks.map((t) => t.task_type).filter(Boolean));
    return ["All Task Types", ...Array.from(set).sort()];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let list = [...tasks];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.instructions?.toLowerCase().includes(q) ||
          t.task_type?.toLowerCase().includes(q) ||
          t.campaign?.title?.toLowerCase().includes(q)
      );
    }

    if (taskType !== "All Task Types") {
      list = list.filter(
        (t) => t.task_type?.toLowerCase() === taskType.toLowerCase()
      );
    }

    if (rewardFilter !== "all") {
      list = list.filter((t) => {
        const r = t.reward_amount || 0;
        if (rewardFilter === "0-50") return r >= 0 && r <= 50;
        if (rewardFilter === "51-100") return r >= 51 && r <= 100;
        if (rewardFilter === "101-500") return r >= 101 && r <= 500;
        if (rewardFilter === "500+") return r > 500;
        return true;
      });
    }

    if (availability === "available") {
      list = list.filter((t) => !t.submission);
    } else if (availability === "submitted") {
      list = list.filter((t) => !!t.submission);
    }

    list.sort((a, b) => {
      if (sort === "newest") {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      if (sort === "highest")
        return (b.reward_amount || 0) - (a.reward_amount || 0);
      if (sort === "lowest")
        return (a.reward_amount || 0) - (b.reward_amount || 0);

      const aEnd = a.campaign?.ends_at
        ? new Date(a.campaign.ends_at).getTime()
        : Infinity;
      const bEnd = b.campaign?.ends_at
        ? new Date(b.campaign.ends_at).getTime()
        : Infinity;
      return aEnd - bEnd;
    });

    return list;
  }, [tasks, search, taskType, rewardFilter, availability, sort]);

  useEffect(() => {
    setPage(1);
  }, [search, taskType, rewardFilter, availability, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const paginatedTasks = filteredTasks.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const clearFilters = () => {
    setSearch("");
    setTaskType("All Task Types");
    setRewardFilter("all");
    setAvailability("all");
    setSort("newest");
    setPage(1);
  };

  const renderSubmissionBadge = (submission: Submission) => {
    if (submission.status === "pending") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
          Submission Pending
        </span>
      );
    }
    if (submission.status === "approved") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          Task Completed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
        Submission Rejected
      </span>
    );
  };

  /* -------------------- UI -------------------- */

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#0b3939]" />
        <p className="text-sm font-medium text-slate-500">
          Finding available tasks...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">
          Unable to load tasks
        </h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <button
          onClick={() => loadTasks()}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0b3939]/90"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-[#0b3939]/80">
            GigPlace Tasks
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Find Tasks
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Discover available tasks, complete them, and earn rewards for every
            verified submission.
          </p>
        </div>

        <button
          onClick={() => loadTasks(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing..." : "Refresh Tasks"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b3939]/10">
            <BriefcaseBusiness className="h-5 w-5 text-[#0b3939]" />
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">
            {stats.available}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            Available Tasks
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <Wallet className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">
            {formatNaira(stats.totalPotential)}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            Total Potential Earnings
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
            <Clock3 className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">
            {stats.inProgress}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">In Progress</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">
            {stats.completed}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            Completed Tasks
          </p>
        </div>
      </div>

      {/* Main Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Available Tasks
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Browse tasks from active campaigns and start earning.
            </p>
          </div>
          <p className="text-sm font-medium text-slate-600">
            {filteredTasks.length} task
            {filteredTasks.length !== 1 ? "s" : ""} available
          </p>
        </div>

        {/* Filters */}
        <div className="space-y-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks, campaigns or task types..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm focus:border-[#0b3939] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b3939]/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
            >
              {dynamicTaskTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={rewardFilter}
              onChange={(e) => setRewardFilter(e.target.value as RewardFilter)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
            >
              {REWARD_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>

            <select
              value={availability}
              onChange={(e) =>
                setAvailability(e.target.value as AvailabilityFilter)
              }
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
            >
              {AVAILABILITY_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            {(search ||
              taskType !== "All Task Types" ||
              rewardFilter !== "all" ||
              availability !== "all" ||
              sort !== "newest") && (
              <button
                onClick={clearFilters}
                className="text-sm font-medium text-[#0b3939] hover:underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Task Grid */}
        <div className="p-5 sm:p-6">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardX className="mb-4 h-12 w-12 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-900">
                No tasks available right now
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Please check back later.
              </p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="mb-4 h-12 w-12 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-900">
                No matching tasks found
              </h3>
              <button
                onClick={clearFilters}
                className="mt-4 text-sm font-medium text-[#0b3939] hover:underline"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {paginatedTasks.map((task) => {
                  const remaining =
                    (task.max_workers || 0) - (task.completed_workers || 0);
                  const isFull = remaining <= 0;
                  const progress =
                    task.max_workers > 0
                      ? Math.min(
                          100,
                          (task.completed_workers / task.max_workers) * 100
                        )
                      : 0;

                  return (
                    <div
                      key={task.id}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    >
                      {/* Cover */}
                      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-[#0b3939] to-[#0f4c4c]">
                        {task.campaign?.cover_image_url ? (
                          <img
                            src={task.campaign.cover_image_url}
                            alt={task.campaign.title}
                            className="h-full w-full object-cover transition group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Megaphone className="h-12 w-12 text-white/40" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col p-5">
                        <h3 className="line-clamp-2 text-base font-semibold text-slate-900">
                          {task.title}
                        </h3>

                        <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                          <Megaphone className="h-3.5 w-3.5" />
                          <span className="truncate">
                            {task.campaign?.title ?? "Unknown Campaign"}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                            {task.task_type || "Other"}
                          </span>
                          {task.proof_required ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                              <ShieldCheck className="h-3 w-3" /> Proof Required
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                              <CircleCheck className="h-3 w-3" /> No Proof
                            </span>
                          )}
                        </div>

                        <div className="mt-4 rounded-xl bg-[#0b3939]/5 px-4 py-3">
                          <p className="text-xs text-slate-500">Reward</p>
                          <p className="text-xl font-bold text-[#0b3939]">
                            {formatNaira(task.reward_amount)}
                          </p>
                        </div>

                        <div className="mt-4">
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>
                              {isFull
                                ? "Task Full"
                                : `${remaining} slots left`}
                            </span>
                            <span>
                              {task.completed_workers}/{task.max_workers}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                isFull ? "bg-red-400" : "bg-[#0b3939]"
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {getEndsInLabel(task.campaign?.ends_at)}
                        </div>

                        {task.submission && (
                          <div className="mt-3">
                            {renderSubmissionBadge(task.submission)}
                          </div>
                        )}

                        <div className="mt-5">
                          {isFull && !task.submission ? (
                            <button
                              disabled
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm text-slate-400"
                            >
                              Task Full
                            </button>
                          ) : task.submission ? (
                            <Link
                              href={`/dashboard/submissions/${task.submission.id}`}
                              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              View Submission
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          ) : (
                            <Link
                              href={`/dashboard/tasks/${task.id}`}
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b3939] py-2.5 text-sm font-medium text-white hover:bg-[#0b3939]/90"
                            >
                              View Task
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}