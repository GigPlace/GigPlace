"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Loader2,
  Wallet,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const formatNaira = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [amount, setAmount] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

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

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  // Real-time balance on this page too
  useEffect(() => {
    let channel: any;

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

      const withdrawAmount = Number(amount);

      if (!withdrawAmount || withdrawAmount <= 0) {
        setError("Please enter a valid amount.");
        setSubmitting(false);
        return;
      }

      if (withdrawAmount < 1000) {
        setError("Minimum withdrawal amount is ₦1,000.");
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

      // 1. Create withdrawal request
      const { data: withdrawal, error: withdrawalError } = await supabase
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

      if (withdrawalError) throw withdrawalError;

      // 2. Deduct from available balance
      const { error: walletError } = await supabase
        .from("wallets")
        .update({
          available_balance: availableBalance - withdrawAmount,
          // Optional: move to pending_balance if you want
          // pending_balance: pending + withdrawAmount
        })
        .eq("user_id", user.id)
        .gte("available_balance", withdrawAmount); // safety

      if (walletError) throw walletError;

      // 3. Create debit transaction
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: user.id,
        transaction_type: "withdrawal",
        amount: withdrawAmount,
        direction: "debit",
        status: "pending",
        reference: `wd_${withdrawal.id}`,
        description: `Withdrawal to ${bankName} - ${accountNumber}`,
      });

      if (txError) throw txError;

      setSuccess(true);
      setAmount("");
      setAccountName("");
      setBankName("");
      setAccountNumber("");

      // Refresh balance
      await loadBalance();

      // Redirect after short delay
      setTimeout(() => {
        router.push("/dashboard/wallet");
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to process withdrawal. Please try again.");
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
          Request a withdrawal to your bank account.
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
              Your request is being processed. You will be redirected shortly.
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

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Amount */}
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
              min="1000"
              step="100"
              className="w-full rounded-xl border border-slate-200 py-3 pl-8 pr-4 text-sm outline-none focus:border-[#0b3939] focus:ring-2 focus:ring-[#0b3939]/10"
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Minimum withdrawal: ₦1,000
          </p>
        </div>

        {/* Account Name */}
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

        {/* Bank Name */}
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

        {/* Account Number */}
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
          disabled={submitting || availableBalance < 1000}
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
              Request Withdrawal
            </>
          )}
        </button>
      </form>
    </div>
  );
}