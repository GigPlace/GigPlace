"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";

import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  ClipboardList,
  ImageIcon,
  Info,
  Link2,
  Loader2,
  RefreshCw,
  Save,
  Users,
  Wallet,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

const MINIMUM_REWARD = 50;
const MINIMUM_WORKERS = 10;

type CampaignCategory = {
  id: string;
  name: string;
  slug: string | null;
};

type CampaignSubcategory = {
  id: string;
  category_id: string;
  name: string;
  slug: string | null;
};

type CampaignRecord = {
  id: string;
  advertiser_id: string;
  category_id: string;
  subcategory_id: string;
  title: string;
  description: string | null;
  target_url: string | null;
  instructions: string | null;
  cover_image_url: string | null;
  reward_per_worker: number;
  total_workers: number;
  total_budget: number | null;
  proof_required: boolean | null;
  start_date: string | null;
  end_date: string | null;
  status?: string | null;
};

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [categories, setCategories] = useState<CampaignCategory[]>([]);
  const [subcategories, setSubcategories] = useState<
    CampaignSubcategory[]
  >([]);

  const [selectedCategoryId, setSelectedCategoryId] =
    useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] =
    useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [rewardPerWorker, setRewardPerWorker] =
    useState(MINIMUM_REWARD);
  const [totalWorkers, setTotalWorkers] =
    useState(MINIMUM_WORKERS);
  const [proofRequired, setProofRequired] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const totalBudget = useMemo(() => {
    const reward = Number(rewardPerWorker) || 0;
    const workers = Number(totalWorkers) || 0;
    return reward * workers;
  }, [rewardPerWorker, totalWorkers]);

  const formatNaira = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount);

  const toDatetimeLocal = (value: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  /* =========================================
     LOAD CAMPAIGN + CATEGORIES
  ========================================= */

  useEffect(() => {
    if (!campaignId) return;
    loadPage();
  }, [campaignId]);

  const loadPage = async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      // Load categories
      const { data: categoriesData, error: categoriesError } =
        await supabase
          .from("campaign_categories")
          .select("id, name, slug")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

      if (categoriesError) throw categoriesError;

      // Load subcategories
      const {
        data: subcategoriesData,
        error: subcategoriesError,
      } = await supabase
        .from("campaign_subcategories")
        .select("id, category_id, name, slug")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (subcategoriesError) throw subcategoriesError;

      setCategories(categoriesData || []);
      setSubcategories(subcategoriesData || []);

      // Load the campaign
      const { data: campaign, error: campaignError } =
        await supabase
          .from("campaigns")
          .select(
            `
            id,
            advertiser_id,
            category_id,
            subcategory_id,
            title,
            description,
            target_url,
            instructions,
            cover_image_url,
            reward_per_worker,
            total_workers,
            total_budget,
            proof_required,
            start_date,
            end_date,
            status
          `
          )
          .eq("id", campaignId)
          .single();

      if (campaignError) throw campaignError;

      const record = campaign as CampaignRecord;

      // Only the owner can edit
      if (record.advertiser_id !== user.id) {
        setError("You do not have permission to edit this campaign.");
        return;
      }

      // Prefill form
      setSelectedCategoryId(record.category_id);
      setSelectedSubcategoryId(record.subcategory_id);
      setTitle(record.title || "");
      setDescription(record.description || "");
      setTargetUrl(record.target_url || "");
      setInstructions(record.instructions || "");
      setCoverImageUrl(record.cover_image_url || "");
      setRewardPerWorker(
        Number(record.reward_per_worker) || MINIMUM_REWARD
      );
      setTotalWorkers(
        Number(record.total_workers) || MINIMUM_WORKERS
      );
      setProofRequired(record.proof_required ?? true);
      setStartDate(toDatetimeLocal(record.start_date));
      setEndDate(toDatetimeLocal(record.end_date));
    } catch (err: unknown) {
      console.error("Edit campaign load error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load this campaign."
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredSubcategories = useMemo(
    () =>
      subcategories.filter(
        (s) => s.category_id === selectedCategoryId
      ),
    [subcategories, selectedCategoryId]
  );

  const selectedCategory = categories.find(
    (c) => c.id === selectedCategoryId
  );
  const selectedSubcategory = subcategories.find(
    (s) => s.id === selectedSubcategoryId
  );

  /* =========================================
     SAVE
  ========================================= */

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!selectedCategoryId || !selectedSubcategoryId) {
      setFormError("Please select a category and subcategory.");
      return;
    }

    if (title.trim().length < 5) {
      setFormError(
        "Campaign title must contain at least 5 characters."
      );
      return;
    }

    if (description.trim().length < 20) {
      setFormError(
        "Please provide a campaign description of at least 20 characters."
      );
      return;
    }

    if (!targetUrl.trim()) {
      setFormError("Please enter the campaign target URL.");
      return;
    }

    if (instructions.trim().length < 20) {
      setFormError(
        "Please provide clear instructions for workers."
      );
      return;
    }

    if (Number(rewardPerWorker) < MINIMUM_REWARD) {
      setFormError(
        `The minimum reward per worker is ${formatNaira(
          MINIMUM_REWARD
        )}.`
      );
      return;
    }

    if (Number(totalWorkers) < MINIMUM_WORKERS) {
      setFormError(
        `The minimum number of workers is ${MINIMUM_WORKERS}.`
      );
      return;
    }

    if (
      startDate &&
      endDate &&
      new Date(endDate) < new Date(startDate)
    ) {
      setFormError(
        "The end date cannot be earlier than the start date."
      );
      return;
    }

    try {
      setSaving(true);

      const { error: updateError } = await supabase
        .from("campaigns")
        .update({
          category_id: selectedCategoryId,
          subcategory_id: selectedSubcategoryId,
          title: title.trim(),
          description: description.trim(),
          target_url: targetUrl.trim(),
          instructions: instructions.trim(),
          cover_image_url: coverImageUrl.trim() || null,
          reward_per_worker: Number(rewardPerWorker),
          total_workers: Number(totalWorkers),
          total_budget: totalBudget,
          proof_required: proofRequired,
          start_date: startDate
            ? new Date(startDate).toISOString()
            : null,
          end_date: endDate
            ? new Date(endDate).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      if (updateError) throw updateError;

      setSuccessMessage("Campaign updated successfully.");

      // Optional: go back to campaign view after a short delay
      setTimeout(() => {
        router.push(
          `/advertiser/dashboard/campaigns/${campaignId}`
        );
      }, 800);
    } catch (err: unknown) {
      console.error("Update campaign error:", err);
      setFormError(
        err instanceof Error
          ? err.message
          : "Unable to update campaign. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={28}
            className="animate-spin text-[#0B3939]"
          />
          <p className="text-sm text-slate-500">
            Loading campaign…
          </p>
        </div>
      </div>
    );
  }

  /* =========================================
     ERROR
  ========================================= */

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle
            size={42}
            className="mx-auto text-red-500"
          />
          <h1 className="mt-4 text-2xl font-bold text-red-950">
            Unable to edit campaign
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-red-700">
            {error}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={loadPage}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B3939] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#082d2d]"
            >
              <RefreshCw size={17} />
              Try Again
            </button>
            <button
              type="button"
              onClick={() =>
                router.push("/advertiser/dashboard/campaigns")
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft size={17} />
              Back to Campaigns
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================
     MAIN
  ========================================= */

  return (
    <div className="mx-auto max-w-7xl">
      <button
        type="button"
        onClick={() =>
          router.push(
            `/advertiser/dashboard/campaigns/${campaignId}`
          )
        }
        className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0B3939]"
      >
        <ArrowLeft size={18} />
        Back to Campaign
      </button>

      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B3939] text-sm font-bold text-white">
            ✎
          </span>
          <div>
            <p className="text-sm font-semibold text-[#0B3939]">
              Edit Campaign
            </p>
            <h1 className="text-3xl font-bold text-slate-900">
              Update campaign details
            </h1>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
          Change the category, task type, budget, or instructions
          for this campaign.
        </p>
      </div>

      {/* Current type summary */}
      {(selectedCategory || selectedSubcategory) && (
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[#0B3939]/15 bg-[#0B3939]/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Category
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B3939] text-white">
                <Check size={19} />
              </div>
              <h2 className="font-bold text-[#0B3939]">
                {selectedCategory?.name || "—"}
              </h2>
            </div>
          </div>

          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">
              Selected Task
            </p>
            <h2 className="mt-3 text-lg font-bold text-orange-900">
              {selectedSubcategory?.name || "—"}
            </h2>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div className="space-y-7">
          {/* Category / Subcategory */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B3939]/10 text-[#0B3939]">
                <ClipboardList size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Campaign Type
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  You can change the category and subcategory.
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Category
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    setSelectedSubcategoryId("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-[#0B3939] focus:bg-white focus:ring-4 focus:ring-[#0B3939]/10"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Subcategory
                </label>
                <select
                  value={selectedSubcategoryId}
                  onChange={(e) =>
                    setSelectedSubcategoryId(e.target.value)
                  }
                  disabled={!selectedCategoryId}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-[#0B3939] focus:bg-white focus:ring-4 focus:ring-[#0B3939]/10 disabled:opacity-50"
                >
                  <option value="">Select subcategory</option>
                  {filteredSubcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Basic information */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B3939]/10 text-[#0B3939]">
                <ClipboardList size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Basic Information
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Update the title and description.
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Campaign Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-[#0B3939] focus:bg-white focus:ring-4 focus:ring-[#0B3939]/10"
                />
                <p className="mt-2 text-xs text-slate-400">
                  {title.length}/100 characters
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Campaign Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  rows={5}
                  maxLength={1000}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm leading-6 text-slate-900 outline-none transition focus:border-[#0B3939] focus:bg-white focus:ring-4 focus:ring-[#0B3939]/10"
                />
                <p className="mt-2 text-xs text-slate-400">
                  {description.length}/1000 characters
                </p>
              </div>
            </div>
          </section>

          {/* Task information */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B3939]/10 text-[#0B3939]">
                <Link2 size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Task Information
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Update the link and worker instructions.
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Target URL
                </label>
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-[#0B3939] focus:bg-white focus:ring-4 focus:ring-[#0B3939]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Worker Instructions
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) =>
                    setInstructions(e.target.value)
                  }
                  rows={6}
                  maxLength={2000}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm leading-6 text-slate-900 outline-none transition focus:border-[#0B3939] focus:bg-white focus:ring-4 focus:ring-[#0B3939]/10"
                />
                <p className="mt-2 text-xs text-slate-400">
                  {instructions.length}/2000 characters
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Cover Image URL
                  <span className="ml-1 font-normal text-slate-400">
                    (Optional)
                  </span>
                </label>
                <div className="relative">
                  <ImageIcon
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="url"
                    value={coverImageUrl}
                    onChange={(e) =>
                      setCoverImageUrl(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#0B3939] focus:bg-white focus:ring-4 focus:ring-[#0B3939]/10"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-[#0B3939]/30">
                <input
                  type="checkbox"
                  checked={proofRequired}
                  onChange={(e) =>
                    setProofRequired(e.target.checked)
                  }
                  className="mt-1 h-5 w-5 accent-[#0B3939]"
                />
                <div>
                  <p className="font-semibold text-slate-800">
                    Require proof of completion
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Workers will submit a screenshot, link, or
                    note after completing the task.
                  </p>
                </div>
              </label>
            </div>
          </section>

          {/* Schedule */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B3939]/10 text-[#0B3939]">
                <CalendarDays size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Campaign Schedule
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Update campaign dates if needed.
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Start Date
                  <span className="ml-1 font-normal text-slate-400">
                    (Optional)
                  </span>
                </label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-700 outline-none transition focus:border-[#0B3939] focus:bg-white focus:ring-4 focus:ring-[#0B3939]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  End Date
                  <span className="ml-1 font-normal text-slate-400">
                    (Optional)
                  </span>
                </label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-700 outline-none transition focus:border-[#0B3939] focus:bg-white focus:ring-4 focus:ring-[#0B3939]/10"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="h-fit xl:sticky xl:top-7">
          <div className="overflow-hidden rounded-3xl border border-[#0B3939]/15 bg-white shadow-sm">
            <div className="bg-[#0B3939] p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <Wallet size={21} />
                </div>
                <div>
                  <h2 className="font-bold">Campaign Budget</h2>
                  <p className="text-xs text-white/70">
                    Calculated automatically
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Reward per Worker
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#0B3939]">
                    ₦
                  </span>
                  <input
                    type="number"
                    min={MINIMUM_REWARD}
                    step="1"
                    value={rewardPerWorker}
                    onChange={(e) =>
                      setRewardPerWorker(
                        Math.max(
                          MINIMUM_REWARD,
                          Number(e.target.value) || 0
                        )
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-9 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#0B3939] focus:bg-white focus:ring-4 focus:ring-[#0B3939]/10"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Minimum: ₦50 per worker
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Number of Workers
                </label>
                <div className="relative">
                  <Users
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="number"
                    min={MINIMUM_WORKERS}
                    step="1"
                    value={totalWorkers}
                    onChange={(e) =>
                      setTotalWorkers(
                        Math.max(
                          MINIMUM_WORKERS,
                          Number(e.target.value) || 0
                        )
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#0B3939] focus:bg-white focus:ring-4 focus:ring-[#0B3939]/10"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Minimum: 10 workers
                </p>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Reward</span>
                  <span>
                    {formatNaira(Number(rewardPerWorker) || 0)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                  <span>Workers</span>
                  <span>× {Number(totalWorkers) || 0}</span>
                </div>
                <div className="mt-5 rounded-2xl bg-[#0B3939]/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total Budget
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[#0B3939]">
                    {formatNaira(totalBudget)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <Info
                  size={18}
                  className="mt-0.5 shrink-0 text-blue-600"
                />
                <p className="text-xs leading-5 text-blue-800">
                  Saving will update this campaign in the
                  database using the real category and
                  subcategory IDs.
                </p>
              </div>

              {formError && (
                <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-red-600"
                  />
                  <p className="text-sm leading-5 text-red-700">
                    {formError}
                  </p>
                </div>
              )}

              {successMessage && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F47B20] px-5 py-4 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}