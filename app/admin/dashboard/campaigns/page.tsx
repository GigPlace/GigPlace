"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Loader2,
  Megaphone,
  MoreVertical,
  PlayCircle,
  RefreshCw,
  Search,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

/* =========================================================
   Types
========================================================= */

type CampaignStatus =
  | "pending"
  | "active"
  | "completed"
  | "rejected"
  | "cancelled"
  | "draft"
  | "suspended"
  | string;

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
  status: CampaignStatus;
  starts_at: string | null;
  ends_at: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  instructions: string | null;
  proof_required: boolean | null;
  advertiser_name?: string | null;
};

type Stats = {
  total: number;
  active: number;
  pending: number;
  completed: number;
  rejected: number;
  totalBudget: number;
};

type CampaignAction =
  | "approve"
  | "reject"
  | "suspend"
  | "reactivate"
  | "extend";

const PAGE_SIZE = 20;

/* =========================================================
   Page
========================================================= */

export default function AdminCampaignsPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    pending: 0,
    completed: 0,
    rejected: 0,
    totalBudget: 0,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const [confirmAction, setConfirmAction] = useState<{
    campaign: Campaign;
    action: CampaignAction;
  } | null>(null);

  const [actionLoading, setActionLoading] = useState(false);

  /* =========================================================
     Toast
  ========================================================= */

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  /* =========================================================
     Auth Guard
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const verifyAdmin = async () => {
      try {
        setCheckingAuth(true);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          if (mounted) router.replace("/admin/login");
          return;
        }

        if (!session?.user) {
          if (mounted) router.replace("/admin/login");
          return;
        }

        const user = session.user;

        const { data: adminProfile, error: adminError } = await supabase
          .from("admin_profiles")
          .select("id, role, status")
          .eq("id", user.id)
          .maybeSingle();

        if (
          adminError ||
          !adminProfile ||
          adminProfile.role !== "admin" ||
          adminProfile.status !== "approved"
        ) {
          console.error("Admin verification failed:", adminError);
          if (mounted) router.replace("/admin/login");
          return;
        }

        if (!mounted) return;

        setCheckingAuth(false);

        await Promise.all([fetchCampaigns(1), fetchStats()]);
      } catch (err) {
        console.error("Admin verification error:", err);
        if (mounted) router.replace("/admin/login");
      }
    };

    verifyAdmin();

    return () => {
      mounted = false;
    };
  }, [router]);

  /* =========================================================
     Fetch Stats
  ========================================================= */

  const fetchStats = async () => {
    try {
      const [
        totalResult,
        activeResult,
        pendingResult,
        completedResult,
        rejectedResult,
        budgetResult,
      ] = await Promise.all([
        supabase.from("campaigns").select("*", { count: "exact", head: true }),
        supabase
          .from("campaigns")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("campaigns")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("campaigns")
          .select("*", { count: "exact", head: true })
          .eq("status", "completed"),
        supabase
          .from("campaigns")
          .select("*", { count: "exact", head: true })
          .eq("status", "rejected"),
        supabase.from("campaigns").select("total_budget"),
      ]);

      if (totalResult.error) console.error("Total stats error:", totalResult.error);
      if (activeResult.error) console.error("Active stats error:", activeResult.error);
      if (pendingResult.error) console.error("Pending stats error:", pendingResult.error);
      if (completedResult.error)
        console.error("Completed stats error:", completedResult.error);
      if (rejectedResult.error)
        console.error("Rejected stats error:", rejectedResult.error);
      if (budgetResult.error) console.error("Budget stats error:", budgetResult.error);

      const totalBudget =
        budgetResult.data?.reduce(
          (sum, row) => sum + Number(row.total_budget || 0),
          0
        ) ?? 0;

      setStats({
        total: totalResult.count ?? 0,
        active: activeResult.count ?? 0,
        pending: pendingResult.count ?? 0,
        completed: completedResult.count ?? 0,
        rejected: rejectedResult.count ?? 0,
        totalBudget,
      });
    } catch (err) {
      console.error("Stats error:", err);
    }
  };

  /* =========================================================
     Fetch Campaigns
  ========================================================= */

  const fetchCampaigns = async (pageNumber = page) => {
    setLoading(true);
    setError("");

    try {
      const from = (pageNumber - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase.from("campaigns").select(
        `
          id,
          created_at,
          updated_at,
          advertiser_id,
          title,
          description,
          cover_image_url,
          target_url,
          reward_per_task,
          total_slots,
          completed_slots,
          total_budget,
          status,
          starts_at,
          ends_at,
          category_id,
          subcategory_id,
          instructions,
          proof_required
        `,
        { count: "exact" }
      );

      // Status Filter
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Date Filter
      if (dateFilter !== "all") {
        const now = new Date();
        const startDate = new Date();

        if (dateFilter === "today") {
          startDate.setHours(0, 0, 0, 0);
        }
        if (dateFilter === "7days") {
          startDate.setDate(now.getDate() - 7);
        }
        if (dateFilter === "30days") {
          startDate.setDate(now.getDate() - 30);
        }

        query = query.gte("created_at", startDate.toISOString());
      }

      // Search
      if (search.trim()) {
        const term = search.trim();
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (uuidRegex.test(term)) {
          query = query.eq("id", term);
        } else {
          query = query.ilike("title", `%${term}%`);
        }
      }

      // Sorting
      if (sortBy === "newest") {
        query = query.order("created_at", { ascending: false });
      }
      if (sortBy === "oldest") {
        query = query.order("created_at", { ascending: true });
      }
      if (sortBy === "highest_budget") {
        query = query.order("total_budget", {
          ascending: false,
          nullsFirst: false,
        });
      }
      if (sortBy === "lowest_budget") {
        query = query.order("total_budget", {
          ascending: true,
          nullsFirst: false,
        });
      }

      // Pagination
      const { data, error: fetchError, count } = await query.range(from, to);

      if (fetchError) throw fetchError;

      const rows = (data || []) as Campaign[];
      setTotalCount(count ?? 0);

      // Advertiser Names
      const advertiserIds = [
        ...new Set(rows.map((c) => c.advertiser_id).filter(Boolean)),
      ];

      let nameMap: Record<string, string> = {};

      if (advertiserIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, user_name")
          .in("id", advertiserIds);

        if (profileError) {
          console.error("Advertiser profile error:", profileError);
        }

        nameMap = (profiles || []).reduce(
          (acc, profile) => {
            acc[profile.id] =
              profile.full_name || profile.user_name || "Unknown";
            return acc;
          },
          {} as Record<string, string>
        );
      }

      // Merge Advertiser Names
      const merged = rows.map((campaign) => ({
        ...campaign,
        advertiser_name: nameMap[campaign.advertiser_id] || "Unknown",
      }));

      setCampaigns(merged);
      setPage(pageNumber);
    } catch (err: any) {
      console.error("Campaign fetch error:", err);
      setError(err?.message || "Unable to load campaigns.");
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     Filters
  ========================================================= */

  useEffect(() => {
    if (checkingAuth) return;

    const timer = setTimeout(() => {
      fetchCampaigns(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [search, statusFilter, dateFilter, sortBy]);

  /* =========================================================
     Helpers
  ========================================================= */

  const formatNaira = (amount: number | null | undefined) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Intl.DateTimeFormat("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const shortId = (id: string) => id.slice(0, 8) + "…";

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    dateFilter !== "all" ||
    sortBy !== "newest";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDateFilter("all");
    setSortBy("newest");
  };

  /* =========================================================
     Campaign Actions
  ========================================================= */

  const performCampaignAction = async (
    campaign: Campaign,
    action: CampaignAction
  ) => {
    setActionLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session?.user) {
        router.replace("/admin/login");
        throw new Error("Your admin session has expired. Please log in again.");
      }

      let rpcError: any = null;

      if (action === "approve") {
        const { error } = await supabase.rpc("admin_approve_campaign", {
          p_campaign_id: campaign.id,
        });
        rpcError = error;
      }

      if (action === "suspend") {
        const { error } = await supabase.rpc("admin_suspend_campaign", {
          p_campaign_id: campaign.id,
        });
        rpcError = error;
      }

      if (action === "reactivate") {
        const { error } = await supabase.rpc("admin_reactivate_campaign", {
          p_campaign_id: campaign.id,
        });
        rpcError = error;
      }

      // FIXED: reject branch
      if (action === "reject") {
        const { error } = await supabase.rpc("admin_reject_campaign", {
          p_campaign_id: campaign.id,
        });
        rpcError = error;
      }

      if (rpcError) throw rpcError;

      await Promise.all([fetchCampaigns(page), fetchStats()]);

      const messages: Record<CampaignAction, string> = {
        approve: "Campaign approved successfully.",
        reject: "Campaign rejected successfully.",
        suspend: "Campaign suspended successfully.",
        reactivate: "Campaign reactivated successfully.",
        extend: "Campaign extended successfully.",
      };

      showToast("success", messages[action]);
      setConfirmAction(null);
      setActionMenuOpen(null);
    } catch (err: any) {
      console.error("Campaign action error:", err);

      let message = err?.message || "Unable to complete campaign action.";

      if (message.includes("You must be authenticated")) {
        message = "Your admin session is not available. Please log in again.";
      }
      if (message.includes("Unauthorized: admin access required")) {
        message = "You are not authorized to perform this admin action.";
      }

      showToast("error", message);
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================================================
     Pagination
  ========================================================= */

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const showingFrom =
    totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const showingTo = Math.min(page * PAGE_SIZE, totalCount);

  /* =========================================================
     Status Badge
  ========================================================= */

  const StatusBadge = ({ status }: { status: CampaignStatus }) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      active: "bg-emerald-50 text-emerald-700 border-emerald-200",
      completed: "bg-blue-50 text-blue-700 border-blue-200",
      rejected: "bg-red-50 text-red-700 border-red-200",
      suspended: "bg-orange-50 text-orange-700 border-orange-200",
      cancelled: "bg-gray-50 text-gray-600 border-gray-200",
      draft: "bg-slate-50 text-slate-600 border-slate-200",
    };

    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
          styles[status] || "bg-gray-50 text-gray-600 border-gray-200"
        }`}
      >
        {status}
      </span>
    );
  };

  /* =========================================================
     Loading / Auth Guard UI
  ========================================================= */

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-gray-500">Verifying admin access…</p>
        </div>
      </div>
    );
  }

  /* =========================================================
     Main Render
  ========================================================= */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed right-4 top-4 z-50">
          <div
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage and moderate all advertiser campaigns
            </p>
          </div>
          <button
            onClick={() => {
              fetchCampaigns(page);
              fetchStats();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Megaphone className="h-4 w-4" />
              Total
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <PlayCircle className="h-4 w-4 text-emerald-600" />
              Active
            </div>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {stats.active}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock3 className="h-4 w-4 text-amber-600" />
              Pending
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {stats.pending}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              Completed
            </div>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {stats.completed}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <XCircle className="h-4 w-4 text-red-600" />
              Rejected
            </div>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {stats.rejected}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Wallet className="h-4 w-4" />
              Budget
            </div>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {formatNaira(stats.totalBudget)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title or campaign ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
              <option value="draft">Draft</option>
            </select>

            {/* Date */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest_budget">Highest budget</option>
              <option value="lowest_budget">Lowest budget</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Megaphone className="mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium">No campaigns found</p>
              <p className="mt-1 text-xs">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Campaign
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Advertiser
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Budget
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Slots
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {campaign.cover_image_url ? (
                            <img
                              src={campaign.cover_image_url}
                              alt=""
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                              <Megaphone className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="max-w-[200px] truncate text-sm font-medium text-gray-900">
                              {campaign.title}
                            </p>
                            <p className="text-xs text-gray-400">
                              {shortId(campaign.id)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {campaign.advertiser_name || "Unknown"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {formatNaira(campaign.total_budget)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {campaign.completed_slots ?? 0} /{" "}
                        {campaign.total_slots ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={campaign.status} />
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDate(campaign.created_at)}
                      </td>
                      <td className="relative px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/campaigns/${campaign.id}`}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          <div className="relative">
                            <button
                              onClick={() =>
                                setActionMenuOpen(
                                  actionMenuOpen === campaign.id
                                    ? null
                                    : campaign.id
                                )
                              }
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {actionMenuOpen === campaign.id && (
                              <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                                {campaign.status === "pending" && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setConfirmAction({
                                          campaign,
                                          action: "approve",
                                        });
                                        setActionMenuOpen(null);
                                      }}
                                      className="block w-full px-4 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => {
                                        setConfirmAction({
                                          campaign,
                                          action: "reject",
                                        });
                                        setActionMenuOpen(null);
                                      }}
                                      className="block w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}

                                {campaign.status === "active" && (
                                  <button
                                    onClick={() => {
                                      setConfirmAction({
                                        campaign,
                                        action: "suspend",
                                      });
                                      setActionMenuOpen(null);
                                    }}
                                    className="block w-full px-4 py-2 text-left text-sm text-orange-700 hover:bg-orange-50"
                                  >
                                    Suspend
                                  </button>
                                )}

                                {campaign.status === "suspended" && (
                                  <button
                                    onClick={() => {
                                      setConfirmAction({
                                        campaign,
                                        action: "reactivate",
                                      });
                                      setActionMenuOpen(null);
                                    }}
                                    className="block w-full px-4 py-2 text-left text-sm text-indigo-700 hover:bg-indigo-50"
                                  >
                                    Reactivate
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && totalCount > 0 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
              <p className="text-sm text-gray-500">
                Showing{" "}
                <span className="font-medium">{showingFrom}</span>–
                <span className="font-medium">{showingTo}</span> of{" "}
                <span className="font-medium">{totalCount}</span>
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchCampaigns(page - 1)}
                  disabled={page <= 1}
                  className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => fetchCampaigns(page + 1)}
                  disabled={page >= totalPages}
                  className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Confirm Action
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to{" "}
              <span className="font-medium capitalize">
                {confirmAction.action}
              </span>{" "}
              the campaign{" "}
              <span className="font-medium">
                “{confirmAction.campaign.title}”
              </span>
              ?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={actionLoading}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  performCampaignAction(
                    confirmAction.campaign,
                    confirmAction.action
                  )
                }
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {actionLoading && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close action menu */}
      {actionMenuOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setActionMenuOpen(null)}
        />
      )}
    </div>
  );
}