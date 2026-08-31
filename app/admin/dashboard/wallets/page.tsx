"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  Wallet,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type WalletRow = {
  id: string;
  user_id: string;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
  created_at: string | null;
  updated_at: string | null;
  full_name?: string | null;
  user_name?: string | null;
  email?: string | null;
};

type TransactionRow = {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  direction: "credit" | "debit" | string;
  status: string | null;
  submission_id: string | null;
  campaign_id: string | null;
  reference: string | null;
  description: string | null;
  created_at: string;
  updated_at: string | null;
  full_name?: string | null;
  user_name?: string | null;
};

type Stats = {
  totalAvailable: number;
  totalPending: number;
  totalEarned: number;
  totalWithdrawn: number;
  walletCount: number;
  txCount: number;
};

const PAGE_SIZE = 15;

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
  }).format(new Date(date));
};

const formatTime = (date: string) =>
  new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));

const getInitials = (name?: string | null) => {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
};

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AdminWalletPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalAvailable: 0,
    totalPending: 0,
    totalEarned: 0,
    totalWithdrawn: 0,
    walletCount: 0,
    txCount: 0,
  });

  const [tab, setTab] = useState<"wallets" | "transactions">("wallets");
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [walletsRes, txRes, profilesRes] = await Promise.all([
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
          )
          .order("available_balance", { ascending: false }),
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
          .order("created_at", { ascending: false })
          .limit(300),
        supabase.from("profiles").select("id, full_name, user_name, email"),
      ]);

      if (walletsRes.error) throw walletsRes.error;
      if (txRes.error) throw txRes.error;
      if (profilesRes.error) console.error("profiles:", profilesRes.error);

      const profileMap = new Map(
        (profilesRes.data || []).map((p) => [p.id, p])
      );

      const mappedWallets: WalletRow[] = (walletsRes.data || []).map((w) => {
        const p = profileMap.get(w.user_id);
        return {
          ...w,
          available_balance: Number(w.available_balance || 0),
          pending_balance: Number(w.pending_balance || 0),
          total_earned: Number(w.total_earned || 0),
          total_withdrawn: Number(w.total_withdrawn || 0),
          full_name: p?.full_name ?? null,
          user_name: p?.user_name ?? null,
          email: p?.email ?? null,
        };
      });

      const mappedTx: TransactionRow[] = (txRes.data || []).map((t) => {
        const p = profileMap.get(t.user_id);
        return {
          ...t,
          amount: Number(t.amount || 0),
          full_name: p?.full_name ?? null,
          user_name: p?.user_name ?? null,
        };
      });

      setWallets(mappedWallets);
      setTransactions(mappedTx);

      setStats({
        totalAvailable: mappedWallets.reduce(
          (s, w) => s + w.available_balance,
          0
        ),
        totalPending: mappedWallets.reduce((s, w) => s + w.pending_balance, 0),
        totalEarned: mappedWallets.reduce((s, w) => s + w.total_earned, 0),
        totalWithdrawn: mappedWallets.reduce(
          (s, w) => s + w.total_withdrawn,
          0
        ),
        walletCount: mappedWallets.length,
        txCount: mappedTx.length,
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unable to load wallet data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [tab, search, directionFilter, typeFilter]);

  const transactionTypes = useMemo(() => {
    const set = new Set(
      transactions.map((t) => t.transaction_type).filter(Boolean)
    );
    return Array.from(set).sort();
  }, [transactions]);

  const filteredWallets = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return wallets;
    return wallets.filter(
      (w) =>
        w.full_name?.toLowerCase().includes(q) ||
        w.user_name?.toLowerCase().includes(q) ||
        w.email?.toLowerCase().includes(q) ||
        w.user_id.toLowerCase().includes(q)
    );
  }, [wallets, search]);

  const filteredTx = useMemo(() => {
    const q = search.toLowerCase().trim();
    return transactions.filter((t) => {
      const matchesDirection =
        directionFilter === "all" || t.direction === directionFilter;
      const matchesType =
        typeFilter === "all" || t.transaction_type === typeFilter;
      const matchesSearch =
        !q ||
        t.full_name?.toLowerCase().includes(q) ||
        t.user_name?.toLowerCase().includes(q) ||
        t.transaction_type?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.reference?.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.user_id.toLowerCase().includes(q);
      return matchesDirection && matchesType && matchesSearch;
    });
  }, [transactions, search, directionFilter, typeFilter]);

  const activeList = tab === "wallets" ? filteredWallets : filteredTx;
  const totalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE));
  const pageSlice = activeList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const displayName = (full?: string | null, user?: string | null) =>
    full || user || "Unknown user";

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#0b3939]" />
          <p className="text-sm font-medium text-slate-500">
            Loading wallet data...
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
          <p className="text-sm font-semibold text-[#0b3939]">Finance</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Wallets
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Monitor user balances and platform transactions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
          <button type="button" onClick={() => setError("")}>
            <X className="h-4 w-4 text-red-700" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {[
          {
            label: "Available balances",
            value: formatNaira(stats.totalAvailable),
            icon: Wallet,
            style: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Pending balances",
            value: formatNaira(stats.totalPending),
            icon: Clock3,
            style: "bg-amber-50 text-amber-600",
          },
          {
            label: "Total earned",
            value: formatNaira(stats.totalEarned),
            icon: ArrowDownLeft,
            style: "bg-blue-50 text-blue-600",
          },
          {
            label: "Total withdrawn",
            value: formatNaira(stats.totalWithdrawn),
            icon: ArrowUpRight,
            style: "bg-indigo-50 text-indigo-600",
          },
          {
            label: "Wallets",
            value: stats.walletCount.toLocaleString(),
            icon: Wallet,
            style: "bg-slate-100 text-slate-600",
          },
          {
            label: "Transactions loaded",
            value: stats.txCount.toLocaleString(),
            icon: ArrowUpRight,
            style: "bg-slate-100 text-slate-600",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-2 text-xl font-bold text-slate-900">
                    {card.value}
                  </p>
                </div>
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.style}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main panel */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 lg:px-6">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["wallets", "User wallets"],
                ["transactions", "Transactions"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  tab === key
                    ? "bg-[#0b3939] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  tab === "wallets"
                    ? "Search by name, username, email, user ID…"
                    : "Search by user, type, reference, description…"
                }
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#0b3939] focus:ring-2 focus:ring-[#0b3939]/10"
              />
            </div>

            {tab === "transactions" && (
              <>
                <select
                  value={directionFilter}
                  onChange={(e) => setDirectionFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option value="all">All directions</option>
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option value="all">All types</option>
                  {transactionTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {/* Wallets table */}
        {tab === "wallets" && (
          <div className="overflow-x-auto">
            {pageSlice.length === 0 ? (
              <EmptyState text="No wallets found" />
            ) : (
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <Th>User</Th>
                    <Th>Available</Th>
                    <Th>Pending</Th>
                    <Th>Total earned</Th>
                    <Th>Total withdrawn</Th>
                    <Th>Updated</Th>
                  </tr>
                </thead>
                <tbody>
                  {(pageSlice as WalletRow[]).map((w) => {
                    const name = displayName(w.full_name, w.user_name);
                    return (
                      <tr
                        key={w.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0b3939]/10 text-xs font-bold text-[#0b3939]">
                              {getInitials(name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-800">
                                {name}
                              </p>
                              <p className="truncate text-xs text-slate-400">
                                {w.user_name
                                  ? `@${w.user_name}`
                                  : w.email || w.user_id.slice(0, 8) + "…"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-700">
                          {formatNaira(w.available_balance)}
                        </td>
                        <td className="px-6 py-4 font-semibold text-amber-700">
                          {formatNaira(w.pending_balance)}
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          {formatNaira(w.total_earned)}
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          {formatNaira(w.total_withdrawn)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {formatDate(w.updated_at || w.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Transactions table */}
        {tab === "transactions" && (
          <div className="overflow-x-auto">
            {pageSlice.length === 0 ? (
              <EmptyState text="No transactions found" />
            ) : (
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <Th>User</Th>
                    <Th>Type</Th>
                    <Th>Direction</Th>
                    <Th>Amount</Th>
                    <Th>Reference</Th>
                    <Th>Description</Th>
                    <Th>Status</Th>
                    <Th>Date</Th>
                  </tr>
                </thead>
                <tbody>
                  {(pageSlice as TransactionRow[]).map((t) => {
                    const name = displayName(t.full_name, t.user_name);
                    const isCredit = t.direction === "credit";
                    return (
                      <tr
                        key={t.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800">
                            {name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {t.user_name ? `@${t.user_name}` : ""}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm capitalize text-slate-600">
                          {t.transaction_type?.replace(/_/g, " ")}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                              isCredit
                                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                                : "border-red-100 bg-red-50 text-red-700"
                            }`}
                          >
                            {t.direction}
                          </span>
                        </td>
                        <td
                          className={`px-6 py-4 font-bold ${
                            isCredit ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {isCredit ? "+" : "−"}
                          {formatNaira(Math.abs(t.amount))}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                          {t.reference || "—"}
                        </td>
                        <td className="px-6 py-4 max-w-[220px] truncate text-sm text-slate-600">
                          {t.description || "—"}
                        </td>
                        <td className="px-6 py-4">
                          <StatusPill status={t.status || "—"} />
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          <p>{formatDate(t.created_at)}</p>
                          <p className="text-xs">{formatTime(t.created_at)}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeList.length > PAGE_SIZE && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
            <p className="text-sm text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, activeList.length)} of{" "}
              {activeList.length}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${className}`}
    >
      {children}
    </th>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = status?.toLowerCase() || "";
  const style =
    s === "completed" || s === "success" || s === "approved"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : s === "failed" || s === "rejected"
        ? "border-red-100 bg-red-50 text-red-700"
        : "border-amber-100 bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${style}`}
    >
      {status || "—"}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="px-6 py-20 text-center">
      <Wallet className="mx-auto h-12 w-12 text-slate-300" />
      <p className="mt-4 font-semibold text-slate-700">{text}</p>
    </div>
  );
}