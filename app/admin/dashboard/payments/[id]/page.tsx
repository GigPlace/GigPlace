"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Transaction,
  formatNaira,
  formatDateTime,
  statusBadgeClass,
  directionBadgeClass,
  ProfileLite,
  CampaignLite,
  SubmissionLite,
} from "@/lib/payments";

export default function AdminPaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: tx, error: txError } = await supabase
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
        .eq("id", id)
        .single();

      if (txError) throw txError;
      if (!tx) throw new Error("Transaction not found.");

      let user: ProfileLite | undefined;
      let campaign: CampaignLite | undefined;
      let submission: SubmissionLite | undefined;

      const [{ data: profile }, campaignRes, submissionRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, user_name, email")
          .eq("id", tx.user_id)
          .maybeSingle(),
        tx.campaign_id
          ? supabase
              .from("campaigns")
              .select("id, title")
              .eq("id", tx.campaign_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        tx.submission_id
          ? supabase
              .from("task_submissions")
              .select("id, status, reward_amount, worker_id")
              .eq("id", tx.submission_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (profile) user = profile as ProfileLite;
      if (campaignRes.data) campaign = campaignRes.data as CampaignLite;
      if (submissionRes.data) {
        submission = {
          ...submissionRes.data,
          reward_amount: Number(submissionRes.data.reward_amount ?? 0),
        } as SubmissionLite;
      }

      setTransaction({
        ...tx,
        amount: Number(tx.amount ?? 0),
        user,
        campaign,
        submission,
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to load transaction.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0b3939]" />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.push("/admin/dashboard/payments")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0b3939] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to payments
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-800">Error</p>
              <p className="mt-0.5 text-sm text-red-700">
                {error || "Transaction not found."}
              </p>
              <button
                type="button"
                onClick={load}
                className="mt-2 text-xs font-semibold text-red-700 underline"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const userName =
    transaction.user?.full_name ||
    transaction.user?.user_name ||
    transaction.user?.email ||
    "Unknown user";

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Reference", value: transaction.reference || "—" },
    { label: "Transaction ID", value: transaction.id },
    { label: "User", value: userName },
    {
      label: "Amount",
      value: (
        <span className="font-bold text-slate-900">
          {formatNaira(transaction.amount)}
        </span>
      ),
    },
    {
      label: "Type",
      value: (
        <span className="capitalize">{transaction.transaction_type || "—"}</span>
      ),
    },
    {
      label: "Direction",
      value: (
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${directionBadgeClass(
            transaction.direction
          )}`}
        >
          {transaction.direction || "—"}
        </span>
      ),
    },
    {
      label: "Status",
      value: (
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${statusBadgeClass(
            transaction.status
          )}`}
        >
          {transaction.status || "—"}
        </span>
      ),
    },
    {
      label: "Description",
      value: transaction.description || "—",
    },
    {
      label: "Campaign",
      value: transaction.campaign?.title || (transaction.campaign_id ? transaction.campaign_id : "—"),
    },
    {
      label: "Submission",
      value: transaction.submission
        ? `${transaction.submission.status || "—"} · ${formatNaira(
            transaction.submission.reward_amount
          )}`
        : transaction.submission_id || "—",
    },
    {
      label: "Created",
      value: formatDateTime(transaction.created_at),
    },
    {
      label: "Updated",
      value: formatDateTime(transaction.updated_at),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push("/admin/dashboard/payments")}
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0b3939] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to payments
          </button>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Transaction Details
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {transaction.reference || transaction.id}
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="rounded-lg border border-slate-100 bg-slate-50/60 px-3.5 py-2.5"
            >
              <p className="text-xs font-medium text-slate-500">{row.label}</p>
              <div className="mt-1 text-sm text-slate-800">{row.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}