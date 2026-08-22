"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  Video,
  XCircle,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Submission = {
  id: string;
  status: "pending" | "approved" | "rejected";
  reward_amount: number;
  proof_url: string[] | string | null;
  proof_note: string | null;
  proof_text: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  task: {
    id: string;
    title: string;
    instructions: string;
    target_url: string | null;
    reward_amount: number;
    campaign: {
      id: string;
      title: string;
      cover_image_url: string | null;
    };
  };
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

const formatDate = (date: string | null) => {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

const isVideoUrl = (url: string) =>
  /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url) || url.includes("video");

const parseProofUrls = (proofUrl: any): string[] => {
  if (!proofUrl) return [];
  if (Array.isArray(proofUrl)) return proofUrl.filter(Boolean);
  if (typeof proofUrl === "string") {
    try {
      const parsed = JSON.parse(proofUrl);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
      return [proofUrl];
    } catch {
      return [proofUrl];
    }
  }
  return [];
};

const statusConfig = {
  pending: {
    label: "Pending Review",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock3,
  },
  approved: {
    label: "Approved",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
  },
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function SubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.id as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubmission = useCallback(async () => {
    setLoading(true);
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

      const { data, error: fetchError } = await supabase
        .from("task_submissions")
        .select(
          `
          id,
          status,
          reward_amount,
          proof_url,
          proof_note,
          proof_text,
          review_note,
          reviewed_at,
          created_at,
          updated_at,
          task:campaign_tasks (
            id,
            title,
            instructions,
            target_url,
            reward_amount,
            campaign:campaigns (
              id,
              title,
              cover_image_url
            )
          )
        `
        )
        .eq("id", submissionId)
        .eq("worker_id", user.id) // security: only owner can view
        .single();

      if (fetchError) throw fetchError;

      setSubmission({
        ...data,
        reward_amount: Number(data.reward_amount ?? 0),
        task: data.task as any,
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to load submission");
    } finally {
      setLoading(false);
    }
  }, [submissionId, router]);

  useEffect(() => {
    loadSubmission();
  }, [loadSubmission]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#0b3939]" />
        <p className="text-sm text-slate-500">Loading submission...</p>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
        <h2 className="text-lg font-semibold text-slate-900">
          Unable to load submission
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {error ?? "Submission not found"}
        </p>
        <Link
          href="/dashboard/submissions"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-5 py-2.5 text-sm font-medium text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Submissions
        </Link>
      </div>
    );
  }

  const config = statusConfig[submission.status];
  const StatusIcon = config.icon;
  const proofUrls = parseProofUrls(submission.proof_url);

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      {/* Back */}
      <Link
        href="/dashboard/submissions"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#0b3939]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Submissions
      </Link>

      {/* Header Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="relative h-44 bg-gradient-to-br from-[#0b3939] to-[#0f4c4c]">
          {submission.task?.campaign?.cover_image_url ? (
            <img
              src={submission.task.campaign.cover_image_url}
              alt={submission.task.campaign.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Megaphone className="h-14 w-14 text-white/30" />
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                {submission.task?.campaign?.title ?? "Campaign"}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                {submission.task?.title ?? "Task"}
              </h1>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium ${config.color}`}
            >
              <StatusIcon className="h-4 w-4" />
              {config.label}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="text-xs text-slate-500">Reward</p>
              <p className="mt-1 text-lg font-bold text-[#0b3939]">
                {formatNaira(submission.reward_amount)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5" />
                Submitted
              </div>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {formatDate(submission.created_at)}
              </p>
            </div>

            {submission.reviewed_at && (
              <div className="rounded-xl border border-slate-100 p-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                  Reviewed
                </div>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {formatDate(submission.reviewed_at)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reviewer Note */}
      {submission.review_note && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Reviewer Note
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {submission.review_note}
          </p>
        </div>
      )}

      {/* Your Proof */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Your Proof</h2>

        {(submission.proof_text || submission.proof_note) && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
            {submission.proof_text || submission.proof_note}
          </div>
        )}

        {proofUrls.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {proofUrls.map((url, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-xl border border-slate-200"
              >
                {isVideoUrl(url) ? (
                  <video
                    src={url}
                    controls
                    className="w-full max-h-72 object-contain bg-black"
                  />
                ) : (
                  <img
                    src={url}
                    alt={`Proof ${index + 1}`}
                    className="w-full max-h-72 object-contain"
                  />
                )}

                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2.5">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    {isVideoUrl(url) ? (
                      <Video className="h-3.5 w-3.5" />
                    ) : (
                      <ImageIcon className="h-3.5 w-3.5" />
                    )}
                    Proof {index + 1}
                  </div>

                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#0b3939] hover:underline"
                  >
                    Open full size
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center">
            <FileText className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              No files were uploaded with this submission.
            </p>
          </div>
        )}
      </div>

      {/* Task Instructions (for reference) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Original Task Instructions
        </h2>
        <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
          {submission.task?.instructions || "No instructions provided."}
        </div>

        {submission.task?.target_url && (
          <a
            href={submission.task.target_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0b3939]/90"
          >
            Open Target Link
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}