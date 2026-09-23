"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardList,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const MINIMUM_REWARD = 50;
const MINIMUM_WORKERS = 10;
const PLATFORM_FEE_RATE = 0.05; // 5%

const STORAGE_SELECTION = "campaignSelection";
const STORAGE_DRAFT = "gigplace_campaign_draft";

type CampaignSelection = {
  advertiserId: string;
  category: {
    id: string;
    name: string;
    slug: string | null;
  };
  subcategory: {
    id: string;
    name: string;
    slug: string | null;
  };
};

type CampaignDraft = {
  advertiserId?: string;
  categoryId: string;
  categoryName: string;
  categorySlug?: string | null;
  subcategoryId: string;
  subcategoryName: string;
  subcategorySlug?: string | null;
  title: string;
  description: string;
  targetUrl: string;
  targetImageUrl: string;
  instructions: string;
  coverImageUrl: string;
  rewardPerWorker: number;
  totalWorkers: number;
  totalBudget: number;
  proofRequired: boolean;
  startDate: string | null;
  endDate: string | null;
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export default function CampaignDetailsPage() {
  const router = useRouter();

  const [selection, setSelection] = useState<CampaignSelection | null>(null);
  const [loadingSelection, setLoadingSelection] = useState(true);
  const [draftRestored, setDraftRestored] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [targetImageUrl, setTargetImageUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  const [rewardInput, setRewardInput] = useState("");
  const [workersInput, setWorkersInput] = useState("");

  const [proofRequired, setProofRequired] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [formError, setFormError] = useState("");
  const [saveHint, setSaveHint] = useState("");

  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState(false);

  const rewardPerWorker = Number(rewardInput) || 0;
  const totalWorkers = Number(workersInput) || 0;

  const subtotal = useMemo(
    () => rewardPerWorker * totalWorkers,
    [rewardPerWorker, totalWorkers]
  );
  const platformFee = useMemo(
    () => subtotal * PLATFORM_FEE_RATE,
    [subtotal]
  );
  const totalBudget = useMemo(
    () => subtotal + platformFee,
    [subtotal, platformFee]
  );

  const budgetIsReady =
    rewardPerWorker >= MINIMUM_REWARD && totalWorkers >= MINIMUM_WORKERS;

  const hasInsufficientFunds =
    walletBalance !== null &&
    budgetIsReady &&
    Number(walletBalance) < totalBudget;

  const formatNaira = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount);

  /* =========================================
     LOAD SELECTION + DRAFT + WALLET
  ========================================= */

  useEffect(() => {
    let parsed = readJson<CampaignSelection>(STORAGE_SELECTION);

    if (!parsed) {
      try {
        const sessionRaw = sessionStorage.getItem(STORAGE_SELECTION);
        if (sessionRaw) {
          parsed = JSON.parse(sessionRaw) as CampaignSelection;
          writeJson(STORAGE_SELECTION, parsed);
          sessionStorage.removeItem(STORAGE_SELECTION);
        }
      } catch {
        // ignore
      }
    }

    if (
      !parsed?.advertiserId ||
      !parsed?.category?.id ||
      !parsed?.subcategory?.id
    ) {
      setLoadingSelection(false);
      return;
    }

    setSelection(parsed);

    (async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("Auth error while loading wallet:", authError);
        setWalletBalance(0);
        return;
      }

      if (parsed!.advertiserId !== user.id) {
        const synced: CampaignSelection = {
          ...parsed!,
          advertiserId: user.id,
        };
        writeJson(STORAGE_SELECTION, synced);
        setSelection(synced);
        parsed = synced;
      }

      const { data, error } = await supabase
        .from("wallets")
        .select("available_balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Wallet fetch error:", error);
        setWalletBalance(0);
        return;
      }

      if (!data) {
        console.warn("No wallet row for user:", user.id);
        setWalletBalance(0);
        return;
      }

      setWalletBalance(Number(data.available_balance ?? 0));
    })();

    const draft = readJson<CampaignDraft>(STORAGE_DRAFT);

    if (!draft) {
      try {
        const sessionDraft = sessionStorage.getItem(STORAGE_DRAFT);
        if (sessionDraft) {
          const migrated = JSON.parse(sessionDraft) as CampaignDraft;
          writeJson(STORAGE_DRAFT, migrated);
          sessionStorage.removeItem(STORAGE_DRAFT);
          applyDraft(migrated, parsed);
          setDraftRestored(true);
          setLoadingSelection(false);
          return;
        }
      } catch {
        // ignore
      }
    }

    if (draft) {
      applyDraft(draft, parsed);
      setDraftRestored(true);
    }

    setLoadingSelection(false);
  }, []);

  function applyDraft(
    draft: CampaignDraft,
    currentSelection: CampaignSelection
  ) {
    const sameType =
      draft.categoryId === currentSelection.category.id &&
      draft.subcategoryId === currentSelection.subcategory.id;

    if (!sameType && draft.categoryId && draft.subcategoryId) return;

    if (draft.title) setTitle(draft.title);
    if (draft.description) setDescription(draft.description);
    if (draft.targetUrl) setTargetUrl(draft.targetUrl);
    if (draft.targetImageUrl) setTargetImageUrl(draft.targetImageUrl);
    if (draft.instructions) setInstructions(draft.instructions);
    if (draft.coverImageUrl) setCoverImageUrl(draft.coverImageUrl);
    if (draft.rewardPerWorker)
      setRewardInput(String(draft.rewardPerWorker));
    if (draft.totalWorkers) setWorkersInput(String(draft.totalWorkers));
    if (typeof draft.proofRequired === "boolean") {
      setProofRequired(draft.proofRequired);
    }
    if (draft.startDate) setStartDate(draft.startDate);
    if (draft.endDate) setEndDate(draft.endDate);
  }

  /* =========================================
     AUTO-SAVE
  ========================================= */

  useEffect(() => {
    if (!selection || loadingSelection) return;

    const campaignData: CampaignDraft = {
      advertiserId: selection.advertiserId,
      categoryId: selection.category.id,
      categoryName: selection.category.name,
      categorySlug: selection.category.slug,
      subcategoryId: selection.subcategory.id,
      subcategoryName: selection.subcategory.name,
      subcategorySlug: selection.subcategory.slug,
      title,
      description,
      targetUrl,
      targetImageUrl,
      instructions,
      coverImageUrl,
      rewardPerWorker: rewardPerWorker || MINIMUM_REWARD,
      totalWorkers: totalWorkers || MINIMUM_WORKERS,
      totalBudget,
      proofRequired,
      startDate: startDate || null,
      endDate: endDate || null,
    };

    writeJson(STORAGE_DRAFT, campaignData);
    setSaveHint("Draft saved automatically");
    const t = setTimeout(() => setSaveHint(""), 1500);
    return () => clearTimeout(t);
  }, [
    selection,
    loadingSelection,
    title,
    description,
    targetUrl,
    targetImageUrl,
    instructions,
    coverImageUrl,
    rewardPerWorker,
    totalWorkers,
    totalBudget,
    proofRequired,
    startDate,
    endDate,
  ]);

  /* =========================================
     IMAGE UPLOAD HELPERS
  ========================================= */

  const uploadImage = async (
    file: File,
    folder: "covers" | "targets"
  ): Promise<string | null> => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setFormError("You must be signed in to upload images.");
      return null;
    }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${folder}/${user.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("campaign-assets")
      .upload(path, file, {
        upsert: true,
        contentType: file.type,
      });

    if (error) {
      console.error("Upload error:", error);
      setFormError(error.message || "Failed to upload image.");
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("campaign-assets").getPublicUrl(path);

    return publicUrl;
  };

  const handleCoverUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    const url = await uploadImage(file, "covers");
    if (url) setCoverImageUrl(url);
    setUploadingCover(false);
  };

  const handleTargetImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTarget(true);
    const url = await uploadImage(file, "targets");
    if (url) setTargetImageUrl(url);
    setUploadingTarget(false);
  };

  /* =========================================
     CLEAR DRAFT
  ========================================= */

  const handleClearDraft = () => {
    const ok = window.confirm(
      "Delete this saved draft? This cannot be undone."
    );
    if (!ok) return;

    localStorage.removeItem(STORAGE_DRAFT);
    sessionStorage.removeItem(STORAGE_DRAFT);

    setTitle("");
    setDescription("");
    setTargetUrl("");
    setTargetImageUrl("");
    setInstructions("");
    setCoverImageUrl("");
    setRewardInput("");
    setWorkersInput("");
    setProofRequired(true);
    setStartDate("");
    setEndDate("");
    setFormError("");
    setSaveHint("Draft deleted");
  };

  /* =========================================
     CONTINUE → REVIEW
  ========================================= */

  const handleContinue = (event: FormEvent) => {
    event.preventDefault();
    setFormError("");

    if (!selection) {
      setFormError("Please select a category and subcategory first.");
      return;
    }

    if (title.trim().length < 2) {
      setFormError("Campaign title must contain at least 2 characters.");
      return;
    }

    if (description.trim().length < 5) {
      setFormError(
        "Please provide a campaign description of at least 5 characters."
      );
      return;
    }

    if (instructions.trim().length < 1) {
      setFormError("Please provide instructions for workers.");
      return;
    }

    if (rewardPerWorker < MINIMUM_REWARD) {
      setFormError(
        `The minimum reward per worker is ${formatNaira(MINIMUM_REWARD)}.`
      );
      return;
    }

    if (totalWorkers < MINIMUM_WORKERS) {
      setFormError(`The minimum number of workers is ${MINIMUM_WORKERS}.`);
      return;
    }

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      setFormError("The end date cannot be earlier than the start date.");
      return;
    }

    if (hasInsufficientFunds) {
      setFormError(
        "Insufficient wallet balance. Please top up your wallet first."
      );
      return;
    }

    const campaignData: CampaignDraft = {
      advertiserId: selection.advertiserId,
      categoryId: selection.category.id,
      categoryName: selection.category.name,
      categorySlug: selection.category.slug,
      subcategoryId: selection.subcategory.id,
      subcategoryName: selection.subcategory.name,
      subcategorySlug: selection.subcategory.slug,
      title: title.trim(),
      description: description.trim(),
      targetUrl: targetUrl.trim(),
      targetImageUrl: targetImageUrl.trim(),
      instructions: instructions.trim(),
      coverImageUrl: coverImageUrl.trim(),
      rewardPerWorker,
      totalWorkers,
      totalBudget,
      proofRequired,
      startDate: startDate || null,
      endDate: endDate || null,
    };

    writeJson(STORAGE_DRAFT, campaignData);
    router.push("/advertiser/dashboard/campaigns/create/review");
  };

  if (loadingSelection) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-[#0B3939]" />
          <p className="text-sm text-slate-500">Loading campaign details…</p>
        </div>
      </div>
    );
  }

  if (!selection) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center sm:rounded-3xl sm:p-8">
          <AlertCircle size={42} className="mx-auto text-red-500" />
          <h1 className="mt-4 text-xl font-bold text-red-950 sm:text-2xl">
            Campaign type not selected
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-red-700">
            Select a category and subcategory before entering your campaign
            details.
          </p>
          <button
            type="button"
            onClick={() =>
              router.push("/advertiser/dashboard/campaigns/create")
            }
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B3939] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#082d2d]"
          >
            <ArrowLeft size={17} />
            Select Category
          </button>
        </div>
      </div>
    );
  }

  const { category, subcategory } = selection;

  const inputClass =
    "w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0B3939] focus:bg-white focus:ring-4 focus:ring-[#0B3939]/10 sm:px-4 sm:py-3.5";

  /* Budget card – mobile top + desktop sidebar */
  const BudgetCard = (
    <div className="overflow-hidden rounded-2xl border border-[#0B3939]/15 bg-white shadow-sm sm:rounded-3xl">
      <div className="bg-[#0B3939] px-4 py-3 text-white sm:px-6 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <Wallet size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold sm:text-base">
              Campaign Budget
            </h2>
            <p className="text-xs text-white/70">Calculated automatically</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-6">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Reward per Worker
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[#0B3939] sm:left-4">
              ₦
            </span>
            <input
              type="number"
              min={0}
              step="1"
              value={rewardInput}
              onChange={(e) => setRewardInput(e.target.value)}
              placeholder="50"
              className={`${inputClass} pl-8 font-semibold sm:pl-9`}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
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
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 sm:left-4"
            />
            <input
              type="number"
              min={0}
              step="1"
              value={workersInput}
              onChange={(e) => setWorkersInput(e.target.value)}
              placeholder="10"
              className={`${inputClass} pl-10 font-semibold sm:pl-11`}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Minimum: 10 workers</p>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <div className="rounded-2xl bg-[#0B3939]/5 p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">
              Total Budget
            </p>
            <p className="mt-1 break-all text-xl font-bold text-[#0B3939] sm:mt-2 sm:text-2xl md:text-3xl">
              {formatNaira(totalBudget)}
            </p>
          </div>
        </div>

        {walletBalance !== null && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">
              Your Wallet Balance
            </p>
            <p className="mt-1 break-all text-base font-bold text-slate-900 sm:text-lg">
              {formatNaira(walletBalance)}
            </p>

            {hasInsufficientFunds && (
              <button
                type="button"
                onClick={() => router.push("/advertiser/dashboard/wallet")}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B3939] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#082d2d]"
              >
                <Wallet size={16} />
                Top up wallet
              </button>
            )}
          </div>
        )}

        {formError && (
          <div className="flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 sm:gap-3 sm:p-4">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-red-600"
            />
            <p className="text-sm leading-5 text-red-700">{formError}</p>
          </div>
        )}

        
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Top bar */}
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() =>
            router.push("/advertiser/dashboard/campaigns/create")
          }
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0B3939]"
        >
          <ArrowLeft size={18} />
          Change Category
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {saveHint && (
            <span className="text-xs font-medium text-emerald-600">
              {saveHint}
            </span>
          )}
          {draftRestored && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:px-3">
              Draft restored
            </span>
          )}
          <button
            type="button"
            onClick={handleClearDraft}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
          >
            <Trash2 size={14} />
            Delete draft
          </button>
        </div>
      </div>

      {/* Step header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-start gap-3 sm:items-center sm:gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0B3939] text-sm font-bold text-white sm:h-10 sm:w-10">
            2
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#0B3939] sm:text-sm">
              Step 2 of 3
            </p>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Campaign Details
            </h1>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:mt-4">
          Your progress is saved automatically. You can refresh, close the
          browser, or log out — the draft stays until you delete it or submit
          the campaign.
        </p>
      </div>

      {/* Category / Task cards */}
      <div className="mb-6 grid gap-3 sm:mb-8 sm:gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[#0B3939]/15 bg-[#0B3939]/5 p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">
            Category
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0B3939] text-white sm:h-10 sm:w-10">
              <Check size={18} />
            </div>
            <h2 className="min-w-0 break-words font-bold text-[#0B3939]">
              {category.name}
            </h2>
          </div>
        </div>

        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-600 sm:text-xs">
            Selected Task
          </p>
          <h2 className="mt-2 break-words text-base font-bold text-orange-900 sm:mt-3 sm:text-lg">
            {subcategory.name}
          </h2>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-8 sm:mb-10">
        <div className="flex items-center justify-between gap-2 text-[10px] font-semibold sm:text-xs">
          <span className="text-[#0B3939]">Category</span>
          <span className="text-[#0B3939]">Details</span>
          <span className="text-slate-400">Review</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 sm:mt-3">
          <div className="h-full w-2/3 rounded-full bg-[#0B3939]" />
        </div>
      </div>

      <form
        onSubmit={handleContinue}
        className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] xl:gap-7"
      >
        {/* Mobile / tablet: budget first */}
        <div className="block xl:hidden">{BudgetCard}</div>

        <div className="min-w-0 space-y-5 sm:space-y-7">
          {/* Basic Information */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 lg:p-8">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0B3939]/10 text-[#0B3939] sm:h-11 sm:w-11">
                <ClipboardList size={20} className="sm:h-[22px] sm:w-[22px]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                  Basic Information
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Describe what the campaign is about.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-5 sm:mt-7 sm:space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Campaign Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Example: Follow our Instagram page"
                  maxLength={100}
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  {title.length}/100 characters (min 2)
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Campaign Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly explain the purpose of this campaign..."
                  rows={4}
                  maxLength={1000}
                  className={`${inputClass} resize-none leading-6 sm:rows-5`}
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  {description.length}/1000 characters (min 5)
                </p>
              </div>
            </div>
          </section>

          {/* Task Information */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 lg:p-8">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0B3939]/10 text-[#0B3939] sm:h-11 sm:w-11">
                <ImageIcon size={20} className="sm:h-[22px] sm:w-[22px]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                  Task Information
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add the link, image and instructions workers will follow.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-5 sm:mt-7 sm:space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Target URL
                  <span className="ml-1 font-normal text-slate-400">
                    (Optional)
                  </span>
                </label>
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Target Image
                  <span className="ml-1 font-normal text-slate-400">
                    (Optional)
                  </span>
                </label>
                <div className="space-y-3">
                  <div className="relative">
                    <ImageIcon
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 sm:left-4"
                    />
                    <input
                      type="url"
                      value={targetImageUrl}
                      onChange={(e) => setTargetImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className={`${inputClass} pl-10 sm:pl-11`}
                    />
                  </div>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-600 transition hover:border-[#0B3939]/40 hover:bg-[#0B3939]/5 sm:px-4">
                    {uploadingTarget ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Upload size={16} />
                    )}
                    {uploadingTarget ? "Uploading…" : "Or upload an image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleTargetImageUpload}
                    />
                  </label>
                  {targetImageUrl && (
                    <img
                      src={targetImageUrl}
                      alt="Target preview"
                      className="mt-1 h-28 w-full rounded-xl object-cover sm:h-32"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Worker Instructions
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Example: Open the link, follow the account, and submit a screenshot as proof."
                  rows={5}
                  maxLength={2000}
                  className={`${inputClass} resize-none leading-6`}
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  {instructions.length}/2000 characters (min 1)
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Cover Image
                  <span className="ml-1 font-normal text-slate-400">
                    (Optional)
                  </span>
                </label>
                <div className="space-y-3">
                  <div className="relative">
                    <ImageIcon
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 sm:left-4"
                    />
                    <input
                      type="url"
                      value={coverImageUrl}
                      onChange={(e) => setCoverImageUrl(e.target.value)}
                      placeholder="https://example.com/cover.jpg"
                      className={`${inputClass} pl-10 sm:pl-11`}
                    />
                  </div>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-600 transition hover:border-[#0B3939]/40 hover:bg-[#0B3939]/5 sm:px-4">
                    {uploadingCover ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Upload size={16} />
                    )}
                    {uploadingCover ? "Uploading…" : "Or upload a cover image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverUpload}
                    />
                  </label>
                  {coverImageUrl && (
                    <img
                      src={coverImageUrl}
                      alt="Cover preview"
                      className="mt-1 h-28 w-full rounded-xl object-cover sm:h-32"
                    />
                  )}
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-[#0B3939]/30 sm:gap-4 sm:p-5">
                <input
                  type="checkbox"
                  checked={proofRequired}
                  onChange={(e) => setProofRequired(e.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-[#0B3939]"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">
                    Require proof of completion
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Workers will submit a screenshot, link, or note after
                    completing the task.
                  </p>
                </div>
              </label>
            </div>
          </section>

          {/* Schedule */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 lg:p-8">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0B3939]/10 text-[#0B3939] sm:h-11 sm:w-11">
                <CalendarDays size={20} className="sm:h-[22px] sm:w-[22px]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                  Campaign Schedule
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Set campaign dates if required.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:mt-7 sm:gap-5 md:grid-cols-2">
              <div className="min-w-0">
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
                  className={`${inputClass} text-slate-700`}
                />
              </div>
              <div className="min-w-0">
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
                  className={`${inputClass} text-slate-700`}
                />
              </div>
            </div>
          </section>
          <button
          type="submit"
          disabled={hasInsufficientFunds}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F47B20] px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5 sm:py-2.5"
        >
          Review Campaign
          <ArrowRight size={18} />
        </button>
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden h-fit xl:sticky xl:top-7 xl:block">
          {BudgetCard}
        </aside>
      </form>
    </div>
  );
}