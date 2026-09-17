"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Loader2,
  RefreshCw,
  Search,
  Wallet,
  X,
  XCircle,
  CheckCircle2,
  Clock3,
  Banknote,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Transaction,
  Wallet as WalletType,
  PAGE_SIZE,
  formatNaira,
  formatDateTime,
  formatDate,
  getInitials,
  statusBadgeClass,
  directionBadgeClass,
  ProfileLite,
} from "@/lib/payments";

export default function AdminPaymentsPage() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [txResult, walletsResult, profilesResult] = await Promise.all([
        supabase
          .from("transactions")
          .select(
            `
            id,
            user_id,
            transaction_type,
            amount,
            direction,
            status,
            submission_id,
            campaign_id,
            reference,
            description,
            created_at,
            updated_at
          `
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("wallets")
          .select(
            `
            id,
            user_id,
            available_balance,
            pending_balance,
            total_earned,
            total_withdrawn,
            created_at,
            updated_at
          `
          ),
        supabase.from("profiles").select("id, full_name, user_name, email"),
      ]);

      if (txResult.error) throw txResult.error;
      if (walletsResult.error) throw walletsResult.error;
      if (profilesResult.error) throw profilesResult.error;

      const profiles = (profilesResult.data || []) as ProfileLite[];
      const profileMap = new Map(profiles.map((p) => [p.id, p]));

      const mapped: Transaction[] = (txResult.data || []).map((tx) => ({
        ...tx,
        amount: Number(tx.amount ?? 0),
        user: profileMap.get(tx.user_id),
      }));

      const mappedWallets: WalletType[] = (walletsResult.data || []).map((w) => ({
        ...w,
        available_balance: Number(w.available_balance ?? 0),
        pending_balance: Number(w.pending_balance ?? 0),
        total_earned: Number(w.total_earned ?? 0),
        total_withdrawn: Number(w.total_withdrawn ?? 0),
      }));

      setTransactions(mapped);
      setWallets(mappedWallets);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to load payment data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Unique filter options from real data
  const typeOptions = useMemo(() => {
    const set = new Set(transactions.map((t) => t.transaction_type).filter(Boolean));
    return Array.from(set).sort();
  }, [transactions]);

  const statusOptions = useMemo(() => {
    const set = new Set(transactions.map((t) => t.status).filter(Boolean));
    return Array.from(set).sort();
  }, [transactions]);

  const directionOptions = useMemo(() => {
    const set = new Set(transactions.map((t) => t.direction).filter(Boolean));
    return Array.from(set).sort();
  }, [transactions]);

  // Stats
  const stats = useMemo(() => {
    const total = transactions.length;
    const completed = transactions.filter((t) =>
      ["completed", "success", "successful"].includes(t.status?.toLowerCase())
    ).length;
    const pending = transactions.filter((t) =>
      ["pending", "processing"].includes(t.status?.toLowerCase())
    ).length;
    const failed = transactions.filter((t) =>
      ["failed", "rejected", "cancelled"].includes(t.status?.toLowerCase())
    ).length;

    const totalAvailable = wallets.reduce((sum, w) => sum + w.available_balance, 0);
    const totalWithdrawn = wallets.reduce((sum, w) => sum + w.total_withdrawn, 0);

    return {
      total,
      completed,
      pending,
      failed,
      totalAvailable,
      totalWithdrawn,
    };
  }, [transactions, wallets]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return transactions.filter((tx) => {
      const userName = tx.user?.full_name || "";
      const userHandle = tx.user?.user_name || "";
      const userEmail = tx.user?.email || "";

      const matchesSearch =
        !q ||
        (tx.reference || "").toLowerCase().includes(q) ||
        (tx.description || "").toLowerCase().includes(q) ||
        (tx.transaction_type || "").toLowerCase().includes(q) ||
        (tx.id || "").toLowerCase().includes(q) ||
        userName.toLowerCase().includes(q) ||
        userHandle.toLowerCase().includes(q) ||
        userEmail.toLowerCase().includes(q);

      const matchesType =
        typeFilter === "all" || tx.transaction_type === typeFilter;
      const matchesStatus =
        statusFilter === "all" || tx.status === statusFilter;
      const matchesDirection =
        directionFilter === "all" || tx.direction === directionFilter;

      return matchesSearch && matchesType && matchesStatus && matchesDirection;
    });
  }, [transactions, searchQuery, typeFilter, statusFilter, directionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const recent = useMemo(() => transactions.slice(0, 8), [transactions]);

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
    setDirectionFilter("all");
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0b3939]">
            Finance
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Payments
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor financial activity across GigPlace.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-800">Error</p>
              <p className="mt-0.5 text-sm text-red-700">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadData(true)}
            className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 shadow-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards — compact */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          {
            label: "Total Transactions",
            value: stats.total.toLocaleString(),
            icon: CreditCard,
            style: "bg-blue-50 text-blue-600",
          },
          {
            label: "Completed",
            value: stats.completed.toLocaleString(),
            icon: CheckCircle2,
            style: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Pending",
            value: stats.pending.toLocaleString(),
            icon: Clock3,
            style: "bg-amber-50 text-amber-600",
          },
          {
            label: "Failed",
            value: stats.failed.toLocaleString(),
            icon: XCircle,
            style: "bg-red-50 text-red-600",
          },
          {
            label: "Wallet Balance",
            value: formatNaira(stats.totalAvailable),
            icon: Wallet,
            style: "bg-[#0b3939]/10 text-[#0b3939]",
          },
          {
            label: "Total Withdrawn",
            value: formatNaira(stats.totalWithdrawn),
            icon: Banknote,
            style: "bg-violet-50 text-violet-600",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">{card.label}</p>
                  <p className="mt-1.5 truncate text-base font-bold text-slate-900 sm:text-lg">
                    {card.value}
                  </p>
                </div>
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${card.style}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Wallet Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Wallet Summary</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Aggregated balances across all user wallets.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Available Balance",
              value: formatNaira(
                wallets.reduce((s, w) => s + w.available_balance, 0)
              ),
            },
            {
              label: "Pending Balance",
              value: formatNaira(
                wallets.reduce((s, w) => s + w.pending_balance, 0)
              ),
            },
            {
              label: "Total Earned",
              value: formatNaira(
                wallets.reduce((s, w) => s + w.total_earned, 0)
              ),
            },
            {
              label: "Total Withdrawn",
              value: formatNaira(
                wallets.reduce((s, w) => s + w.total_withdrawn, 0)
              ),
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5"
            >
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions Section */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Payment Transactions
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Monitor financial transactions across GigPlace.
              </p>
            </div>
            <span className="mt-2 inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 sm:mt-0">
              {filtered.length} record{filtered.length === 1 ? "" : "s"}
            </span>
          </div>

          {/* Filters */}
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search reference, user, type..."
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#0b3939] focus:ring-2 focus:ring-[#0b3939]/10"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="all">All Types</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="all">All Statuses</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={directionFilter}
              onChange={(e) => {
                setDirectionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="all">All Directions</option>
              {directionOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {(searchQuery || typeFilter !== "all" || statusFilter !== "all" || directionFilter !== "all") && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <CreditCard className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-sm font-semibold text-slate-700">
              No payment transactions found.
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Transactions will appear here when payment activity occurs.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    {[
                      "Reference",
                      "User",
                      "Type",
                      "Amount",
                      "Direction",
                      "Status",
                      "Date",
                      "Action",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((tx) => {
                    const name =
                      tx.user?.full_name ||
                      tx.user?.user_name ||
                      tx.user?.email ||
                      "Unknown";
                    return (
                      <tr
                        key={tx.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-3">
                          <p className="max-w-[140px] truncate text-sm font-medium text-slate-800">
                            {tx.reference || tx.id.slice(0, 8)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0b3939]/10 text-[10px] font-bold text-[#0b3939]">
                              {getInitials(name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-800">
                                {name}
                              </p>
                              <p className="truncate text-xs text-slate-400">
                                {tx.user?.user_name
                                  ? `@${tx.user.user_name}`
                                  : tx.user?.email || "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm capitalize text-slate-700">
                            {tx.transaction_type || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold text-slate-900">
                            {formatNaira(tx.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${directionBadgeClass(
                              tx.direction
                            )}`}
                          >
                            {tx.direction?.toLowerCase() === "credit" ||
                            tx.direction?.toLowerCase() === "in" ? (
                              <ArrowDownLeft className="h-3 w-3" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3" />
                            )}
                            {tx.direction || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${statusBadgeClass(
                              tx.status
                            )}`}
                          >
                            {tx.status || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700">
                            {formatDate(tx.created_at)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatDateTime(tx.created_at).split(",").pop()?.trim()}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => router.push(`/admin/dashboard/payments/${tx.id}`)}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#0b3939] hover:bg-[#0b3939]/5"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 p-3 md:hidden">
              {paginated.map((tx) => {
                const name =
                  tx.user?.full_name ||
                  tx.user?.user_name ||
                  tx.user?.email ||
                  "Unknown";
                return (
                  <div
                    key={tx.id}
                    className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {tx.reference || tx.id.slice(0, 10)}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {name}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${statusBadgeClass(
                          tx.status
                        )}`}
                      >
                        {tx.status}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-base font-bold text-slate-900">
                        {formatNaira(tx.amount)}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${directionBadgeClass(
                          tx.direction
                        )}`}
                      >
                        {tx.direction}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
                      <span className="capitalize">{tx.transaction_type || "—"}</span>
                      <span>{formatDate(tx.created_at)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => router.push(`/admin/dashboard/payments/${tx.id}`)}
                      className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-sm font-semibold text-[#0b3939] hover:bg-slate-50"
                    >
                      View details
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {filtered.length > PAGE_SIZE && (
              <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(currentPage * PAGE_SIZE, filtered.length)} of{" "}
                  {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-sm font-medium text-slate-600">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Recent Activity */}
      {recent.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">
            Recent Payment Activity
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Latest transactions across the platform.
          </p>
          <div className="mt-3 divide-y divide-slate-100">
            {recent.map((tx) => (
              <button
                key={tx.id}
                type="button"
                onClick={() => router.push(`/admin/dashboard/payments/${tx.id}`)}
                className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-slate-50/80"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {tx.transaction_type || "Transaction"}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {tx.reference || tx.id.slice(0, 8)} · {formatDate(tx.created_at)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatNaira(tx.amount)}
                  </p>
                  <span
                    className={`mt-0.5 inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold capitalize ${statusBadgeClass(
                      tx.status
                    )}`}
                  >
                    {tx.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}