"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  MoreVertical,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* =========================
   Types
========================= */
type UserRole = "worker" | "advertiser" | "admin" | string;
type UserStatus = "active" | "pending" | "suspended" | "blocked" | string;

type ProfileRow = {
  id: string;
  full_name: string | null;
  user_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole | null;
  status: UserStatus | null;
  nationality?: string | null;
  state?: string | null;
  lga?: string | null;
  avatar_url?: string | null;
  created_at: string;
};

type WalletRow = {
  user_id: string;
  available_balance: number | null;
  pending_balance: number | null;
  total_earned: number | null;
  total_withdrawn: number | null;
};

type UserWithWallet = ProfileRow & {
  wallet?: WalletRow | null;
  campaigns_count?: number;
  submissions_count?: number;
  approved_count?: number;
  rejected_count?: number;
};

type Stats = {
  total: number;
  active: number;
  pending: number;
  suspended: number;
};

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [users, setUsers] = useState<UserWithWallet[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    pending: 0,
    suspended: 0,
  });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedUser, setSelectedUser] = useState<UserWithWallet | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    user: UserWithWallet;
    action: "suspend" | "activate" | "block";
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  /* =========================
     Auth Guard (admin_profiles)
  ========================= */
  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/admin/login");
          return;
        }

        const { data: adminProfile, error: adminError } = await supabase
          .from("admin_profiles")
          .select("id, role, status")
          .eq("id", user.id)
          .single();

        if (adminError || !adminProfile) {
          console.error("Admin profile error:", adminError);
          router.replace("/admin/login");
          return;
        }

        if (
          adminProfile.role !== "admin" ||
          adminProfile.status !== "approved"
        ) {
          router.replace("/");
          return;
        }

        setCheckingAuth(false);
        fetchUsers(1);
        fetchStats();
      } catch (err) {
        console.error(err);
        router.replace("/admin/login");
      }
    };

    verifyAdmin();
  }, [router]);

  /* =========================
     Fetch Stats
  ========================= */
  const fetchStats = async () => {
    try {
      const [
        { count: total },
        { count: active },
        { count: pending },
        { count: suspended },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .in("status", ["suspended", "blocked"]),
      ]);

      setStats({
        total: total ?? 0,
        active: active ?? 0,
        pending: pending ?? 0,
        suspended: suspended ?? 0,
      });
    } catch (err) {
      console.error("Stats error:", err);
    }
  };

  /* =========================
     Fetch Users
  ========================= */
  const fetchUsers = async (pageNumber = page) => {
    setLoading(true);
    setError("");

    try {
      const from = (pageNumber - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("profiles")
        .select(
          "id, full_name, user_name, email, phone, role, status, nationality, state, lga, avatar_url, created_at",
          { count: "exact" }
        )
        .order("created_at", { ascending: false });

      if (roleFilter !== "all") {
        query = query.eq("role", roleFilter);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (dateFilter !== "all") {
        const now = new Date();
        let startDate = new Date();

        if (dateFilter === "today") {
          startDate.setHours(0, 0, 0, 0);
        } else if (dateFilter === "week") {
          startDate.setDate(now.getDate() - 7);
        } else if (dateFilter === "month") {
          startDate.setMonth(now.getMonth() - 1);
        }

        query = query.gte("created_at", startDate.toISOString());
      }

      if (search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(
          `full_name.ilike.${term},user_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`
        );
      }

      const { data, error: fetchError, count } = await query.range(from, to);

      if (fetchError) throw fetchError;

      const profiles = (data || []) as ProfileRow[];
      setTotalCount(count ?? 0);

      const userIds = profiles.map((u) => u.id);
      let walletsMap: Record<string, WalletRow> = {};

      if (userIds.length > 0) {
        const { data: wallets } = await supabase
          .from("wallets")
          .select(
            "user_id, available_balance, pending_balance, total_earned, total_withdrawn"
          )
          .in("user_id", userIds);

        walletsMap = (wallets || []).reduce((acc, w) => {
          acc[w.user_id] = w;
          return acc;
        }, {} as Record<string, WalletRow>);
      }

      const merged = profiles.map((p) => ({
        ...p,
        wallet: walletsMap[p.id] || null,
      }));

      setUsers(merged);
      setPage(pageNumber);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to load users");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     Debounced Filters
  ========================= */
  useEffect(() => {
    if (checkingAuth) return;

    const timer = setTimeout(() => {
      fetchUsers(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [search, roleFilter, statusFilter, dateFilter]);

  /* =========================
     Helpers
  ========================= */
  const formatNaira = (amount: number | null | undefined) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    roleFilter !== "all" ||
    statusFilter !== "all" ||
    dateFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setDateFilter("all");
  };

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  /* =========================
     Actions
  ========================= */
  const updateUserStatus = async (
    user: UserWithWallet,
    newStatus: "active" | "suspended" | "blocked"
  ) => {
    setActionLoading(true);
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );

      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...selectedUser, status: newStatus });
      }

      fetchStats();

      const messages = {
        active: "User activated successfully.",
        suspended: "User suspended successfully.",
        blocked: "User blocked successfully.",
      };

      showToast("success", messages[newStatus]);
      setConfirmAction(null);
      setActionMenuOpen(null);
    } catch (err: any) {
      showToast("error", err.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const openProfile = async (user: UserWithWallet) => {
    setSelectedUser(user);
    setDrawerOpen(true);
    setActionMenuOpen(null);

    try {
      const [
        { count: campaigns },
        { count: submissions },
        { count: approved },
        { count: rejected },
      ] = await Promise.all([
        supabase
          .from("campaigns")
          .select("*", { count: "exact", head: true })
          .eq("advertiser_id", user.id),
        supabase
          .from("task_completions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("task_completions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "approved"),
        supabase
          .from("task_completions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "rejected"),
      ]);

      setSelectedUser((prev) =>
        prev
          ? {
              ...prev,
              campaigns_count: campaigns ?? 0,
              submissions_count: submissions ?? 0,
              approved_count: approved ?? 0,
              rejected_count: rejected ?? 0,
            }
          : prev
      );
    } catch {
      // optional
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, totalCount);

  if (checkingAuth) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#0b3939]" />
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

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Users</h1>
          <p className="mt-1 text-slate-500">
            Manage and monitor all registered GigPlace users.
          </p>
        </div>

        <button
          onClick={() => {
            fetchUsers(page);
            fetchStats();
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[#0b3939] hover:text-[#0b3939]"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          label="Total Users"
          value={stats.total}
          description="All registered accounts"
          icon={<Users className="h-5 w-5" />}
          color="bg-[#0b3939]/10 text-[#0b3939]"
        />
        <StatsCard
          label="Active Users"
          value={stats.active}
          description="Currently active"
          icon={<UserCheck className="h-5 w-5" />}
          color="bg-emerald-100 text-emerald-700"
        />
        <StatsCard
          label="Pending Users"
          value={stats.pending}
          description="Awaiting approval"
          icon={<AlertCircle className="h-5 w-5" />}
          color="bg-amber-100 text-amber-700"
        />
        <StatsCard
          label="Suspended / Blocked"
          value={stats.suspended}
          description="Restricted accounts"
          icon={<UserX className="h-5 w-5" />}
          color="bg-red-100 text-red-700"
        />
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by name, email or phone..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#0b3939] focus:ring-4 focus:ring-[#0b3939]/10"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0b3939]"
            >
              <option value="all">All Roles</option>
              <option value="worker">Worker</option>
              <option value="advertiser">Advertiser</option>
              <option value="admin">Admin</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0b3939]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="blocked">Blocked</option>
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0b3939]"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:border-red-300 hover:text-red-600"
            >
              <X size={16} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Unable to load users</p>
            <p className="mt-1 text-sm">{error}</p>
            <button
              onClick={() => fetchUsers(page)}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-4 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Users className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              No users found
            </h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              There are no users matching your current search or filters.
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-6 rounded-xl bg-[#0b3939] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">User</th>
                    <th className="px-6 py-4 font-semibold">Email</th>
                    <th className="px-6 py-4 font-semibold">Phone</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Wallet</th>
                    <th className="px-6 py-4 font-semibold">Joined</th>
                    <th className="px-6 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0b3939] text-sm font-bold text-white">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.full_name || "User"}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              getInitials(user.full_name)
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {user.full_name || "Unnamed User"}
                            </p>
                            <p className="text-xs text-slate-500">
                              @{user.user_name || "unknown"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {user.email || "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {user.phone || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {formatNaira(user.wallet?.available_balance)}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="relative px-6 py-4">
                        <button
                          onClick={() =>
                            setActionMenuOpen(
                              actionMenuOpen === user.id ? null : user.id
                            )
                          }
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#0b3939]"
                        >
                          <MoreVertical size={18} />
                        </button>

                        {actionMenuOpen === user.id && (
                          <div className="absolute right-6 top-12 z-20 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                            <ActionItem
                              icon={<Eye size={15} />}
                              label="View Profile"
                              onClick={() => openProfile(user)}
                            />
                            {user.status !== "active" && (
                              <ActionItem
                                icon={<CheckCircle2 size={15} />}
                                label="Activate User"
                                onClick={() =>
                                  setConfirmAction({
                                    user,
                                    action: "activate",
                                  })
                                }
                              />
                            )}
                            {user.status === "active" && (
                              <ActionItem
                                icon={<Ban size={15} />}
                                label="Suspend User"
                                danger
                                onClick={() =>
                                  setConfirmAction({
                                    user,
                                    action: "suspend",
                                  })
                                }
                              />
                            )}
                            {user.status !== "blocked" && (
                              <ActionItem
                                icon={<UserX size={15} />}
                                label="Block User"
                                danger
                                onClick={() =>
                                  setConfirmAction({
                                    user,
                                    action: "block",
                                  })
                                }
                              />
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 px-6 py-4 sm:flex-row">
              <p className="text-sm text-slate-500">
                Showing {showingFrom}–{showingTo} of {totalCount} users
              </p>

              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => fetchUsers(page - 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <span className="px-3 text-sm font-medium text-slate-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => fetchUsers(page + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Profile Drawer */}
      {drawerOpen && selectedUser && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
          <div
            className="absolute inset-0"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative z-50 h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">User Profile</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-8 p-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#0b3939] text-2xl font-bold text-white">
                  {selectedUser.avatar_url ? (
                    <img
                      src={selectedUser.avatar_url}
                      alt=""
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    getInitials(selectedUser.full_name)
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {selectedUser.full_name || "Unnamed User"}
                </h3>
                <p className="text-sm text-slate-500">
                  @{selectedUser.user_name || "unknown"}
                </p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <RoleBadge role={selectedUser.role} />
                  <StatusBadge status={selectedUser.status} />
                </div>
              </div>

              <Section title="Profile Details">
                <InfoRow label="Email" value={selectedUser.email || "—"} />
                <InfoRow label="Phone" value={selectedUser.phone || "—"} />
                <InfoRow
                  label="Nationality"
                  value={selectedUser.nationality || "—"}
                />
                <InfoRow label="State" value={selectedUser.state || "—"} />
                <InfoRow label="LGA" value={selectedUser.lga || "—"} />
                <InfoRow
                  label="Joined"
                  value={formatDate(selectedUser.created_at)}
                />
              </Section>

              <Section title="Wallet">
                <InfoRow
                  label="Available"
                  value={formatNaira(selectedUser.wallet?.available_balance)}
                />
                <InfoRow
                  label="Pending"
                  value={formatNaira(selectedUser.wallet?.pending_balance)}
                />
                <InfoRow
                  label="Total Earned"
                  value={formatNaira(selectedUser.wallet?.total_earned)}
                />
                <InfoRow
                  label="Total Withdrawn"
                  value={formatNaira(selectedUser.wallet?.total_withdrawn)}
                />
              </Section>

              <Section title="Activity">
                <InfoRow
                  label="Campaigns"
                  value={String(selectedUser.campaigns_count ?? 0)}
                />
                <InfoRow
                  label="Submissions"
                  value={String(selectedUser.submissions_count ?? 0)}
                />
                <InfoRow
                  label="Approved"
                  value={String(selectedUser.approved_count ?? 0)}
                />
                <InfoRow
                  label="Rejected"
                  value={String(selectedUser.rejected_count ?? 0)}
                />
              </Section>

              <button
                onClick={() => setDrawerOpen(false)}
                className="w-full rounded-xl bg-[#0b3939] py-3 text-sm font-semibold text-white hover:bg-[#062828]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">
              {confirmAction.action === "activate" && "Activate User?"}
              {confirmAction.action === "suspend" && "Suspend User?"}
              {confirmAction.action === "block" && "Block User?"}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {confirmAction.action === "activate" &&
                "This will restore full access to the platform for this user."}
              {confirmAction.action === "suspend" &&
                "The user will temporarily lose access until reactivated."}
              {confirmAction.action === "block" &&
                "The user will be restricted from accessing the platform."}
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
                  updateUserStatus(
                    confirmAction.user,
                    confirmAction.action === "activate"
                      ? "active"
                      : confirmAction.action === "suspend"
                      ? "suspended"
                      : "blocked"
                  )
                }
                disabled={actionLoading}
                className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white ${
                  confirmAction.action === "activate"
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
   Small Components
========================= */
function StatsCard({
  label,
  value,
  description,
  icon,
  color,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
        <div className={`rounded-xl p-3 ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    suspended: "bg-red-100 text-red-700",
    blocked: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
        map[status || ""] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "unknown"}
    </span>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  const map: Record<string, string> = {
    admin: "bg-purple-100 text-purple-700",
    advertiser: "bg-[#0b3939]/10 text-[#0b3939]",
    worker: "bg-blue-100 text-blue-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
        map[role || ""] || "bg-slate-100 text-slate-600"
      }`}
    >
      {role || "user"}
    </span>
  );
}

function ActionItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 ${
        danger ? "text-red-600" : "text-slate-700"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h4>
      <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}