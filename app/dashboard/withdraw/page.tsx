"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileImage,
  Loader2,
  RefreshCw,
  Wallet,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const FEE_RATE = 0.1; // 10%
const MIN_WITHDRAWAL = 1000;

type WithdrawalStatus =
  | "pending"
  | "processing"
  | "paid"
  | "rejected"
  | "cancelled"
  | "failed";

type Withdrawal = {
  id: string;
  amount: number;
  fee_amount: number | null;
  net_amount: number | null;
  account_name: string;
  bank_name: string;
  account_number: string;
  status: WithdrawalStatus;
  payment_reference: string | null;
  admin_note: string | null;
  receipt_url: string | null;
  created_at: string;
  processed_at: string | null;
};

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

const getFeeBreakdown = (w: {
  amount: number;
  fee_amount?: number | null;
  net_amount?: number | null;
}) => {
  const amount = Number(w.amount || 0);
  const fee =
    w.fee_amount != null && Number(w.fee_amount) > 0
      ? Number(w.fee_amount)
      : Math.round(amount * FEE_RATE);
  const net =
    w.net_amount != null && Number(w.net_amount) > 0
      ? Number(w.net_amount)
      : amount - fee;
  return { amount, fee, net };
};

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

const NIGERIAN_BANKS = [
  "Access Bank",
  "Citibank Nigeria",
  "Ecobank Nigeria",
  "Fidelity Bank",
  "First Bank of Nigeria",
  "First City Monument Bank (FCMB)",
  "Globus Bank",
  "Guaranty Trust Bank (GTB)",
  "Heritage Bank",
  "Jaiz Bank",
  "Keystone Bank",
  "Kuda Bank",
  "Opay",
  "PalmPay",
  "Polaris Bank",
  "Providus Bank",
  "Stanbic IBTC Bank",
  "Standard Chartered Bank",
  "Sterling Bank",
  "SunTrust Bank",
  "Union Bank of Nigeria",
  "United Bank for Africa (UBA)",
  "Unity Bank",
  "Wema Bank",
  "Zenith Bank",
];

