"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock3,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type WithdrawalStatus =
  | "pending"
  | "processing"
  | "paid"
  | "rejected"
  | "cancelled"
  | "failed";

type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  account_name: string;
  bank_name: string;
  account_number: string;
  status: WithdrawalStatus;
  payment_reference: string | null;
  admin_note: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;

  worker?: {
    id: string;
    full_name: string | null;
    user_name: string | null;
    email: string | null;
  };
  processor?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
};

const PAGE_SIZE = 10;

const formatNaira = (amount: number) =>
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));

const getStatusStyle = (status: WithdrawalStatus) => {
  switch (status) {
    case "paid":
      return "border-emerald-100 bg-emerald-50 text-emerald-700";
    case "pending":
    case "processing":
      return "border-amber-100 bg-amber-50 text-amber-700";
    case "rejected":
    case "failed":
    case "cancelled":
      return "border-red-100 bg-red-50 text-red-700";
    default:
      return "border-slate-100 bg-slate-50 text-slate-600";
  }
};

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<Withdrawal | null>(null);
  const [actionMode, setActionMode] = useState<"approve" | "reject" | null>(
    null
  );
  const [adminNote, setAdminNote] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const loadWithdrawals = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [withdrawalsRes, profilesRes, adminsRes] = await Promise.all([
        supabase
          .from("withdrawals")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, full_name, user_name, email"),
        supabase
          .from("admin_profiles")
          .select("id, first_name, last_name, email"),
      ]);

      if (withdrawalsRes.error) throw withdrawalsRes.error;

      const profilesMap = new Map(
        (profilesRes.data || []).map((p) => [p.id, p])
      );
      const adminsMap = new Map(
        (adminsRes.data || []).map((a) => [a.id, a])
      );

      const mapped: Withdrawal[] = (withdrawalsRes.data || []).map((w) => ({
        ...w,
        amount: Number(w.amount || 0),
        status: w.status as WithdrawalStatus,
        worker: profilesMap.get(w.user_id),
        processor: w.processed_by
          ? adminsMap.get(w.processed_by)
          : undefined,
      }));

      setWithdrawals(mapped);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load withdrawals.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWithdrawals();
  }, [loadWithdrawals]);

  // Real-time
  useEffect(() => {
    const channel = supabase
      .channel("admin-withdrawals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "withdrawals" },
        () => loadWithdrawals(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadWithdrawals]);

  const stats = useMemo(() => {
    return {
      total: withdrawals.length,
      pending: withdrawals.filter((w) => w.status === "pending").length,
      paid: withdrawals.filter((w) => w.status === "paid").length,
      rejected: withdrawals.filter(
        (w) => w.status === "rejected" || w.status === "failed"
      ).length,
    };
  }, [withdrawals]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return withdrawals.filter((w) => {
      const workerName =
        w.worker?.full_name || w.worker?.user_name || w.worker?.email || "";
      const matchesSearch =
        !q ||
        w.id.toLowerCase().includes(q) ||
        workerName.toLowerCase().includes(q) ||
        w.account_name.toLowerCase().includes(q) ||
        w.account_number.includes(q) ||
        w.bank_name.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" || w.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [withdrawals, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const openAction = (
    withdrawal: Withdrawal,
    mode: "approve" | "reject"
  ) => {
    setSelectedWithdrawal(withdrawal);
    setActionMode(mode);
    setAdminNote("");
    setPaymentReference("");
    setActiveMenuId(null);
  };

  const closeAction = () => {
    if (actionLoading) return;
    setSelectedWithdrawal(null);
    setActionMode(null);
    setAdminNote("");
    setPaymentReference("");
  };

  const handleAction = async () => {
    if (!selectedWithdrawal || !actionMode) return;

    if (actionMode === "reject" && !adminNote.trim()) {
      setError("Please provide a reason for rejection.");
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      if (actionMode === "approve") {
        // 1. Mark withdrawal as paid
        const { error: updateError } = await supabase
          .from("withdrawals")
          .update({
            status: "paid",
            processed_by: user.id,
            processed_at: new Date().toISOString(),
            payment_reference: paymentReference.trim() || null,
            admin_note: adminNote.trim() || "Paid successfully",
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedWithdrawal.id)
          .eq("status", "pending"); // safety

        if (updateError) throw updateError;

        // 2. Update wallet total_withdrawn
        const { data: wallet } = await supabase
          .from("wallets")
          .select("total_withdrawn")
          .eq("user_id", selectedWithdrawal.user_id)
          .single();

        await supabase
          .from("wallets")
          .update({
            total_withdrawn:
              Number(wallet?.total_withdrawn || 0) + selectedWithdrawal.amount,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", selectedWithdrawal.user_id);

        // 3. Update the related transaction to completed
        await supabase
          .from("transactions")
          .update({
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("reference", `wd_${selectedWithdrawal.id}`);

        setSuccessMessage(
          `Withdrawal of ${formatNaira(
            selectedWithdrawal.amount
          )} marked as paid.`
        );
      } else {
        // REJECT
        // 1. Mark as rejected
        const { error: updateError } = await supabase
          .from("withdrawals")
          .update({
            status: "rejected",
            processed_by: user.id,
            processed_at: new Date().toISOString(),
            admin_note: adminNote.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedWithdrawal.id)
          .eq("status", "pending");

        if (updateError) throw updateError;

        // 2. Refund the amount back to available_balance
        const { data: wallet } = await supabase
          .from("wallets")
          .select("available_balance")
          .eq("user_id", selectedWithdrawal.user_id)
          .single();

        await supabase
          .from("wallets")
          .update({
            available_balance:
              Number(wallet?.available_balance || 0) +
              selectedWithdrawal.amount,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", selectedWithdrawal.user_id);

        // 3. Update transaction status
        await supabase
          .from("transactions")
          .update({
            status: "cancelled",
            description: `Withdrawal rejected: ${adminNote.trim()}`,
            updated_at: new Date().toISOString(),
          })
          .eq("reference", `wd_${selectedWithdrawal.id}`);

        // 4. Create a credit (refund) transaction for clarity
        await supabase.from("transactions").insert({
          user_id: selectedWithdrawal.user_id,
          transaction_type: "withdrawal_refund",
          amount: selectedWithdrawal.amount,
          direction: "credit",
          status: "completed",
          reference: `refund_${selectedWithdrawal.id}`,
          description: `Refund for rejected withdrawal – ${adminNote.trim()}`,
        });

        setSuccessMessage(
          `Withdrawal rejected and ${formatNaira(
            selectedWithdrawal.amount
          )} refunded to user.`
        );
      }

      closeAction();
      await loadWithdrawals(true);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Action failed. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const getWorkerName = (w: Withdrawal) =>
    w.worker?.full_name ||
    w.worker?.user_name ||
    w.worker?.email ||
    "Unknown User";

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#0b3939]" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#0b3939]">
            Finance Management
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Withdrawals
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Review and process user withdrawal requests.
          </p>
        </div>

        <button
          onClick={() => loadWithdrawals(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
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
          <button onClick={() => setSuccessMessage("")}>
            <X className="h-4 w-4 text-emerald-700" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Requests",
            value: stats.total,
            icon: Banknote,
            style: "bg-blue-50 text-blue-600",
          },
          {
            label: "Pending",
            value: stats.pending,
            icon: Clock3,
            style: "bg-amber-50 text-amber-600",
          },
          {
            label: "Paid",
            value: stats.paid,
            icon: CheckCircle2,
            style: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Rejected",
            value: stats.rejected,
            icon: XCircle,
            style: "bg-red-50 text-red-600",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {card.value}
                </p>
              </div>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.style}`}
              >
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, account, bank..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#0b3939]"
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
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
            <option value="processing">Processing</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            No withdrawal requests found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                      Bank Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                      Requested
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((w) => (
                    <tr
                      key={w.id}
                      className="border-b border-slate-100 hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">
                          {getWorkerName(w)}
                        </p>
                        <p className="text-xs text-slate-400">
                          {w.worker?.email}
                        </p>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {formatNaira(w.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800">
                          {w.account_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {w.bank_name} • {w.account_number}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusStyle(
                            w.status
                          )}`}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(w.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {w.status === "pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openAction(w, "approve")}
                              className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openAction(w, "reject")}
                              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {w.processed_at
                              ? formatDate(w.processed_at)
                              : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                <p className="text-sm text-slate-500">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Modal */}
      {selectedWithdrawal && actionMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900">
                {actionMode === "approve"
                  ? "Approve Withdrawal"
                  : "Reject Withdrawal"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {formatNaira(selectedWithdrawal.amount)} →{" "}
                {selectedWithdrawal.account_name}
              </p>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl bg-slate-50 p-4 text-sm">
                <p>
                  <span className="text-slate-500">Bank:</span>{" "}
                  {selectedWithdrawal.bank_name}
                </p>
                <p className="mt-1">
                  <span className="text-slate-500">Account:</span>{" "}
                  {selectedWithdrawal.account_number}
                </p>
              </div>

              {actionMode === "approve" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Payment Reference (optional)
                  </label>
                  <input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. TRX123456789"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#0b3939]"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {actionMode === "approve"
                    ? "Admin Note (optional)"
                    : "Reason for Rejection *"}
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  placeholder={
                    actionMode === "approve"
                      ? "Optional note..."
                      : "Why are you rejecting this request?"
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#0b3939]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={closeAction}
                disabled={actionLoading}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={
                  actionLoading ||
                  (actionMode === "reject" && !adminNote.trim())
                }
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${
                  actionMode === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionLoading && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {actionMode === "approve" ? "Mark as Paid" : "Reject & Refund"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}