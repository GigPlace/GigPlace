"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Clock,
  Loader2,
  RefreshCw,
  Wallet as WalletIcon,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Wallet = {
  id: string;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
  updated_at: string;
};

type Transaction = {
  id: string;
  transaction_type: string;
  amount: number;
  direction: "credit" | "debit";
  status: string;
  description: string | null;
  reference: string | null;
  created_at: string;
  campaign_id: string | null;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

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

const getTransactionIcon = (direction: string) => {
  if (direction === "credit") {
    return <ArrowDownLeft className="h-4 w-4 text-emerald-600" />;
  }
  return <ArrowUpRight className="h-4 w-4 text-red-600" />;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "failed":
    case "cancelled":
    case "reversed":
      return "bg-red-50 text-red-700 border-red-100";
    default:
      return "bg-slate-50 text-slate-600 border-slate-100";
  }
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadWalletData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("You must be logged in to view your wallet.");
        return;
      }

      // 1. Try to fetch existing wallet
      let { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (walletError) {
        console.error("Wallet fetch error:", walletError);
        throw walletError;
      }

      // 2. Create wallet if it doesn't exist
      if (!walletData) {
        const { data: newWallet, error: createError } = await supabase
          .from("wallets")
          .insert({
            user_id: user.id,
            available_balance: 0,
            pending_balance: 0,
            total_earned: 0,
            total_withdrawn: 0,
          })
          .select("*")
          .maybeSingle();

        if (createError) {
          console.error("Wallet create error:", createError);
          throw createError;
        }

        // If insert succeeded but we got no row back (RLS), refetch
        if (!newWallet) {
          const { data: refetch, error: refetchError } = await supabase
            .from("wallets")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (refetchError) {
            console.error("Wallet refetch error:", refetchError);
            throw refetchError;
          }

          if (!refetch) {
            throw new Error(
              "Wallet was created but could not be loaded. Please check your RLS policies."
            );
          }

          walletData = refetch;
        } else {
          walletData = newWallet;
        }
      }

      // 3. Get recent transactions
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select(
          "id, transaction_type, amount, direction, status, description, reference, created_at, campaign_id"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (txError) {
        console.error("Transactions fetch error:", txError);
        throw txError;
      }

      setWallet({
        ...walletData,
        available_balance: Number(walletData.available_balance || 0),
        pending_balance: Number(walletData.pending_balance || 0),
        total_earned: Number(walletData.total_earned || 0),
        total_withdrawn: Number(walletData.total_withdrawn || 0),
      });

      setTransactions(
        (txData || []).map((tx) => ({
          ...tx,
          amount: Number(tx.amount || 0),
        }))
      );
    } catch (err: any) {
      console.error("Wallet error:", {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
      });
      setError(err?.message || "Failed to load wallet data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#0b3939]" />
          <p className="text-sm text-slate-500">Loading your wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            My Wallet
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track your earnings, balances and transaction history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadWalletData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>

          <Link
            href="/dashboard/withdraw"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#062b2b]"
          >
            <Banknote className="h-4 w-4" />
            Withdraw
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Balance Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Available Balance - Main */}
        <div className="rounded-2xl border border-[#0b3939]/10 bg-[#0b3939] p-6 text-white shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-white/70">
            <WalletIcon className="h-4 w-4" />
            <span className="text-sm">Available Balance</span>
          </div>
          <p className="mt-3 text-3xl font-bold">
            {formatNaira(wallet?.available_balance || 0)}
          </p>
          <p className="mt-2 text-xs text-white/60">Ready to withdraw</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Pending</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {formatNaira(wallet?.pending_balance || 0)}
          </p>
          <p className="mt-2 text-xs text-slate-400">Awaiting approval</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Total Earned</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {formatNaira(wallet?.total_earned || 0)}
          </p>
          <p className="mt-2 text-xs text-slate-400">Lifetime earnings</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Banknote className="h-4 w-4" />
            <span className="text-sm">Total Withdrawn</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {formatNaira(wallet?.total_withdrawn || 0)}
          </p>
          <p className="mt-2 text-xs text-slate-400">Successfully paid out</p>
        </div>
      </div>

      {/* Transactions */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="font-bold text-slate-900">Transaction History</h2>
            <p className="mt-1 text-sm text-slate-500">
              Recent credits and debits on your wallet
            </p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <WalletIcon className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 font-semibold text-slate-700">
              No transactions yet
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Your earnings and withdrawals will appear here.
            </p>
            <Link
              href="/dashboard/tasks"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#062b2b]"
            >
              Find Tasks to Earn
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/50"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      tx.direction === "credit" ? "bg-emerald-50" : "bg-red-50"
                    }`}
                  >
                    {getTransactionIcon(tx.direction)}
                  </div>

                  <div>
                    <p className="font-medium text-slate-900">
                      {tx.description ||
                        (tx.direction === "credit"
                          ? "Task Reward"
                          : "Withdrawal")}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{formatDate(tx.created_at)}</span>
                      {tx.reference && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{tx.reference}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      tx.direction === "credit"
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {tx.direction === "credit" ? "+" : "-"}
                    {formatNaira(tx.amount)}
                  </p>
                  <span
                    className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(
                      tx.status
                    )}`}
                  >
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}