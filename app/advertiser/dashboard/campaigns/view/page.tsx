"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Loader2,
  Pencil,
  ShieldCheck,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* =========================================
   TYPES
========================================= */

type Campaign = {
  id: string;
  created_at: string;
  updated_at: string;
  advertiser_id: string;

  title: string;
  description: string | null;

  cover_image_url: string | null;
  target_url: string | null;

  reward_per_task: number;
  total_slots: number;
  completed_slots: number;
  total_budget: number;

  status: string;

  starts_at: string | null;
  ends_at: string | null;

  category_id: string;
  subcategory_id: string;

  instructions: string | null;
  proof_required: boolean;
};

type CampaignCategory = {
  id: string;
  name: string;
};

type CampaignSubcategory = {
  id: string;
  name: string;
};

/* =========================================
   PAGE
========================================= */

export default function ViewCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Reads the ID from:
  // /advertiser/dashboard/campaigns/view?campaignId=YOUR_CAMPAIGN_ID
  const campaignId = searchParams.get("campaignId");

  const [campaign, setCampaign] = useState<Campaign | null>(null);

  const [category, setCategory] =
    useState<CampaignCategory | null>(null);

  const [subcategory, setSubcategory] =
    useState<CampaignSubcategory | null>(null);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  /* =========================================
     LOAD CAMPAIGN
  ========================================= */

  const loadCampaign = useCallback(async () => {
    if (!campaignId) {
      setCampaign(null);
      setErrorMessage(
        "Campaign ID is missing. Please return to your campaigns and select a campaign again."
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      /* Check logged-in advertiser */

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      /* Load campaign */

      const {
        data: campaignData,
        error: campaignError,
      } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .eq("advertiser_id", user.id)
        .single();

      if (campaignError) {
        throw campaignError;
      }

      if (!campaignData) {
        throw new Error("Campaign not found.");
      }

      setCampaign(campaignData as Campaign);

      /* Load category */

      const {
        data: categoryData,
        error: categoryError,
      } = await supabase
        .from("campaign_categories")
        .select("id, name")
        .eq("id", campaignData.category_id)
        .maybeSingle();

      if (categoryError) {
        console.error(
          "Category loading error:",
          categoryError
        );
      }

      if (categoryData) {
        setCategory(
          categoryData as CampaignCategory
        );
      } else {
        setCategory(null);
      }

      /* Load subcategory */

      const {
        data: subcategoryData,
        error: subcategoryError,
      } = await supabase
        .from("campaign_subcategories")
        .select("id, name")
        .eq("id", campaignData.subcategory_id)
        .maybeSingle();

      if (subcategoryError) {
        console.error(
          "Subcategory loading error:",
          subcategoryError
        );
      }

      if (subcategoryData) {
        setSubcategory(
          subcategoryData as CampaignSubcategory
        );
      } else {
        setSubcategory(null);
      }
    } catch (error: unknown) {
      console.error(
        "Campaign loading error:",
        error
      );

      setCampaign(null);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load this campaign."
      );
    } finally {
      setLoading(false);
    }
  }, [campaignId, router]);

  /* =========================================
     LOAD ON PAGE OPEN
  ========================================= */

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  /* =========================================
     HELPERS
  ========================================= */

  const formatNaira = (
    amount: number
  ) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(Number(amount));

  const formatDate = (
    date: string | null
  ) => {
    if (!date) {
      return "Not specified";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Invalid date";
    }

    return new Intl.DateTimeFormat(
      "en-NG",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(parsedDate);
  };

  const getStatusStyle = (
    status: string
  ) => {
    switch (status.toLowerCase()) {
      case "approved":
      case "active":
        return "border-emerald-200 bg-emerald-100 text-emerald-700";

      case "rejected":
        return "border-red-200 bg-red-100 text-red-700";

      case "completed":
        return "border-blue-200 bg-blue-100 text-blue-700";

      default:
        return "border-amber-200 bg-amber-100 text-amber-700";
    }
  };

  const completionPercentage =
    campaign &&
    campaign.total_slots > 0
      ? Math.min(
          100,
          Math.round(
            (campaign.completed_slots /
              campaign.total_slots) *
              100
          )
        )
      : 0;

  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0b3939]/10">
            <Loader2
              size={32}
              className="animate-spin text-[#0b3939]"
            />
          </div>

          <div className="text-center">
            <h2 className="font-bold text-slate-900">
              Loading Campaign
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Please wait while campaign information is loaded.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* =========================================
     ERROR
  ========================================= */

  if (errorMessage || !campaign) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="w-full max-w-xl rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertCircle
              size={32}
              className="text-red-600"
            />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-red-950">
            Unable to Load Campaign
          </h1>

          <p className="mt-3 text-sm leading-6 text-red-700">
            {errorMessage ||
              "This campaign could not be found."}
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={loadCampaign}
              className="rounded-xl bg-[#0b3939] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#062828]"
            >
              Try Again
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/advertiser/dashboard/campaigns"
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#0b3939]"
            >
              Back to Campaigns
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* =========================================
     PAGE
  ========================================= */

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* BACK */}

      <button
        type="button"
        onClick={() =>
          router.push(
            "/advertiser/dashboard/campaigns"
          )
        }
        className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0b3939]"
      >
        <ArrowLeft size={18} />
        Back to Campaigns
      </button>

      {/* HEADER */}

      <section className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full border px-4 py-1.5 text-xs font-bold capitalize ${getStatusStyle(
                campaign.status
              )}`}
            >
              {campaign.status}
            </span>

            <span className="rounded-full bg-[#0b3939]/10 px-4 py-1.5 text-xs font-bold text-[#0b3939]">
              {category?.name ||
                "Campaign Category"}
            </span>

            <span className="rounded-full bg-orange-100 px-4 py-1.5 text-xs font-bold text-orange-700">
              {subcategory?.name ||
                "Campaign Type"}
            </span>
          </div>

          <h1 className="mt-5 text-3xl font-bold text-slate-900">
            {campaign.title}
          </h1>

          <p className="mt-3 max-w-3xl whitespace-pre-line leading-7 text-slate-600">
            {campaign.description ||
              "No campaign description was provided."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/advertiser/dashboard/campaigns/${campaign.id}/edit`
              )
            }
            className="inline-flex items-center gap-2 rounded-xl border border-[#0b3939]/20 bg-white px-5 py-3 text-sm font-semibold text-[#0b3939] transition hover:bg-[#0b3939]/5"
          >
            <Pencil size={18} />
            Edit Campaign
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/advertiser/dashboard"
              )
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#062828]"
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>
        </div>
      </section>

      {/* MAIN GRID */}

      <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
        {/* LEFT */}

        <div className="space-y-8">
          {/* IMAGE */}

          {campaign.cover_image_url && (
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <img
                src={campaign.cover_image_url}
                alt={campaign.title}
                className="h-[340px] w-full object-cover"
              />
            </section>
          )}

          {/* TASK */}

          <section className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="mb-7 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b3939]/10">
                <ClipboardList
                  size={26}
                  className="text-[#0b3939]"
                />
              </div>

              <div>
                <h2 className="text-2xl font-bold">
                  Campaign Task
                </h2>

                <p className="text-sm text-slate-500">
                  Information provided to workers
                </p>
              </div>
            </div>

            {campaign.target_url && (
              <div className="mb-7">
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <Target size={19} />
                  Target URL
                </h3>

                <a
                  href={campaign.target_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 break-all rounded-2xl bg-slate-50 p-5 text-sm font-medium text-[#0b3939] transition hover:bg-[#0b3939]/5"
                >
                  {campaign.target_url}

                  <ExternalLink
                    size={18}
                    className="shrink-0"
                  />
                </a>
              </div>
            )}

            <div>
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <FileText size={19} />
                Instructions
              </h3>

              <div className="min-h-28 whitespace-pre-line rounded-2xl bg-slate-50 p-6 leading-7 text-slate-600">
                {campaign.instructions ||
                  "No additional instructions were provided."}
              </div>
            </div>

            <div className="mt-6 flex gap-4 rounded-2xl border border-slate-200 p-5">
              <CheckCircle2
                size={25}
                className={
                  campaign.proof_required
                    ? "text-emerald-600"
                    : "text-slate-400"
                }
              />

              <div>
                <h3 className="font-bold">
                  {campaign.proof_required
                    ? "Proof Required"
                    : "Proof Not Required"}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {campaign.proof_required
                    ? "Workers must submit proof after completing this task."
                    : "Workers are not required to submit proof."}
                </p>
              </div>
            </div>
          </section>

          {/* SCHEDULE */}

          <section className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="mb-7 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b3939]/10">
                <CalendarDays
                  size={26}
                  className="text-[#0b3939]"
                />
              </div>

              <h2 className="text-2xl font-bold">
                Campaign Schedule
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Starts
                </p>

                <p className="mt-2 font-semibold text-slate-900">
                  {formatDate(
                    campaign.starts_at
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Ends
                </p>

                <p className="mt-2 font-semibold text-slate-900">
                  {formatDate(
                    campaign.ends_at
                  )}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT */}

        <aside className="h-fit space-y-6 xl:sticky xl:top-8">
          {/* BUDGET */}

          <section className="overflow-hidden rounded-3xl border border-[#0b3939]/20 bg-white shadow-sm">
            <div className="bg-[#0b3939] p-7 text-white">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                  <Wallet size={26} />
                </div>

                <div>
                  <h2 className="text-xl font-bold">
                    Campaign Budget
                  </h2>

                  <p className="text-sm text-white/70">
                    Financial summary
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-7">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">
                  Reward per worker
                </span>

                <strong>
                  {formatNaira(
                    campaign.reward_per_task
                  )}
                </strong>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">
                  Total budget
                </span>

                <strong className="text-[#0b3939]">
                  {formatNaira(
                    campaign.total_budget
                  )}
                </strong>
              </div>
            </div>
          </section>

          {/* WORKERS */}

          <section className="rounded-3xl border border-slate-200 bg-white p-7">
            <div className="flex items-center gap-3">
              <Users
                size={25}
                className="text-[#0b3939]"
              />

              <h2 className="text-xl font-bold">
                Worker Progress
              </h2>
            </div>

            <div className="mt-7">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  Completed
                </span>

                <strong>
                  {campaign.completed_slots}/
                  {campaign.total_slots}
                </strong>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#0b3939]"
                  style={{
                    width: `${completionPercentage}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-center text-sm font-semibold text-[#0b3939]">
                {completionPercentage}% completed
              </p>
            </div>
          </section>

          {/* STATUS */}

          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex gap-4">
              <Clock3
                size={25}
                className="shrink-0 text-amber-600"
              />

              <div>
                <h2 className="font-bold text-amber-950">
                  Campaign Status
                </h2>

                <p className="mt-2 text-sm leading-6 text-amber-800">
                  {campaign.status.toLowerCase() ===
                  "pending"
                    ? "Your campaign is waiting for administrator approval."
                    : `This campaign is currently ${campaign.status}.`}
                </p>
              </div>
            </div>
          </section>

          {/* SECURITY */}

          <section className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-5">
            <ShieldCheck
              size={22}
              className="shrink-0 text-[#0b3939]"
            />

            <p className="text-sm leading-6 text-slate-500">
              Only the campaign owner can view and manage this campaign.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}