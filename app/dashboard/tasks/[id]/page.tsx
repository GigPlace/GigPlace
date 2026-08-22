"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  ShieldCheck,
  Upload,
  Wallet,
  X,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Campaign = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
};

type Submission = {
  id: string;
  task_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  proof_url?: string | string[] | null;
  proof_text?: string | null;
};

type Task = {
  id: string;
  campaign_id: string;
  title: string;
  instructions: string;
  task_type: string;
  target_url: string | null;
  proof_required: boolean;
  reward_amount: number;
  max_workers: number;
  completed_workers: number;
  status: string;
  created_at: string;
  campaign?: Campaign | null;
  submission?: Submission | null;
};

type PreviewFile = {
  file: File;
  previewUrl: string;
  id: string;
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

  // Already an array (jsonb column)
  if (Array.isArray(proofUrl)) {
    return proofUrl.filter(Boolean);
  }

  // Stored as JSON string
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

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [proofText, setProofText] = useState("");
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const loadTask = useCallback(async () => {
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

      const { data: taskData, error: taskError } = await supabase
        .from("campaign_tasks")
        .select(
          `
          id,
          campaign_id,
          title,
          instructions,
          task_type,
          target_url,
          proof_required,
          reward_amount,
          max_workers,
          completed_workers,
          status,
          created_at,
          campaigns (
            id,
            title,
            description,
            cover_image_url,
            status,
            starts_at,
            ends_at
          )
        `
        )
        .eq("id", taskId)
        .single();

      if (taskError) throw taskError;

      const { data: submission } = await supabase
        .from("task_submissions")
        .select("id, task_id, status, created_at, proof_url, proof_text")
        .eq("task_id", taskId)
        .eq("worker_id", user.id)
        .maybeSingle();

      const campaign = Array.isArray(taskData.campaigns)
        ? taskData.campaigns[0]
        : taskData.campaigns;

      setTask({
        ...taskData,
        reward_amount: Number(taskData.reward_amount ?? 0),
        max_workers: Number(taskData.max_workers ?? 0),
        completed_workers: Number(taskData.completed_workers ?? 0),
        campaign: campaign ?? null,
        submission: submission ?? null,
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to load task");
    } finally {
      setLoading(false);
    }
  }, [taskId, router]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
  }, [files]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    const newFiles: PreviewFile[] = [];
    let hasError = false;

    Array.from(selected).forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        setSubmitError("Only images and videos are allowed.");
        hasError = true;
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        setSubmitError(`"${file.name}" is larger than 50MB.`);
        hasError = true;
        return;
      }

      newFiles.push({
        file,
        previewUrl: URL.createObjectURL(file),
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });
    });

    if (!hasError) {
      setSubmitError(null);
      setFiles((prev) => [...prev, ...newFiles]);
    }

    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  /* -------------------- Submit Proof -------------------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      if (task?.proof_required && files.length === 0 && !proofText.trim()) {
        setSubmitError(
          "Please upload at least one image/video or write a description."
        );
        setSubmitting(false);
        return;
      }

      const uploadedUrls: string[] = [];

      // Upload all files
      for (const item of files) {
        const fileExt =
          item.file.name.split(".").pop()?.toLowerCase() || "jpg";
        const uniqueName = `${taskId}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${fileExt}`;

        // Path: userId/filename
        const filePath = `${user.id}/${uniqueName}`;

        const { error: uploadError } = await supabase.storage
          .from("proofs")
          .upload(filePath, item.file, {
            cacheControl: "3600",
            upsert: false,
            contentType: item.file.type,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw new Error(uploadError.message);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("proofs")
          .getPublicUrl(filePath);

        if (!urlData?.publicUrl) {
          throw new Error("Failed to generate public URL");
        }

        uploadedUrls.push(urlData.publicUrl);
      }

      // Insert submission
      // Using array directly (works best if column is jsonb)
      // If your column is still text, change to: JSON.stringify(uploadedUrls)
      const { error: insertError } = await supabase
        .from("task_submissions")
        .insert({
          task_id: taskId,
          worker_id: user.id,
          status: "pending",
          proof_text: proofText.trim() || null,
          proof_url: uploadedUrls.length > 0 ? uploadedUrls : null,
          reward_amount: task?.reward_amount ?? 0,
        });

      if (insertError) throw insertError;

      setSubmitSuccess(true);
      setProofText("");
      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      setFiles([]);
      await loadTask();
    } catch (err: any) {
      console.error(err);
      setSubmitError(err?.message ?? "Failed to submit proof");
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------- UI -------------------- */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#0b3939]" />
        <p className="text-sm text-slate-500">Loading task...</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
        <h2 className="text-lg font-semibold text-slate-900">
          Unable to load task
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {error ?? "Task not found"}
        </p>
        <Link
          href="/dashboard/tasks"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-5 py-2.5 text-sm font-medium text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tasks
        </Link>
      </div>
    );
  }

  const remaining = (task.max_workers || 0) - (task.completed_workers || 0);
  const isFull = remaining <= 0;
  const hasStarted =
    !task.campaign?.starts_at ||
    new Date(task.campaign.starts_at) <= new Date();
  const hasEnded =
    !!task.campaign?.ends_at &&
    new Date(task.campaign.ends_at) < new Date();

  const canSubmit =
    hasStarted &&
    !hasEnded &&
    !isFull &&
    !task.submission &&
    task.status === "active";

  const existingProofUrls = parseProofUrls(task.submission?.proof_url);

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      {/* Back */}
      <Link
        href="/dashboard/tasks"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#0b3939]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Find Tasks
      </Link>

      {/* Header Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="relative h-48 bg-gradient-to-br from-[#0b3939] to-[#0f4c4c]">
          {task.campaign?.cover_image_url ? (
            <img
              src={task.campaign.cover_image_url}
              alt={task.campaign.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Megaphone className="h-16 w-16 text-white/30" />
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                {task.campaign?.title ?? "Campaign"}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                {task.title}
              </h1>
            </div>

            <div className="rounded-xl bg-[#0b3939]/5 px-5 py-3 text-right">
              <p className="text-xs text-slate-500">Reward</p>
              <p className="text-2xl font-bold text-[#0b3939]">
                {formatNaira(task.reward_amount)}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
              {task.task_type || "General"}
            </span>

            {task.proof_required && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                <ShieldCheck className="h-3.5 w-3.5" />
                Proof Required
              </span>
            )}

            {!hasStarted && task.campaign?.starts_at && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                Starts {formatDate(task.campaign.starts_at)}
              </span>
            )}

            {hasEnded && (
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                Ended
              </span>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Wallet className="h-4 w-4" />
                <span className="text-xs">Slots</span>
              </div>
              <p className="mt-1 font-semibold text-slate-900">
                {task.completed_workers} / {task.max_workers}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <CalendarClock className="h-4 w-4" />
                <span className="text-xs">Ends</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatDate(task.campaign?.ends_at ?? null)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Clock3 className="h-4 w-4" />
                <span className="text-xs">Status</span>
              </div>
              <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
                {task.submission?.status ?? task.status}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Instructions</h2>
        <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
          {task.instructions || "No instructions provided."}
        </div>

        {task.target_url && (
          <a
            href={task.target_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0b3939]/90"
          >
            Open Target Link
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      {/* Submission Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Your Submission</h2>

        {/* Already submitted */}
        {task.submission ? (
          <div className="mt-6 space-y-4">
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
                task.submission.status === "pending"
                  ? "bg-amber-50 text-amber-700"
                  : task.submission.status === "approved"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {task.submission.status === "pending" && (
                <>
                  <Clock3 className="h-4 w-4" /> Submission Pending
                </>
              )}
              {task.submission.status === "approved" && (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Approved
                </>
              )}
              {task.submission.status === "rejected" && (
                <>
                  <AlertCircle className="h-4 w-4" /> Rejected
                </>
              )}
            </div>

            <p className="text-sm text-slate-500">
              Submitted on {formatDate(task.submission.created_at)}
            </p>

            {task.submission.proof_text && (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                {task.submission.proof_text}
              </div>
            )}

            {/* Multiple proofs */}
            {existingProofUrls.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {existingProofUrls.map((url, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-xl border border-slate-200"
                  >
                    {isVideoUrl(url) ? (
                      <video
                        src={url}
                        controls
                        className="w-full max-h-64 object-contain bg-black"
                      />
                    ) : (
                      <img
                        src={url}
                        alt={`Proof ${index + 1}`}
                        className="w-full max-h-64 object-contain"
                      />
                    )}
                    <div className="border-t border-slate-100 bg-slate-50 px-3 py-2">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-[#0b3939] hover:underline"
                      >
                        Open full size →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : canSubmit ? (
          /* Submit form */
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Text description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Description (optional)
              </label>
              <textarea
                value={proofText}
                onChange={(e) => setProofText(e.target.value)}
                rows={3}
                placeholder="Describe what you did..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#0b3939] focus:outline-none focus:ring-2 focus:ring-[#0b3939]/20"
              />
            </div>

            {/* Multiple File Upload */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Upload Proofs (Images & Videos)
              </label>

              {files.length > 0 && (
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {files.map((item) => (
                    <div
                      key={item.id}
                      className="relative overflow-hidden rounded-xl border border-slate-200"
                    >
                      {item.file.type.startsWith("video/") ? (
                        <video
                          src={item.previewUrl}
                          controls
                          className="w-full max-h-48 object-contain bg-black"
                        />
                      ) : (
                        <img
                          src={item.previewUrl}
                          alt="Preview"
                          className="w-full max-h-48 object-contain"
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => removeFile(item.id)}
                        className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                        {item.file.type.startsWith("video/") ? (
                          <FileVideo className="h-3.5 w-3.5" />
                        ) : (
                          <ImageIcon className="h-3.5 w-3.5" />
                        )}
                        <span className="truncate">{item.file.name}</span>
                        <span className="ml-auto">
                          {(item.file.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 transition hover:border-[#0b3939] hover:bg-[#0b3939]/5">
                <Upload className="mb-3 h-8 w-8 text-slate-400" />
                <p className="text-sm font-medium text-slate-700">
                  {files.length > 0
                    ? "Add more images or videos"
                    : "Click to upload images or videos"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  You can select multiple files • PNG, JPG, WEBP, GIF, MP4, WEBM
                  (max 50MB each)
                </p>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {submitError && (
              <p className="text-sm text-red-600">{submitError}</p>
            )}
            {submitSuccess && (
              <p className="text-sm text-emerald-600">
                Submission sent successfully! Waiting for review.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-6 py-3 text-sm font-medium text-white hover:bg-[#0b3939]/90 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting
                ? `Uploading ${files.length} file${files.length !== 1 ? "s" : ""}...`
                : "Submit Proof"}
            </button>
          </form>
        ) : (
          <div className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
            {!hasStarted && (
              <p>
                This task has not started yet. It will be available on{" "}
                {formatDate(task.campaign?.starts_at ?? null)}.
              </p>
            )}
            {hasEnded && <p>This task has already ended.</p>}
            {isFull && !task.submission && (
              <p>This task is full. No more slots available.</p>
            )}
            {task.status !== "active" && (
              <p>This task is currently not active.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}