export default function WithdrawPage() {
  const router = useRouter();

  const [availableBalance, setAvailableBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [amount, setAmount] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [refreshingHistory, setRefreshingHistory] = useState(false);

  const withdrawAmount = Number(amount) || 0;
  const feeAmount = useMemo(
    () => Math.round(withdrawAmount * FEE_RATE),
    [withdrawAmount]
  );
  const netAmount = useMemo(
    () => Math.max(0, withdrawAmount - feeAmount),
    [withdrawAmount, feeAmount]
  );

  const loadBalance = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: wallet } = await supabase
        .from("wallets")
        .select("available_balance")
        .eq("user_id", user.id)
        .maybeSingle();

      setAvailableBalance(Number(wallet?.available_balance || 0));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadWithdrawals = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshingHistory(true);
    else setHistoryLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from("withdrawals")
        .select(
          "id, amount, fee_amount, net_amount, account_name, bank_name, account_number, status, payment_reference, admin_note, receipt_url, created_at, processed_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const mapped: Withdrawal[] = (data || []).map((w) => {
        const { amount, fee, net } = getFeeBreakdown({
          amount: Number(w.amount || 0),
          fee_amount: w.fee_amount,
          net_amount: w.net_amount,
        });

        return {
          ...w,
          amount,
          fee_amount: fee,
          net_amount: net,
          status: w.status as WithdrawalStatus,
          receipt_url: w.receipt_url ?? null,
        };
      });

      setWithdrawals(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
      setRefreshingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadBalance();
    loadWithdrawals();
  }, [loadBalance, loadWithdrawals]);

  // Real-time balance
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`withdraw-wallet-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "wallets",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newBalance = Number(payload.new?.available_balance || 0);
            setAvailableBalance(newBalance);
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Real-time withdrawals (so receipt appears when admin uploads)
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`worker-withdrawals-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "withdrawals",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadWithdrawals(true);
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadWithdrawals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      if (!withdrawAmount || withdrawAmount <= 0) {
        setError("Please enter a valid amount.");
        setSubmitting(false);
        return;
      }

      if (withdrawAmount < MIN_WITHDRAWAL) {
        setError(`Minimum withdrawal amount is ${formatNaira(MIN_WITHDRAWAL)}.`);
        setSubmitting(false);
        return;
      }

      if (withdrawAmount > availableBalance) {
        setError("Insufficient available balance.");
        setSubmitting(false);
        return;
      }

      if (!accountName.trim() || !bankName || !accountNumber.trim()) {
        setError("Please fill in all bank details.");
        setSubmitting(false);
        return;
      }

      if (!/^\d{10}$/.test(accountNumber.trim())) {
        setError("Account number must be 10 digits.");
        setSubmitting(false);
        return;
      }

      const fee = Math.round(withdrawAmount * FEE_RATE);
      const net = withdrawAmount - fee;

      const { data: withdrawal, error: withdrawalError } = await supabase
        .from("withdrawals")
        .insert({
          user_id: user.id,
          amount: withdrawAmount,
          fee_amount: fee,
          net_amount: net,
          account_name: accountName.trim(),
          bank_name: bankName,
          account_number: accountNumber.trim(),
          status: "pending",
        })
        .select()
        .single();

      if (withdrawalError) {
        if (
          withdrawalError.message?.includes("fee_amount") ||
          withdrawalError.message?.includes("net_amount") ||
          withdrawalError.code === "PGRST204"
        ) {
          const { data: fallbackWithdrawal, error: fallbackError } =
            await supabase
              .from("withdrawals")
              .insert({
                user_id: user.id,
                amount: withdrawAmount,
                account_name: accountName.trim(),
                bank_name: bankName,
                account_number: accountNumber.trim(),
                status: "pending",
              })
              .select()
              .single();

          if (fallbackError) throw fallbackError;

          const { error: walletError } = await supabase
            .from("wallets")
            .update({
              available_balance: availableBalance - withdrawAmount,
            })
            .eq("user_id", user.id)
            .gte("available_balance", withdrawAmount);

          if (walletError) throw walletError;

          const { error: txError } = await supabase.from("transactions").insert({
            user_id: user.id,
            transaction_type: "withdrawal",
            amount: withdrawAmount,
            direction: "debit",
            status: "pending",
            reference: `wd_${fallbackWithdrawal.id}`,
            description: `Withdrawal to ${bankName} - ${accountNumber} (Fee 10%: ${formatNaira(
              fee
            )}, Net: ${formatNaira(net)})`,
          });

          if (txError) throw txError;
        } else {
          throw withdrawalError;
        }
      } else {
        const { error: walletError } = await supabase
          .from("wallets")
          .update({
            available_balance: availableBalance - withdrawAmount,
          })
          .eq("user_id", user.id)
          .gte("available_balance", withdrawAmount);

        if (walletError) throw walletError;

        const { error: txError } = await supabase.from("transactions").insert({
          user_id: user.id,
          transaction_type: "withdrawal",
          amount: withdrawAmount,
          direction: "debit",
          status: "pending",
          reference: `wd_${withdrawal.id}`,
          description: `Withdrawal to ${bankName} - ${accountNumber} (Fee 10%: ${formatNaira(
            fee
          )}, Net: ${formatNaira(net)})`,
        });

        if (txError) throw txError;
      }

      setSuccess(true);
      setAmount("");
      setAccountName("");
      setBankName("");
      setAccountNumber("");

      await loadBalance();
      await loadWithdrawals(true);

      setTimeout(() => {
        router.push("/dashboard/wallet");
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || "Failed to process withdrawal. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0b3939]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-8 px-4 py-8">
      <Link
        href="/dashboard/wallet"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#0b3939]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Wallet
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Withdraw Funds</h1>
        <p className="mt-1 text-sm text-slate-500">
          Request a withdrawal to your bank account. A 10% processing fee
          applies. When paid, you can view the payment receipt below.
        </p>
      </div>

      {/* Available Balance */}
      <div className="rounded-2xl border border-[#0b3939]/10 bg-[#0b3939] p-6 text-white">
        <div className="flex items-center gap-2 text-white/70">
          <Wallet className="h-4 w-4" />
          <span className="text-sm">Available Balance</span>
        </div>
        <p className="mt-2 text-3xl font-bold">
          {formatNaira(availableBalance)}
        </p>
      </div>

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
          <div>
            <p className="font-medium text-emerald-800">
              Withdrawal request submitted!
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              Your request is being processed. You will receive{" "}
              <span className="font-semibold">
                {formatNaira(netAmount || 0)}
              </span>{" "}
              after the 10% fee. Redirecting shortly…
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Amount to withdraw
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              ₦
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min={MIN_WITHDRAWAL}
              step="100"
              className="w-full rounded-xl border border-slate-200 py-3 pl-8 pr-4 text-sm outline-none focus:border-[#0b3939] focus:ring-2 focus:ring-[#0b3939]/10"
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Minimum: {formatNaira(MIN_WITHDRAWAL)} · Platform fee: 10%
          </p>
        </div>

        {withdrawAmount > 0 && (
          <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Withdrawal amount</span>
              <span className="font-medium">
                {formatNaira(withdrawAmount)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Platform fee (10%)</span>
              <span className="font-medium text-red-600">
                −{formatNaira(feeAmount)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
              <span>You will receive</span>
              <span className="text-[#0b3939]">{formatNaira(netAmount)}</span>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Account Name
          </label>
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="John Doe"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0b3939] focus:ring-2 focus:ring-[#0b3939]/10"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Bank Name
          </label>
          <select
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0b3939] focus:ring-2 focus:ring-[#0b3939]/10"
          >
            <option value="">Select bank</option>
            {NIGERIAN_BANKS.map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Account Number
          </label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) =>
              setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            placeholder="0123456789"
            maxLength={10}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0b3939] focus:ring-2 focus:ring-[#0b3939]/10"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || availableBalance < MIN_WITHDRAWAL}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b3939] py-3.5 text-sm font-semibold text-white hover:bg-[#062b2b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Banknote className="h-4 w-4" />
              {withdrawAmount > 0
                ? `Withdraw · Receive ${formatNaira(netAmount)}`
                : "Request Withdrawal"}
            </>
          )}
        </button>
      </form>

      {/* Withdrawal History + Receipts */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Withdrawal History
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              View status and payment receipts uploaded by admin
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadWithdrawals(true)}
            disabled={refreshingHistory}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshingHistory ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {historyLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#0b3939]" />
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No withdrawal requests yet.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {withdrawals.map((w) => {
              const { amount, fee, net } = getFeeBreakdown(w);

              return (
                <li key={w.id} className="px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {formatNaira(amount)}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${getStatusStyle(
                            w.status
                          )}`}
                        >
                          {w.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500">
                        Fee {formatNaira(fee)} · You receive{" "}
                        <span className="font-medium text-[#0b3939]">
                          {formatNaira(net)}
                        </span>
                      </p>

                      <p className="text-xs text-slate-500">
                        {w.account_name} · {w.bank_name} · {w.account_number}
                      </p>

                      <p className="text-xs text-slate-400">
                        Requested {formatDate(w.created_at)}
                        {w.processed_at
                          ? ` · Processed ${formatDate(w.processed_at)}`
                          : ""}
                      </p>

                      {w.payment_reference && (
                        <p className="text-xs text-slate-500">
                          Ref:{" "}
                          <span className="font-medium text-slate-700">
                            {w.payment_reference}
                          </span>
                        </p>
                      )}

                      {w.admin_note && (
                        <p className="text-xs text-slate-500">
                          Note: {w.admin_note}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                      {w.status === "paid" && w.receipt_url ? (
                        <a
                          href={w.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          <FileImage className="h-3.5 w-3.5" />
                          View receipt
                          <ExternalLink className="h-3 w-3 opacity-70" />
                        </a>
                      ) : w.status === "paid" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                          <Clock3 className="h-3.5 w-3.5" />
                          Receipt pending
                        </span>
                      ) : w.status === "rejected" ||
                        w.status === "failed" ||
                        w.status === "cancelled" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-red-600">
                          <XCircle className="h-3.5 w-3.5" />
                          Not paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
                          <Clock3 className="h-3.5 w-3.5" />
                          Awaiting review
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}